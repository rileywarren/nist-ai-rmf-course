from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from filelock import FileLock


class ProgressStore:
    def __init__(self) -> None:
        self._data_dir = Path(__file__).resolve().parent.parent / "data"
        self._course_content_dir = self._data_dir / "course_content"
        self._progress_path = self._data_dir / "progress.json"
        self._lock_path = self._data_dir / "progress.json.lock"
        self._lock = FileLock(str(self._lock_path))

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _default_progress(self) -> dict[str, Any]:
        return {
            "user": {
                "startedAt": None,
                "lastActiveAt": None,
                "difficulty": "beginner",
            },
            "modules": {},
            "scenarios": {},
            "capstone": {
                "started": False,
                "currentStep": None,
                "selectedSystem": None,
                "responses": {},
            },
            "badges": [],
            "totalTimeMinutes": 0,
        }

    def _default_module_progress(self) -> dict[str, Any]:
        return {
            "status": "not_started",
            "lessonsCompleted": [],
            "quizScore": None,
            "quizPassed": False,
            "quizAttempts": 0,
            "badgeEarned": False,
            "completedAt": None,
        }

    @staticmethod
    def _is_int_like(value: Any) -> bool:
        return isinstance(value, int) and not isinstance(value, bool)

    def _module_lesson_total(self, module_id: str) -> int | None:
        match = re.fullmatch(r"module-(\d+)", module_id)
        if match is None:
            return None

        lessons_path = self._course_content_dir / f"module{int(match.group(1))}_lessons.json"
        if not lessons_path.exists():
            return None

        try:
            with lessons_path.open("r", encoding="utf-8") as lessons_file:
                lessons_data = json.load(lessons_file)
        except (json.JSONDecodeError, OSError):
            return None

        if not isinstance(lessons_data, dict):
            return None

        lessons = lessons_data.get("lessons")
        if not isinstance(lessons, list):
            return None

        return len(lessons)

    def _module_has_passed_quiz(self, module_progress: dict[str, Any]) -> bool:
        quiz_passed = module_progress.get("quizPassed")
        if isinstance(quiz_passed, bool):
            return quiz_passed

        score = module_progress.get("quizScore")
        return self._is_int_like(score) and int(score) >= 70

    def _apply_module_status(self, module_id: str, module_progress: dict[str, Any]) -> None:
        completed_lessons = module_progress.get("lessonsCompleted")
        if not isinstance(completed_lessons, list):
            completed_lessons = []
            module_progress["lessonsCompleted"] = completed_lessons

        lesson_count = self._module_lesson_total(module_id)
        completed_lesson_count = len(
            {
                str(lesson_id)
                for lesson_id in completed_lessons
                if lesson_id is not None
            }
        )

        quiz_passed = self._module_has_passed_quiz(module_progress)
        attempts_raw = module_progress.get("quizAttempts", 0)
        attempts = int(attempts_raw) if self._is_int_like(attempts_raw) else 0
        has_activity = completed_lesson_count > 0 or module_progress.get("quizScore") is not None or attempts > 0

        is_complete = (
            lesson_count is not None
            and lesson_count > 0
            and completed_lesson_count >= lesson_count
            and quiz_passed
        )

        if is_complete:
            module_progress["status"] = "completed"
            if not module_progress.get("completedAt"):
                module_progress["completedAt"] = self._now_iso()
            return

        module_progress["completedAt"] = None
        module_progress["status"] = "in_progress" if has_activity else "not_started"

    def _read_progress(self) -> dict[str, Any]:
        if not self._progress_path.exists():
            return self._default_progress()

        try:
            with self._progress_path.open("r", encoding="utf-8") as progress_file:
                data = json.load(progress_file)
        except (json.JSONDecodeError, OSError):
            return self._default_progress()

        if isinstance(data, dict):
            return data

        return self._default_progress()

    def _write_progress(self, progress: dict[str, Any]) -> None:
        self._data_dir.mkdir(parents=True, exist_ok=True)

        progress_user = progress.get("user")
        if not isinstance(progress_user, dict):
            progress_user = {}
            progress["user"] = progress_user
        progress_user["lastActiveAt"] = self._now_iso()

        temp_path = self._progress_path.with_name(f".{self._progress_path.name}.tmp")
        with temp_path.open("w", encoding="utf-8") as progress_file:
            json.dump(progress, progress_file)

        os.replace(temp_path, self._progress_path)

    def get_progress(self) -> dict[str, Any]:
        with self._lock:
            return self._read_progress()

    def save_progress(self, data: dict[str, Any]) -> None:
        with self._lock:
            progress = dict(data)
            self._write_progress(progress)

    def mark_lesson_complete(self, module_id: str, lesson_id: str) -> dict[str, Any]:
        with self._lock:
            progress = self._read_progress()
            modules = progress.setdefault("modules", {})
            module_progress = modules.setdefault(module_id, self._default_module_progress())
            lessons = module_progress.setdefault("lessonsCompleted", [])

            if lesson_id not in lessons:
                lessons.append(lesson_id)

            self._apply_module_status(module_id, module_progress)
            self._write_progress(progress)
            return progress

    def record_quiz_result(
        self,
        module_id: str,
        quiz_id: str,
        score: int,
        passed: bool,
        badge_id: str | None,
    ) -> dict[str, Any]:
        with self._lock:
            progress = self._read_progress()
            modules = progress.setdefault("modules", {})
            module_progress = modules.setdefault(module_id, self._default_module_progress())

            previous_score = module_progress.get("quizScore")
            if previous_score is None or score > previous_score:
                module_progress["quizScore"] = score

            attempts = module_progress.get("quizAttempts", 0)
            module_progress["quizAttempts"] = int(attempts) + 1 if self._is_int_like(attempts) else 1
            module_progress["quizPassed"] = bool(module_progress.get("quizPassed")) or bool(passed)

            badge_added = False
            if passed and badge_id:
                module_progress["badgeEarned"] = True
                badges = progress.setdefault("badges", [])
                if badge_id not in badges:
                    badges.append(badge_id)
                    badge_added = True

            self._apply_module_status(module_id, module_progress)
            self._write_progress(progress)
            return {
                "progress": progress,
                "badgeAdded": badge_added,
                "moduleCompleted": module_progress.get("status") == "completed",
            }

    def record_scenario_result(self, scenario_id: str, score: int, max_score: int) -> dict[str, Any]:
        with self._lock:
            progress = self._read_progress()
            scenarios = progress.setdefault("scenarios", {})
            scenarios[scenario_id] = {"score": score, "maxScore": max_score}
            self._write_progress(progress)
            return progress

    def save_capstone(self, capstone_data: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            progress = self._read_progress()
            capstone = progress.setdefault("capstone", {})
            if isinstance(capstone_data, dict):
                capstone.update(capstone_data)
            self._write_progress(progress)
            return progress

    def reset_progress(self) -> dict[str, Any]:
        with self._lock:
            progress = self._default_progress()
            self._write_progress(progress)
            return progress

    def set_user_start(self) -> None:
        with self._lock:
            progress = self._read_progress()
            user = progress.setdefault("user", {})

            if user.get("startedAt") is None:
                user["startedAt"] = self._now_iso()
                self._write_progress(progress)
