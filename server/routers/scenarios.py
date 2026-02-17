from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    from ..services.progress_store import ProgressStore
except ImportError:
    from services.progress_store import ProgressStore


router = APIRouter()
_progress_store = ProgressStore()

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "course_content"
_SCENARIOS_PATH = _DATA_DIR / "scenarios.json"
_MODULES_PATH = _DATA_DIR / "modules.json"
_GLOSSARY_PATH = _DATA_DIR / "glossary.json"
_CAPSTONE_PATH = _DATA_DIR / "capstone.json"

_SCENARIOS_CACHE: Any | None = None
_MODULES_CACHE: Any | None = None
_GLOSSARY_CACHE: dict[str, Any] | None = None
_CAPSTONE_CACHE: dict[str, Any] | None = None
_MODULE_LESSONS_CACHE: dict[int, dict[str, Any]] = {}


class ContentLoadError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _raise_http_for_content(error: ContentLoadError) -> None:
    raise HTTPException(status_code=error.status_code, detail=error.detail) from error


def _load_json(path: Path, label: str) -> Any:
    if not path.exists():
        raise ContentLoadError(status_code=404, detail=f"{label} content file not found: {path.name}")

    try:
        with path.open("r", encoding="utf-8") as handle:
            content = json.load(handle)
    except json.JSONDecodeError as error:
        raise ContentLoadError(status_code=500, detail=f"Invalid JSON in {label} content file") from error
    except OSError as error:
        raise ContentLoadError(status_code=500, detail=f"Unable to read {label} content file") from error

    if not isinstance(content, (dict, list)):
        raise ContentLoadError(status_code=500, detail=f"Unexpected format in {label} content file")

    return content


def _load_scenarios() -> Any:
    global _SCENARIOS_CACHE

    if _SCENARIOS_CACHE is None:
        _SCENARIOS_CACHE = _load_json(_SCENARIOS_PATH, "scenarios")

    return _SCENARIOS_CACHE


def _load_modules() -> dict[str, Any]:
    global _MODULES_CACHE

    if _MODULES_CACHE is None:
        loaded = _load_json(_MODULES_PATH, "modules")
        if not isinstance(loaded, dict):
            raise ContentLoadError(status_code=500, detail="Modules content is not an object")

        modules = loaded.get("modules")
        if not isinstance(modules, list):
            raise ContentLoadError(status_code=500, detail="Modules content must include a modules array")

        _MODULES_CACHE = loaded

    return _MODULES_CACHE


def _load_glossary() -> dict[str, Any]:
    global _GLOSSARY_CACHE

    if _GLOSSARY_CACHE is None:
        glossary = _load_json(_GLOSSARY_PATH, "glossary")
        if not isinstance(glossary, dict):
            raise ContentLoadError(status_code=500, detail="Glossary content is not an object")
        if not isinstance(glossary.get("terms"), list):
            raise ContentLoadError(status_code=500, detail="Glossary content must include a terms array")
        _GLOSSARY_CACHE = glossary

    return _GLOSSARY_CACHE


def _load_capstone() -> dict[str, Any]:
    global _CAPSTONE_CACHE

    if _CAPSTONE_CACHE is None:
        loaded = _load_json(_CAPSTONE_PATH, "capstone")
        if not isinstance(loaded, dict):
            raise ContentLoadError(status_code=500, detail="Capstone content is not an object")
        _CAPSTONE_CACHE = loaded

    return _CAPSTONE_CACHE


def _load_module_lessons(module_number: int) -> dict[str, Any] | None:
    if module_number in _MODULE_LESSONS_CACHE:
        return _MODULE_LESSONS_CACHE[module_number]

    lessons_path = _DATA_DIR / f"module{module_number}_lessons.json"
    if not lessons_path.exists():
        return None

    lessons_data = _load_json(lessons_path, f"module {module_number} lessons")
    if not isinstance(lessons_data, dict):
        raise ContentLoadError(status_code=500, detail=f"Invalid lessons format for module {module_number}")
    if not isinstance(lessons_data.get("lessons"), list):
        raise ContentLoadError(
            status_code=500,
            detail=f"Module {module_number} lessons content must include a lessons array",
        )

    _MODULE_LESSONS_CACHE[module_number] = lessons_data
    return lessons_data


def _find_scenario_by_id(scenarios_data: Any, scenario_id: str) -> dict[str, Any] | None:
    if isinstance(scenarios_data, list):
        for scenario in scenarios_data:
            if isinstance(scenario, dict) and scenario.get("id") == scenario_id:
                return scenario
        return None

    if not isinstance(scenarios_data, dict):
        return None

    direct_lookup = scenarios_data.get(scenario_id)
    if isinstance(direct_lookup, dict):
        return direct_lookup

    scenarios_list = scenarios_data.get("scenarios")
    if isinstance(scenarios_list, dict):
        scenario_from_map = scenarios_list.get(scenario_id)
        if isinstance(scenario_from_map, dict):
            return scenario_from_map
    if isinstance(scenarios_list, list):
        for scenario in scenarios_list:
            if isinstance(scenario, dict) and scenario.get("id") == scenario_id:
                return scenario

    top_level_id = scenarios_data.get("id")
    if isinstance(top_level_id, str) and top_level_id == scenario_id:
        return scenarios_data

    return None


def _find_scenario_step(scenario: dict[str, Any], step_id: str) -> dict[str, Any] | None:
    steps = scenario.get("steps")
    if not isinstance(steps, list):
        return None

    for step in steps:
        if not isinstance(step, dict):
            continue
        if step.get("id") == step_id:
            return step

    return None


def _is_int_like(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _validate_points(value: Any, field_name: str = "points") -> int:
    if _is_int_like(value):
        return int(value)

    raise ValueError(f"{field_name} must be an integer")


def _max_points_for_scenario(scenario: dict[str, Any]) -> int:
    configured_max = scenario.get("maxPoints")
    if _is_int_like(configured_max):
        return int(configured_max)

    steps = scenario.get("steps")
    if not isinstance(steps, list):
        return 0

    max_points = 0
    for step in steps:
        if not isinstance(step, dict):
            continue

        choices = step.get("choices")
        if not isinstance(choices, list) or not choices:
            continue

        best_for_step = None
        for choice in choices:
            if not isinstance(choice, dict):
                continue
            try:
                choice_points = _validate_points(choice.get("points"), "choice points")
            except ValueError:
                continue
            if best_for_step is None or choice_points > best_for_step:
                best_for_step = choice_points

        if best_for_step is not None:
            max_points += best_for_step

    return max_points


def _grade_scenario(total_points: int, max_points: int) -> dict[str, Any]:
    if max_points <= 0:
        return {
            "totalPoints": total_points,
            "maxPoints": max_points,
            "grade": "needs_improvement",
            "message": "Unable to determine grading thresholds for this scenario.",
        }

    score_ratio = total_points / max_points
    if score_ratio >= 0.90:
        grade = "excellent"
        message = "Outstanding! You demonstrated excellent scenario judgment."
    elif score_ratio >= 0.75:
        grade = "good"
        message = "Great choices. You effectively balanced risk and requirements."
    elif score_ratio >= 0.60:
        grade = "satisfactory"
        message = "You made solid progress. Review the scenario carefully to improve further."
    else:
        grade = "needs_improvement"
        message = "Review key AI RMF concepts and try this scenario again."

    return {
        "totalPoints": total_points,
        "maxPoints": max_points,
        "grade": grade,
        "message": message,
    }


class ScenarioChoiceRequest(BaseModel):
    stepId: str
    choiceIndex: int
    accumulatedPoints: int = 0


class ScenarioFinalResult(BaseModel):
    totalPoints: int
    maxPoints: int
    grade: str
    message: str


class ScenarioChoiceResponse(BaseModel):
    feedback: str = ""
    points: int = 0
    nextStepId: str | None = None
    isComplete: bool = False
    finalResult: ScenarioFinalResult | None = None


@router.get("/scenarios/{scenario_id}")
def get_scenario(scenario_id: str) -> dict[str, Any]:
    try:
        scenarios_data = _load_scenarios()
    except ContentLoadError as error:
        _raise_http_for_content(error)

    scenario = _find_scenario_by_id(scenarios_data, scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    return scenario


@router.post("/scenarios/{scenario_id}/choice", response_model=ScenarioChoiceResponse)
def submit_choice(scenario_id: str, payload: ScenarioChoiceRequest) -> ScenarioChoiceResponse:
    try:
        scenarios_data = _load_scenarios()
    except ContentLoadError as error:
        _raise_http_for_content(error)

    scenario = _find_scenario_by_id(scenarios_data, scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    step = _find_scenario_step(scenario, payload.stepId)
    if step is None:
        raise HTTPException(status_code=404, detail="Step not found")

    choices = step.get("choices")
    if not isinstance(choices, list):
        raise HTTPException(status_code=400, detail="No choices available for this step")

    if payload.choiceIndex < 0 or payload.choiceIndex >= len(choices):
        raise HTTPException(status_code=400, detail="Invalid choice index")

    selected_choice = choices[payload.choiceIndex]
    if not isinstance(selected_choice, dict):
        raise HTTPException(status_code=400, detail="Invalid choice data")

    try:
        points = _validate_points(selected_choice.get("points"), "choice points")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    feedback = selected_choice.get("feedback", "")
    next_step = selected_choice.get("nextStep")
    if next_step is None:
        next_step = selected_choice.get("nextStepId")
    if next_step is not None:
        next_step = str(next_step)
        if _find_scenario_step(scenario, next_step) is None:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid scenario configuration: next step '{next_step}' does not exist",
            )

    is_complete = next_step is None
    final_result = None

    if is_complete:
        total_points = payload.accumulatedPoints + points
        max_points = _max_points_for_scenario(scenario)
        final_result = _grade_scenario(total_points=total_points, max_points=max_points)

        _progress_store.record_scenario_result(
            scenario_id=scenario_id,
            score=total_points,
            max_score=max_points,
        )

    return ScenarioChoiceResponse(
        feedback=feedback if isinstance(feedback, str) else "",
        points=points,
        nextStepId=next_step,
        isComplete=is_complete,
        finalResult=ScenarioFinalResult(**final_result) if final_result else None,
    )


@router.get("/glossary")
def get_glossary() -> dict[str, Any]:
    try:
        glossary = _load_glossary()
    except ContentLoadError as error:
        _raise_http_for_content(error)
    return glossary


@router.get("/capstone")
def get_capstone() -> dict[str, Any]:
    try:
        capstone = _load_capstone()
    except ContentLoadError as error:
        _raise_http_for_content(error)
    return capstone


@router.post("/capstone/save")
def save_capstone_progress(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Payload must be an object")
    return _progress_store.save_capstone(payload)


@router.get("/modules")
def get_modules() -> dict[str, Any]:
    try:
        return _load_modules()
    except ContentLoadError as error:
        _raise_http_for_content(error)


@router.get("/modules/{module_id}/lessons")
def get_module_lessons(module_id: str) -> dict[str, Any]:
    match = re.fullmatch(r"module-(\d+)", module_id)
    if match is None:
        raise HTTPException(status_code=404, detail="Invalid module id")

    module_number = int(match.group(1))
    try:
        lessons = _load_module_lessons(module_number)
    except ContentLoadError as error:
        _raise_http_for_content(error)

    if lessons is None:
        raise HTTPException(status_code=404, detail="Module lessons not found")

    return lessons
