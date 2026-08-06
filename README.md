# ApplyForge — AI Job Application Copilot & ATS Resume Builder

ApplyForge is a high-performance, privacy-focused AI job application assistant. It extracts candidate background from CV PDFs or raw text/LaTeX, analyzes target Job Descriptions (JD), and generates high-converting, ATS-tailored application assets in seconds.

---

## ⚡ Core Features

1. **📄 CV PDF & LaTeX Extraction:** Instant text extraction from multi-page PDFs or raw LaTeX source code.
2. **👤 Interactive Profile Review:** AI structures contact details, work experiences, skills, education, projects, and certifications with an interactive review & edit interface.
3. **🎯 ATS Match Score & Skill Gap Analysis:** Visual match score gauge, matched skills list, and missing gap skills breakdown against target JDs.
4. **📄 ATS-Tailored Resume (LaTeX + PDF):** Generates clean, single-page ATS-friendly LaTeX resumes, live HTML preview, one-click `.tex` code copy, `.tex` download, and PDF compilation.
5. **📝 Tailored Cover Letter (+ PDF Download):** Impact-driven cover letter generation with instant single-page PDF compilation.
6. **✉️ Cold Outreach Email:** Concise, high-converting outreach email to hiring managers with clear CTAs.
7. **💬 Personalized LinkedIn DM:** Short, punchy recruiter message with optional recruiter context input.
8. **💡 Tailored Interview Question Predictor:** Predicts expected interview questions based on CV profile gaps vs JD requirements, with custom reasoning & prep tips.
9. **💰 Grounded Market Salary Benchmark:** Real-time web search (Tavily API) + Groq LLM synthesis providing grounded salary ranges, currency converter, and clickable web citations.
10. **💬 Application Form Q&A Copilot:** Dedicated full-page chatbot for answering application form prompts with selectable Detail Levels (*Concise*, *Standard*, *Detailed*) and Response Modes (*Professional*, *Conversational*, *Enthusiastic & Persuasive*, *Bold & Impact*, *STAR Storyteller*). Plain text form-ready output.

---

## 🛠️ Technology Stack

- **Backend:** Python 3.11+, FastAPI, Pydantic v2, `uv` package manager, Groq LLM SDK (Llama 3.3 70B), Tavily REST Search API, Tectonic TeX Compiler.
- **Frontend:** React 18, TypeScript, Vite, Vanilla CSS Design System, Google Fonts (*Plus Jakarta Sans* & *Inter*).
- **Deployment:** Docker & Docker Compose, Vercel (Frontend), Render (Backend).

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Python 3.11+ & [`uv`](https://docs.astral.sh/uv/)
- Node.js 20+ & `npm`
- (Optional) Docker for full-stack orchestration & Tectonic PDF compilation

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Open .env and add your GROQ_API_KEY and TAVILY_API_KEY

uv sync
uv run uvicorn app.main:app --reload --port 8000
```
- Health Check: `http://localhost:8000/api/health`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Open browser at: `http://localhost:5173`

---

## 🐳 Docker Full-Stack Setup

Run the entire application (Backend + Frontend + Tectonic PDF Compiler) with Docker Compose:

```bash
# Ensure backend/.env contains GROQ_API_KEY & TAVILY_API_KEY
docker compose up --build
```
- Access Frontend: `http://localhost`
- Access Backend API: `http://localhost:8000/api/health`

---

## ☁️ Deployment Guide

### Deploy Frontend to Vercel
1. Import the `frontend/` directory in Vercel.
2. Vercel will automatically read `frontend/vercel.json` for API proxy rewrites to your backend container.

### Deploy Backend to Render / Railway
1. Create a new Web Service on Render / Railway pointing to the `backend/` directory.
2. Select **Docker** as the environment (Render uses `backend/render.yaml` or `backend/Dockerfile`).
3. Add Environment Variables:
   - `GROQ_API_KEY`
   - `TAVILY_API_KEY`
   - `ENVIRONMENT=production`
   - `ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app`

---

## 📄 License & Architecture Docs

See [CONTEXT.md](CONTEXT.md) for full architecture specs and [PROGRESS.md](PROGRESS.md) for stage completion history.
