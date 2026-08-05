# ApplyForge — Technical Context

> **Living document.** Updated whenever a real decision is made or something changes from the original plan.
> A new AI session should read this after `agent.md` and before `PROGRESS.md`.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                    User Browser                  │
│   Vite + React + TypeScript SPA                 │
│   All session state in React (no persistence)   │
└────────────────────┬────────────────────────────┘
                     │ /api/* (dev proxy or CORS)
                     ▼
┌─────────────────────────────────────────────────┐
│              FastAPI Backend (Docker)            │
│  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │PDF Extract│ │LLM Calls │ │LaTeX Compiler  │  │
│  │(pdfplumber)│ │(Groq API)│ │(tectonic)      │  │
│  └──────────┘ └──────────┘ └────────────────┘  │
│  ┌──────────┐ ┌──────────┐                      │
│  │Rate Limit│ │Web Search│                      │
│  │(in-memory)│ │(Tavily)  │                      │
│  └──────────┘ └──────────┘                      │
└─────────────────────────────────────────────────┘
```

---

## Key Decisions (deviations from `agent.md`)

| Decision | `agent.md` said | We chose | Why |
|----------|----------------|----------|-----|
| **LLM Provider** | Anthropic (Claude) | **Groq** (free tier, Llama 3.x) | Free tier priority for MVP. No cost during validation phase. |
| **Web Search** | Anthropic web search tool or Serper/Tavily | **Tavily** | Groq has no built-in web search. Tavily has a generous free tier and returns structured results. |
| **Rate Limiting** | Upstash Redis | **In-memory (per-IP)** | Zero cost, zero setup. Fine for single-instance MVP. Resets on restart = acceptable for MVP. |
| **PDF Downloads** | Implied all outputs | **Only Tailored CV (LaTeX PDF) + Cover Letter (simple PDF)** | Email, LinkedIn DM, Match Score, Interview Qs, Salary Estimate are text/copy only. Reduces scope. |
| **Embeddings** | OpenAI (per global AGENTS.md) | **Not needed** | No RAG, no vector search. This app does prompt-based generation, not retrieval. Global AGENTS.md rule doesn't apply. |
| **Database** | Supabase Postgres (per global AGENTS.md) | **None** | No persistence by design. No accounts, no stored data. Global AGENTS.md rule doesn't apply to this project. |

---

## Stack (locked)

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React + TypeScript |
| Backend | Python + FastAPI |
| Python package manager | `uv` |
| LLM | Groq API (Llama 3.x) |
| Web search | Tavily API |
| PDF extraction | `pdfplumber` |
| LaTeX compilation | `tectonic` (in Docker) |
| Rate limiting | In-memory (custom or `slowapi`) |
| Frontend deployment | Vercel |
| Backend deployment | Render (Docker, free tier) |

---

## Project Structure (target)

```
applyforge/                          (repo root)
├── agent.md                         (original scope — DO NOT EDIT)
├── PLAN.md                          (staged build plan)
├── PROGRESS.md                      (running completion log)
├── CONTEXT.md                       (this file)
├── README.md                        (setup + run instructions)
├── .gitignore
├── docker-compose.yml               (local full-stack dev)
│
├── backend/
│   ├── pyproject.toml               (uv-managed)
│   ├── uv.lock
│   ├── Dockerfile
│   ├── .env.example
│   ├── app/
│   │   ├── main.py                  (FastAPI app + CORS + middleware)
│   │   ├── config.py                (pydantic-settings, all env vars)
│   │   ├── routes/
│   │   │   ├── upload.py            (PDF upload)
│   │   │   ├── generate.py          (all /api/generate/* endpoints)
│   │   │   └── compile.py           (LaTeX compilation)
│   │   ├── services/
│   │   │   ├── pdf_extractor.py
│   │   │   ├── llm.py               (Groq client wrapper)
│   │   │   ├── profile_parser.py    (structured extraction)
│   │   │   ├── latex_builder.py     (template population)
│   │   │   ├── latex_compiler.py    (tectonic invocation)
│   │   │   └── web_search.py        (Tavily client)
│   │   ├── prompts/                 (prompt templates per feature)
│   │   │   ├── profile_extraction.py
│   │   │   ├── match_score.py
│   │   │   ├── cover_letter.py
│   │   │   ├── outreach_email.py
│   │   │   ├── linkedin_dm.py
│   │   │   ├── interview_questions.py
│   │   │   ├── salary_estimate.py
│   │   │   └── tailored_cv.py
│   │   ├── models/                  (Pydantic schemas)
│   │   │   ├── profile.py
│   │   │   └── responses.py
│   │   └── middleware/
│   │       └── rate_limiter.py
│   └── tests/                       (lightweight smoke tests)
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/                     (API client functions)
│       ├── components/              (React components)
│       ├── types/                   (TypeScript interfaces)
│       └── styles/                  (CSS files)
│
└── latex/
    ├── template.tex                 (ATS-friendly CV template)
    └── cover_letter_template.tex    (simple letter template)
```

---

## Environment Variables Required

| Variable | Used by | Required | Notes |
|----------|---------|----------|-------|
| `GROQ_API_KEY` | Backend (LLM calls) | Yes | Get from https://console.groq.com |
| `TAVILY_API_KEY` | Backend (Salary Estimate web search) | Yes (Stage 6+) | Get from https://tavily.com |
| `ALLOWED_ORIGINS` | Backend (CORS) | No (defaults to `*` in dev) | Set to frontend domain in prod |
| `RATE_LIMIT_PER_DAY` | Backend (rate limiter) | No (defaults to 10) | Tune for production |
| `ENVIRONMENT` | Backend | No (defaults to `development`) | `production` tightens CORS + rate limits |

---

## How to Run Locally

> **Note:** Instructions will be finalized during Stage 0. Placeholder until then.

### Backend
```bash
cd backend
cp .env.example .env
# Fill in GROQ_API_KEY (and TAVILY_API_KEY when needed)
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173, proxies /api/* to localhost:8000
```

### Full Stack (Docker)
```bash
docker compose up
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
```

---

## Notes for Future Sessions

- `agent.md` is the **original scope document** — never edit it. If scope changes, record the delta here.
- The global `AGENTS.md` rules (Supabase, OpenAI, etc.) do **not** apply to this project. ApplyForge is a standalone MVP with no database, no auth, and uses Groq instead of OpenAI.
- The `AGENTS.md` dependency policy **does** apply: no unnecessary libraries. Write it yourself if it's <30 lines.
- All LLM prompts live in `backend/app/prompts/` as Python modules (not raw strings in route handlers).
- LaTeX compilation requires Docker (tectonic is Linux-native). If developing on Windows without Docker, the Tailored CV PDF download won't work locally — the HTML preview and `.tex` download will still work.
