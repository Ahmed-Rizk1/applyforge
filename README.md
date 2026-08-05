# ApplyForge

AI-powered, JD-tailored job application toolkit. Upload your CV, paste a job description, get tailored outputs instantly.

## Quick Start

### Prerequisites
- Python 3.12+ & [uv](https://docs.astral.sh/uv/)
- Node.js 20+
- Docker (optional, required for LaTeX PDF compilation)

### Backend
```bash
cd backend
cp .env.example .env
# Fill in your GROQ_API_KEY (get one at https://console.groq.com)
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173, proxies /api/* to backend
```

### Verify
- Backend health: http://localhost:8000/api/health
- Frontend: http://localhost:5173

## Project Structure

See [CONTEXT.md](CONTEXT.md) for full architecture details.

## Status

See [PROGRESS.md](PROGRESS.md) for current build status.
