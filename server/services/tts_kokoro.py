from __future__ import annotations

import io
import wave
from threading import Lock


class KokoroSynthesisError(RuntimeError):
    """Raised when Kokoro cannot synthesize audio."""


class KokoroService:
    sample_rate = 24_000

    def __init__(self) -> None:
        self._pipeline = None
        self._pipeline_lock = Lock()

    def _get_pipeline(self):
        if self._pipeline is not None:
            return self._pipeline

        with self._pipeline_lock:
            if self._pipeline is not None:
                return self._pipeline

            try:
                from kokoro import KPipeline
            except Exception as error:
                raise KokoroSynthesisError(
                    "Kokoro is not installed. Run ./scripts/setup.sh to install Python dependencies."
                ) from error

            try:
                self._pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
            except Exception as error:
                message = str(error).strip() or "Unable to initialize Kokoro."
                if "espeak" in message.lower():
                    message = (
                        "Kokoro requires espeak-ng for grapheme-to-phoneme conversion. "
                        "Install espeak-ng and restart the backend."
                    )
                raise KokoroSynthesisError(message) from error

            return self._pipeline

    def synthesize_wav(self, text: str, voice: str = "af_heart", speed: float = 1.0) -> bytes:
        normalized_text = text.strip()
        if not normalized_text:
            raise KokoroSynthesisError("Text cannot be empty.")

        pipeline = self._get_pipeline()

        try:
            import torch
        except Exception as error:
            raise KokoroSynthesisError("PyTorch is required for Kokoro synthesis.") from error

        try:
            generator = pipeline(
                normalized_text,
                voice=voice.strip() or "af_heart",
                speed=speed,
                split_pattern=r"\n+",
            )
        except Exception as error:
            message = str(error).strip() or "Unable to start Kokoro synthesis."
            raise KokoroSynthesisError(message) from error

        chunks = []
        try:
            for result in generator:
                audio = getattr(result, "audio", None)
                if audio is None and isinstance(result, tuple) and len(result) >= 3:
                    audio = result[2]
                if audio is None:
                    continue

                if isinstance(audio, torch.Tensor):
                    tensor = audio.detach().to("cpu").flatten()
                else:
                    tensor = torch.as_tensor(audio, dtype=torch.float32).flatten()
                if tensor.numel() > 0:
                    chunks.append(tensor)
        except Exception as error:
            message = str(error).strip() or "Kokoro failed while generating audio."
            raise KokoroSynthesisError(message) from error

        if not chunks:
            raise KokoroSynthesisError("Kokoro returned no audio for the provided text.")

        merged = torch.cat(chunks).clamp(-1.0, 1.0)
        pcm = (merged * 32767.0).to(torch.int16).numpy().tobytes()

        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(self.sample_rate)
            wav_file.writeframes(pcm)

        return buffer.getvalue()
