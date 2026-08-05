# ApplyForge — Progress Log

> **Running log of completed stages.** Read this to know "where are we."
> Updated after each stage is verified by the user.

---

## Current Status

**✅ Stage 1 — PDF Upload + Raw Text Extraction** — Complete (backend + UI built, servers verified)

**Next action:** Begin **Stage 2 — Structured Profile Extraction (LLM/Groq)**.

---

## Completed Stages

| # | Stage | What was built | Date | Notes |
|---|-------|---------------|------|-------|
| — | Planning | `PLAN.md`, `CONTEXT.md`, `PROGRESS.md` created. Architecture decisions locked. | 2026-08-06 | All 7 features; Groq + Tavily; Vercel + Render |
| 0 | Scaffolding | Backend (FastAPI + uv + pydantic-settings + `/api/health`), Frontend (Vite + React + TS + dev proxy), root files, git init | 2026-08-06 | ✅ Verified: `/api/health` → `{"status":"ok"}`, frontend loads at `:5173` |
| 1 | PDF Upload + Text Extraction | `POST /api/upload-cv`, `pdf_extractor.py` service, upload UI (drag-drop zone, spinner, error/success states, raw text display) | 2026-08-06 | ✅ Verified: both servers running, UI renders correctly |

---

## Stage History

### Planning Phase (2026-08-06, Session 1)
- Read `agent.md` scope document.
- Clarified 8 architecture questions with user.
- Produced `PLAN.md` (9 stages), `CONTEXT.md`, and this file.

---

### Stage 0 — Scaffolding (2026-08-06, Session 1)

**Built:**
- `backend/` — uv init, FastAPI, pydantic-settings, uvicorn. `app/main.py` (CORS + `/api/health`), `app/config.py` (settings), `.env.example`, `.env`.
- `frontend/` — Vite + React + TypeScript. `vite.config.ts` with `/api/*` proxy. Minimal App.tsx. CSS reset.
- Root: `.gitignore`, `README.md`, `latex/README.md`, `git init`.

**Bug fixed:** `.env.example` had blank-value lines (e.g. `RATE_LIMIT_PER_DAY=`) that caused pydantic int-parsing error. Fixed by keeping `.env` minimal (only set values) and documenting the pattern in `.env.example`.

**Verified (browser subagent):**
- `http://localhost:8000/api/health` → `{"status":"ok","environment":"development"}`
- `http://localhost:5173` → Dark-themed ApplyForge UI with step indicator and upload zone visible

---

### Stage 1 — PDF Upload + Raw Text Extraction (2026-08-06, Session 2)

**Built:**
- `backend/app/services/pdf_extractor.py` — `extract_text_from_pdf(bytes)`. Raises HTTP 422 for invalid PDF or image-only docs. Raises 500 on unexpected failure.
- `backend/app/routes/upload.py` — `POST /api/upload-cv`. Validates content type (PDF) + size (max 5 MB). Returns `{raw_text, filename, page_count_estimate}`.
- `backend/app/routes/__init__.py` + `backend/app/services/__init__.py` — package markers.
- `backend/app/main.py` — router registered under `/api` prefix.
- `frontend/src/App.tsx` — Upload state machine: idle → uploading → success/error. Drag-and-drop zone + file input. Raw text in `<pre>` block on success.
- `frontend/src/App.css` — Full dark UI: upload zone with hover, spinner, error card, raw text display.

**Dependencies added:** `pdfplumber`, `python-multipart` (via `uv add`).

**Pending user verification:**
- Upload a real CV PDF → confirm extracted text appears in the `<pre>` block
- Upload a non-PDF file → confirm error message
- Upload a >5 MB file → confirm "too large" error
