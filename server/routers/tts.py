from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

try:
    from ..services.tts_kokoro import KokoroService, KokoroSynthesisError
except ImportError:
    from services.tts_kokoro import KokoroService, KokoroSynthesisError


router = APIRouter()
tts_service = KokoroService()

DEFAULT_VOICE = "af_heart"
MIN_SPEED = 0.7
MAX_SPEED = 1.4

# Curated voices from Kokoro's default voice pack.
DEFAULT_VOICES = [
    "af_heart",
    "af_bella",
    "af_sarah",
    "af_nicole",
    "am_adam",
    "am_michael",
    "bf_emma",
    "bm_george",
]


class TtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    voice: str = Field(default=DEFAULT_VOICE, min_length=2, max_length=64)
    speed: float = Field(default=1.0, ge=MIN_SPEED, le=MAX_SPEED)


@router.get("/tts/voices")
def get_tts_voices() -> dict[str, object]:
    return {
        "voices": DEFAULT_VOICES,
        "defaultVoice": DEFAULT_VOICE,
        "minSpeed": MIN_SPEED,
        "maxSpeed": MAX_SPEED,
        "engine": "kokoro-82m",
    }


@router.post("/tts")
def synthesize_tts(payload: TtsRequest) -> Response:
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    try:
        audio_wav = tts_service.synthesize_wav(
            text=text,
            voice=payload.voice,
            speed=payload.speed,
        )
    except KokoroSynthesisError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    return Response(
        content=audio_wav,
        media_type="audio/wav",
        headers={
            "Cache-Control": "no-store",
            "X-TTS-Engine": "kokoro-82m",
        },
    )
