# NIST AI RMF 1.0 — Interactive Training Course

A local, self-contained, interactive training course covering the NIST Artificial Intelligence Risk Management Framework (AI RMF 1.0, NIST AI 100-1).

## Prerequisites

- Python 3.10-3.12 (Kokoro currently does not support Python 3.13)
- Node.js 18+ (includes npm)
- A modern web browser
- For neural TTS (Kokoro): `espeak-ng` installed on your system

## Quick Start

```bash
git clone https://github.com/rileywarren/nist-ai-rmf-course.git && cd nist-ai-rmf-course
./scripts/setup.sh
./scripts/start.sh
```

`scripts/start.sh` starts both services and opens the course in your browser.

`scripts/setup.sh` and `scripts/start.sh` are Bash scripts for macOS/Linux.
On Windows, use the manual PowerShell instructions below.

- API: `http://localhost:8000/api/health`
- Frontend (dev server): `http://localhost:5173`

## Project Structure

- **Backend:** FastAPI app in `server/main.py` (starts on port `8000`)
- **Frontend:** React + Vite app in `client` (starts on port `5173`)
- Data is stored in local JSON files under `server/data` (including `server/data/progress.json`), so no database or external service is required.

### Manual run

If you prefer to run services separately:

```bash
cd server
python -m uvicorn main:app --reload --port 8000
```

```bash
cd client
npm install
npm run dev
```

### Windows (PowerShell) setup and run

1. Install prerequisites:
   - Python 3.10-3.12
   - Node.js 18+
   - `espeak-ng` (install the Windows `.msi` package from https://github.com/espeak-ng/espeak-ng/releases/latest)
2. Open PowerShell in the project root, then run:
   (If Python 3.11 is not installed, replace `-3.11` with `-3.10` or `-3.12`.)

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\python -m pip install -r requirements.txt
cd .\client
npm install
cd ..
```

3. Start backend in one PowerShell window:

```powershell
cd .\server
..\.venv\Scripts\python -m uvicorn main:app --reload --port 8000
```

4. Start frontend in a second PowerShell window:

```powershell
cd .\client
npm run dev
```

## Course Structure

- **Module 1: Introduction & Framing Risk** - Understand what the NIST AI RMF is, how risk is defined, and key challenges in managing AI risk.
- **Module 2: Audience & AI Lifecycle** - Learn who the framework is for, the AI system lifecycle, and the role of TEVV throughout.
- **Module 3: Trustworthiness Characteristics** - Deep dive into the 7 characteristics of trustworthy AI systems and their tradeoffs.
- **Module 4: The GOVERN Function** - Explore cross-cutting governance: policies, accountability, culture, and third-party management.
- **Module 5: The MAP Function** - Learn how to establish context, categorize AI systems, and characterize impacts.
- **Module 6: The MEASURE Function** - Understand metrics, TEVV processes, trustworthiness evaluation, and risk tracking.
- **Module 7: The MANAGE Function** - Master risk treatment, incident response, third-party management, and continual improvement.
- **Module 8: Profiles, Integration & Capstone** - Study AI RMF profiles, AI-vs-traditional risk differences, human-AI interaction, and complete a capstone.

## Features

- 8 comprehensive modules with 26 lessons
- Interactive exercises: drag-and-drop, scenarios, flashcards, tradeoff simulations
- 92 quiz questions with detailed explanations
- 3 branching scenario simulations
- Guided capstone project
- 30-term searchable glossary
- 11 earnable achievement badges
- Progress tracking (persisted locally)
- Neural lesson narration (Kokoro-82M) with voice and speed controls

## Neural TTS Notes (Kokoro)

Kokoro is served from the local FastAPI backend at `POST /api/tts`.
Model reference: https://huggingface.co/hexgrad/Kokoro-82M

If narration fails with an `espeak-ng` error, install it and restart:

- macOS: `brew install espeak-ng`
- Ubuntu/Debian: `sudo apt-get install espeak-ng`
- Windows: install the `espeak-ng` `.msi` package, then restart PowerShell so PATH updates are applied

## Resetting Progress

Click **Reset Progress** in the sidebar, or delete `server/data/progress.json`.

## Course Content Source

All content is based on **NIST AI 100-1: Artificial Intelligence Risk Management Framework (AI RMF 1.0)**, January 2023.
Available at [https://doi.org/10.6028/NIST.AI.100-1](https://doi.org/10.6028/NIST.AI.100-1)

## License

Course materials are for personal educational use.
