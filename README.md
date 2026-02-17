# NIST AI RMF 1.0 — Interactive Training Course

A local, self-contained, interactive training course covering the NIST Artificial Intelligence Risk Management Framework (AI RMF 1.0, NIST AI 100-1).

## Prerequisites

- Python 3.11+
- Node.js 18+ (includes npm)
- A modern web browser

## Quick Start

```bash
git clone <repo> && cd nist-ai-rmf-course
./scripts/setup.sh
./scripts/start.sh
```

`scripts/start.sh` starts both services and opens the course in your browser.

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

## Resetting Progress

Click **Reset Progress** in the sidebar, or delete `server/data/progress.json`.

## Course Content Source

All content is based on **NIST AI 100-1: Artificial Intelligence Risk Management Framework (AI RMF 1.0)**, January 2023.
Available at [https://doi.org/10.6028/NIST.AI.100-1](https://doi.org/10.6028/NIST.AI.100-1)

## License

Course materials are for personal educational use.
