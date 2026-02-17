from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

try:
    from .routers import progress, quiz, scenarios
except ImportError:
    from routers import progress, quiz, scenarios


app = FastAPI(title="NIST AI RMF Course API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(progress.router, prefix="/api")
app.include_router(quiz.router, prefix="/api")
app.include_router(scenarios.router, prefix="/api")


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


client_dist = Path(__file__).resolve().parent.parent / "client" / "dist"
app.mount("/", StaticFiles(directory=client_dist, html=True, check_dir=False), name="static")
