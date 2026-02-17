from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

try:
    from server.services.progress_store import ProgressStore
except ImportError:
    from services.progress_store import ProgressStore


router = APIRouter()
progress_store = ProgressStore()


class LessonCompleteRequest(BaseModel):
    moduleId: str
    lessonId: str


@router.get("/progress")
def get_progress() -> dict[str, Any]:
    return progress_store.get_progress()


@router.post("/progress/lesson-complete")
def mark_lesson_complete(
    payload: LessonCompleteRequest,
) -> dict[str, Any]:
    progress_store.set_user_start()
    return progress_store.mark_lesson_complete(payload.moduleId, payload.lessonId)


@router.post("/progress/reset")
def reset_progress() -> dict[str, Any]:
    return progress_store.reset_progress()
