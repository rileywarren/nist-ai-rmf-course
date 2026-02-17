from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

try:
    from ..services.grader import QuizGrader
    from ..services.progress_store import ProgressStore
except ImportError:
    from services.grader import QuizGrader
    from services.progress_store import ProgressStore


router = APIRouter()


class QuizSubmitRequest(BaseModel):
    answers: dict[str, Any] = Field(default_factory=dict)
    moduleId: str


class BadgeAward(BaseModel):
    id: str
    name: str | None = None
    emoji: str | None = None
    isNew: bool = False


class QuizSubmitResponse(BaseModel):
    score: int = 0
    totalQuestions: int = 0
    correctCount: int = 0
    passed: bool = False
    results: list[dict[str, Any]] = Field(default_factory=list)
    badgeEarned: BadgeAward | None = None
    progress: dict[str, Any] | None = None


_progress_store = ProgressStore()
_quiz_grader = QuizGrader()

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "course_content"
_QUIZZES_PATH = _DATA_DIR / "quizzes.json"
_MODULES_PATH = _DATA_DIR / "modules.json"

_QUIZZES_CACHE: dict[str, Any] | None = None
_MODULES_BY_ID_CACHE: dict[str, dict[str, Any]] | None = None

_DEFAULT_PASSING_SCORE = 70


class ContentLoadError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise ContentLoadError(status_code=404, detail=f"Content file not found: {path.name}")

    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except json.JSONDecodeError as error:
        raise ContentLoadError(status_code=500, detail=f"Invalid JSON in content file: {path.name}") from error
    except OSError as error:
        raise ContentLoadError(status_code=500, detail=f"Unable to read content file: {path.name}") from error

    if not isinstance(data, dict):
        raise ContentLoadError(status_code=500, detail=f"Invalid content format in file: {path.name}")

    return data


def _load_quizzes() -> dict[str, Any]:
    global _QUIZZES_CACHE

    if _QUIZZES_CACHE is None:
        _QUIZZES_CACHE = _load_json(_QUIZZES_PATH)

    return _QUIZZES_CACHE


def _load_modules() -> dict[str, dict[str, Any]]:
    global _MODULES_BY_ID_CACHE

    if _MODULES_BY_ID_CACHE is None:
        modules_data = _load_json(_MODULES_PATH)
        modules_list = modules_data.get("modules", [])
        modules_by_id: dict[str, dict[str, Any]] = {}

        if isinstance(modules_list, list):
            for module in modules_list:
                if not isinstance(module, dict):
                    continue

                module_id = module.get("id")
                if isinstance(module_id, str):
                    modules_by_id[module_id] = module

        _MODULES_BY_ID_CACHE = modules_by_id

    return _MODULES_BY_ID_CACHE


def _find_quiz(quiz_id: str) -> dict[str, Any] | None:
    quizzes_data = _load_quizzes()
    quizzes = quizzes_data.get("quizzes") if isinstance(quizzes_data, dict) else None
    quiz = quizzes.get(quiz_id) if isinstance(quizzes, dict) else None

    return quiz if isinstance(quiz, dict) else None


def _find_badge(module_id: str) -> dict[str, Any] | None:
    modules = _load_modules()
    module = modules.get(module_id)
    if not isinstance(module, dict):
        return None

    badge = module.get("badge", {}) if isinstance(module.get("badge", {}), dict) else {}
    badge_id = badge.get("id")

    if not isinstance(badge_id, str):
        return None

    return {
        "id": badge_id,
        "name": badge.get("name") if isinstance(badge.get("name"), str) else None,
        "emoji": badge.get("emoji") if isinstance(badge.get("emoji"), str) else None,
    }


def _sanitize_quiz(quiz: dict[str, Any]) -> dict[str, Any]:
    sanitized_quiz: dict[str, Any] = dict(quiz)
    sanitized_questions: list[dict[str, Any]] = []

    for question in quiz.get("questions", []):
        if not isinstance(question, dict):
            continue

        sanitized_question = dict(question)
        sanitized_question.pop("correctIndex", None)
        sanitized_question.pop("correctAnswer", None)
        sanitized_question.pop("correctIndices", None)
        sanitized_question.pop("explanation", None)
        sanitized_questions.append(sanitized_question)

    sanitized_quiz["questions"] = sanitized_questions
    return sanitized_quiz


def _normalize_passing_score(value: Any) -> int:
    if isinstance(value, bool):
        return _DEFAULT_PASSING_SCORE

    if isinstance(value, (int, float)):
        try:
            return int(value)
        except (TypeError, ValueError):
            return _DEFAULT_PASSING_SCORE

    return _DEFAULT_PASSING_SCORE


@router.get("/quizzes/{quiz_id}")
def get_quiz(quiz_id: str) -> dict[str, Any]:
    try:
        quiz = _find_quiz(quiz_id)
    except ContentLoadError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail) from error

    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    return _sanitize_quiz(quiz)


@router.post("/quizzes/{quiz_id}/submit", response_model=QuizSubmitResponse)
def submit_quiz(quiz_id: str, payload: QuizSubmitRequest) -> QuizSubmitResponse:
    try:
        quiz = _find_quiz(quiz_id)
        badge = _find_badge(payload.moduleId)
    except ContentLoadError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail) from error

    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = quiz.get("questions", []) if isinstance(quiz, dict) else []
    if not isinstance(questions, list):
        questions = []

    passing_score = _normalize_passing_score(quiz.get("passingScore"))
    grading = _quiz_grader.grade_quiz(questions=questions, answers=payload.answers, passing_score=passing_score)

    progress_update = _progress_store.record_quiz_result(
        module_id=payload.moduleId,
        quiz_id=quiz_id,
        score=grading["score"],
        passed=grading["passed"],
        badge_id=badge["id"] if isinstance(badge, dict) else None,
    )

    badge_earned = None
    if grading["passed"] and isinstance(badge, dict):
        badge_earned = {
            "id": badge.get("id"),
            "name": badge.get("name"),
            "emoji": badge.get("emoji"),
            "isNew": bool(progress_update.get("badgeAdded", False)),
        }

    grading["badgeEarned"] = badge_earned
    grading["progress"] = progress_update.get("progress")

    return QuizSubmitResponse(**grading)
