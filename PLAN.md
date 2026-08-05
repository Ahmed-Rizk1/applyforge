# ApplyForge — Staged Build Plan

> **Source of truth for what gets built and in what order.**
> Each stage is a thin vertical slice: just enough backend + frontend to be testable end-to-end.
> Do NOT start a stage until the previous stage's "Done" criteria have been verified by the user.

---

## Stage 0 — Project Scaffolding & Dev Environment

### What gets built
- Monorepo folder structure: `frontend/`, `backend/`, `latex/` (template), root config files.
- **Backend:** `uv` project init (`pyproject.toml` managed by `uv`), FastAPI hello-world, `.env` / `.env.example` with placeholders for `GROQ_API_KEY`, `TAVILY_API_KEY`.
- **Frontend:** Vite + React + TypeScript scaffold (`npx create-vite`), dev proxy to backend.
- Root `.gitignore` (Python venvs, node_modules, `.env`, build artifacts, tectonic cache, `__pycache__`).
- Root `README.md` with local dev setup instructions (how to run frontend + backend).
- Empty `latex/` directory with a placeholder `README.md` noting the template will be built in Stage 5.

### Best practices applied
| Practice | Detail |
|----------|--------|
| **`uv` for Python deps** | `uv init` creates the project; all `pip install` equivalents use `uv add`. Lock file committed. |
| **Env var handling** | `pydantic-settings` `BaseSettings` class reads `.env`; code never calls `os.getenv` directly. `.env.example` committed, `.env` gitignored. |
| **Git hygiene** | Comprehensive `.gitignore` from day 0. First commit = clean scaffold. |
| **Monorepo layout** | `frontend/` and `backend/` are siblings at repo root; no nesting. `latex/` holds the template. |
| **Dev proxy** | Vite `server.proxy` routes `/api/*` to FastAPI during development, avoiding CORS pain. |

### How to test
1. `cd backend && uv run uvicorn app.main:app --reload` → hit `http://localhost:8000/health` → get `{"status": "ok"}`.
2. `cd frontend && npm run dev` → open `http://localhost:5173` → see Vite React default page.
3. Frontend can call `/api/health` through the dev proxy and display the response.

### Done when
- Both servers run without errors.
- `/api/health` returns JSON from the backend, visible in browser (directly and via frontend proxy).
- `.env.example` exists with all placeholder keys.
- Git repo initialized, first commit made.

---

## Stage 1 — PDF Upload + Raw Text Extraction

### What gets built
- **Backend:** `POST /api/upload-cv` endpoint. Accepts a PDF file upload (`UploadFile`). Uses `pdfplumber` to extract raw text. Returns `{"raw_text": "..."}`. Input validation: file must be PDF, max 5 MB.
- **Frontend:** Minimal upload page — a file input (`<input type="file" accept=".pdf">`), an upload button, and a `<pre>` block that displays the extracted raw text.
- Basic error handling: wrong file type → 422, file too large → 413, extraction failure → 500 with message.

### Best practices applied
| Practice | Detail |
|----------|--------|
| **Input validation at boundary** | File type + size checked server-side before processing. |
| **Error handling from day 1** | FastAPI exception handlers return structured error JSON. Frontend shows error messages. |
| **Separation of concerns** | PDF extraction logic in `backend/app/services/pdf_extractor.py`, not in the route handler. |

### How to test
1. Upload a real multi-page PDF CV → see extracted text in the browser.
2. Upload a `.docx` or `.png` → see a clear error message.
3. Upload a >5 MB PDF → see a file-too-large error.

### Done when
- Real PDF text appears on screen after upload.
- Invalid inputs produce clear, user-facing errors.

---

## Stage 2 — Structured Profile Extraction (LLM)

### What gets built
- **Backend:** `POST /api/parse-profile` endpoint (or extend the upload endpoint to do both steps). Takes raw text, sends it to **Groq API** (Llama 3.x or best available free model) with a structured extraction prompt. Returns a JSON profile object:
  ```json
  {
    "name": "...",
    "contact": { "email": "...", "phone": "...", "linkedin": "...", "location": "..." },
    "summary": "...",
    "work_experience": [
      { "title": "...", "company": "...", "start_date": "...", "end_date": "...", "bullets": ["..."] }
    ],
    "education": [
      { "degree": "...", "institution": "...", "year": "..." }
    ],
    "skills": ["..."],
    "certifications": ["..."],
    "languages": ["..."]
  }
  ```
- **Backend:** Pydantic model for the structured profile (used for response validation).
- **Frontend:** After upload, show the structured profile in a readable, editable card/form layout. User can review and correct fields before proceeding. "Confirm Profile" button locks it in for downstream use.
- **Frontend state:** Structured profile held in React state (context or simple state lifting). No persistence.

### Best practices applied
| Practice | Detail |
|----------|--------|
| **Pydantic response model** | Profile schema defined once, used for LLM output parsing + API response typing. |
| **LLM output validation** | If Groq returns malformed JSON, retry once with a tighter prompt. If still bad, return a structured error. |
| **Config for model name** | Groq model name in `Settings`, not hardcoded. |
| **Structured extraction prompt** | System prompt specifies exact JSON schema; uses Groq's JSON mode if available. |

### How to test
1. Upload a real CV PDF → see structured profile rendered as editable fields.
2. Edit a field (e.g., change a job title) → confirm the edit sticks in frontend state.
3. Click "Confirm Profile" → profile is locked and ready for features.
4. Upload a low-quality/scanned PDF with little text → see graceful handling (partial profile or clear message).

### Done when
- Structured profile displays correctly for at least 2-3 different real CVs.
- Editable fields work.
- Groq API key is read from `.env` and errors clearly if missing.

---

## Stage 3 — Job Description Input + Match Score (Feature #4)

### What gets built
- **Frontend:** After profile is confirmed, show a "Job Description" textarea. User pastes JD text.
- **Frontend:** A "Generate" section with feature buttons. For this stage, only **Match Score** is active.
- **Backend:** `POST /api/generate/match-score` — takes `{ profile, job_description }`, sends to Groq, returns:
  ```json
  {
    "score": 78,
    "matched_skills": ["Python", "FastAPI", ...],
    "missing_skills": ["Kubernetes", ...],
    "summary": "..."
  }
  ```
- **Frontend:** Display match score as a visual percentage + matched/missing skill pills.
- **Backend:** In-memory IP-based rate limiter middleware (e.g., `slowapi` or a simple custom dict with TTL). Configured via settings (e.g., 10 requests/IP/hour for dev, tighten for prod).

### Best practices applied
| Practice | Detail |
|----------|--------|
| **Rate limiting from first LLM-calling endpoint** | Applied as middleware, not per-route. |
| **Prompt engineering** | Match Score prompt explicitly returns JSON with required fields. |
| **API design** | All `/api/generate/*` endpoints share the same request shape `{ profile, job_description }` + optional extras. |

### How to test
1. Paste a real JD → click Match Score → see percentage + skill breakdown.
2. Hit the endpoint >10 times rapidly → see rate limit error (429).
3. Paste an empty JD → see validation error.

### Done when
- Match Score works end-to-end with real CV + real JD.
- Rate limiting is observable.

---

## Stage 4 — Text-Only Generation Features (Cover Letter, Email, LinkedIn DM, Interview Questions)

### What gets built
Four features that all follow the same pattern: profile + JD → LLM → text output. Built together because they share the same UI pattern and backend structure.

- **Backend endpoints:**
  - `POST /api/generate/cover-letter` → returns `{ "content": "..." }`
  - `POST /api/generate/outreach-email` → returns `{ "content": "..." }`
  - `POST /api/generate/linkedin-dm` → takes optional `recruiter_context` field → returns `{ "content": "..." }`
  - `POST /api/generate/interview-questions` → returns `{ "questions": [{ "question": "...", "reasoning": "..." }] }` (max 6)
- **Frontend:**
  - Each feature gets a result panel with the generated text.
  - **Copy to clipboard** button on each.
  - LinkedIn DM: optional "Recruiter Context" textarea (collapsed by default, expandable).
  - Interview Questions: rendered as a numbered list with reasoning.
  - Cover Letter: text display (PDF download comes in Stage 6).

### Best practices applied
| Practice | Detail |
|----------|--------|
| **DRY backend** | All text-generation endpoints share a common `generate(prompt_template, profile, jd, extras)` service function. Only the prompt differs. |
| **Prompt quality** | Each feature has a dedicated, tested prompt template in `backend/app/prompts/`. |
| **Optional input pattern** | LinkedIn DM endpoint accepts optional `recruiter_context`; prompt adapts based on presence. |

### How to test
1. Generate each of the 4 outputs with a real CV + JD → read the output for quality.
2. LinkedIn DM: generate once without recruiter context, once with → compare personalization.
3. Interview Questions: verify ≤ 6, each cross-references CV + JD.
4. Copy button works for each output.
5. Rate limiter still applies across all endpoints.

### Done when
- All 4 features produce reasonable output for real inputs.
- Copy-to-clipboard works.
- LinkedIn DM adapts to optional context.

---

## Stage 5 — LaTeX Template + Tailored CV (Feature #1)

### What gets built
This is the most complex feature. Split into sub-steps:

**5a: LaTeX Template Design**
- Design a single, clean, ATS-friendly LaTeX resume template in `latex/template.tex`.
- Template uses simple, parseable LaTeX (no exotic packages). Placeholders for all profile fields.
- Test it compiles locally with `tectonic`.

**5b: Backend — LaTeX Population + Compilation**
- **Backend service:** `backend/app/services/latex_builder.py` — takes structured profile + JD, calls Groq to get a "tailored" version of the profile (rewritten bullets, reordered skills), then populates the LaTeX template with the tailored content. Outputs a `.tex` file string.
- **Backend service:** `backend/app/services/latex_compiler.py` — takes a `.tex` string, writes to temp dir, runs `tectonic` to compile, returns PDF bytes. Handles compilation errors.
- **Backend endpoints:**
  - `POST /api/generate/tailored-cv` → returns `{ "html_preview": "...", "tex_source": "..." }`. The `html_preview` is a styled HTML/CSS rendering of the same content (not LaTeX-rendered — a parallel HTML template).
  - `POST /api/compile-pdf` → takes `{ "tex_source": "..." }`, compiles with tectonic, returns PDF as file download.
- **Dockerfile** for the backend — adds `tectonic` binary install. This is needed even for local dev on systems without tectonic (Docker Compose setup).

**5c: Frontend — CV Preview + Downloads**
- Display the HTML/CSS preview of the tailored CV in a styled panel.
- "Download PDF" button → calls `/api/compile-pdf` → browser downloads the PDF.
- "Download .tex" button → browser downloads the `.tex` source directly (no server call needed, just download from frontend state).

### Best practices applied
| Practice | Detail |
|----------|--------|
| **Docker for tectonic** | `tectonic` is Linux-native; Docker ensures it works on any dev machine and in deployment. Multi-stage Dockerfile keeps image small. |
| **Temp file cleanup** | Compilation uses `tempfile.TemporaryDirectory`, auto-cleaned. |
| **HTML preview ≠ LaTeX render** | Separate HTML/CSS template mirrors the LaTeX layout. Simpler, faster, no WASM needed. |
| **LaTeX injection safety** | User-provided text is escaped before insertion into the `.tex` template (backslash, braces, %, etc.). |

### How to test
1. Generate Tailored CV with real CV + JD → see HTML/CSS preview in browser.
2. Click "Download PDF" → get a real, clean PDF.
3. Click "Download .tex" → get the LaTeX source. Open it in Overleaf or local TeX → it compiles.
4. Verify the CV content is tailored to the JD (not just raw profile dump).
5. Upload a CV with special characters (%, &, $) → verify LaTeX doesn't break.

### Done when
- HTML preview looks professional and ATS-friendly.
- PDF download works and looks identical to the preview in layout.
- `.tex` source compiles independently.
- Docker Compose runs the backend with tectonic successfully.

---

## Stage 6 — Salary Estimate with Web Search (Feature #7) + Cover Letter PDF

### What gets built

**6a: Salary Estimate**
- **Backend:** `POST /api/generate/salary-estimate` — takes `{ profile, job_description }`:
  1. Extracts job title, level, and location from profile + JD.
  2. Calls **Tavily Search API** with a targeted salary query (e.g., `"senior frontend engineer salary London 2025"`).
  3. Feeds search results (snippets + URLs) into **Groq** to synthesize a salary range.
  4. Returns:
     ```json
     {
       "range_low": 85000,
       "range_high": 110000,
       "currency": "USD",
       "sources": [
         { "title": "...", "url": "...", "snippet": "..." }
       ],
       "summary": "..."
     }
     ```
- **Frontend:** Display salary range with a visual bar/range indicator, source citations as clickable links, and an "AI estimate" disclaimer label.

**6b: Cover Letter PDF Download**
- **Backend:** `POST /api/generate/cover-letter-pdf` — takes cover letter text, renders it into a simple LaTeX document (letter class or a minimal template), compiles with tectonic, returns PDF.
- **Frontend:** "Download as PDF" button on the cover letter output panel.

### Best practices applied
| Practice | Detail |
|----------|--------|
| **Web search grounding** | Salary data comes from real, cited sources — not raw LLM knowledge. |
| **Tavily in settings** | API key from `.env`, search config (max results, search depth) in settings. |
| **Disclaimer UI** | Salary estimate clearly labeled as AI-generated estimate, not authoritative. |

### How to test
1. Generate Salary Estimate for a known role + location → verify range is plausible and sources are real URLs.
2. Check that source links are clickable and lead to real pages.
3. Generate Cover Letter → click "Download as PDF" → get a cleanly formatted PDF.
4. Test Salary Estimate with a very niche/obscure job title → verify graceful handling.

### Done when
- Salary Estimate returns grounded, cited results.
- Cover Letter PDF downloads correctly.
- All 7 features are now functional end-to-end.

---

## Stage 7 — UI Polish, Responsive Design & Full UX Pass

### What gets built
- **Complete UI redesign pass:** Apply a cohesive design system — color palette, typography (Google Fonts), spacing, component styling.
- **Layout:** Clean multi-step flow: Upload → Review Profile → Paste JD → Generate (feature cards) → Results.
- **Responsive design:** Works on mobile and desktop.
- **Micro-interactions:** Loading states/spinners during LLM calls, smooth transitions between steps, hover effects on buttons/cards.
- **Error states:** User-friendly error messages for all failure modes (rate limit, API errors, bad PDF).
- **Stepper/progress indicator** for the multi-step flow.
- **Feature cards** with icons and descriptions.
- **SEO basics:** Title, meta description, Open Graph tags (for LinkedIn sharing!).

### Best practices applied
| Practice | Detail |
|----------|--------|
| **Design system** | CSS custom properties for colors, spacing, typography. No ad-hoc values. |
| **Progressive disclosure** | Features revealed step-by-step, not all at once. |
| **Loading UX** | Skeleton/spinner during LLM calls (which can take 5-15s). |
| **Mobile-first** | Responsive from the start of this stage. |
| **OG tags** | Critical since the launch channel is LinkedIn — link previews must look good. |

### How to test
1. Full end-to-end flow on desktop: upload → profile → JD → generate all 7 → download CVs.
2. Same flow on mobile viewport.
3. Share the URL on LinkedIn (staging) → verify OG preview card looks good.
4. Trigger every error state → verify user-friendly messages.
5. Check loading states during generation (throttle network in devtools).

### Done when
- The app looks polished and professional — not a dev prototype.
- Responsive on mobile.
- All error/loading states handled.
- OG tags render a good LinkedIn preview.

---

## Stage 8 — Deployment Config, Hardening & Launch Prep

### What gets built
- **Backend Dockerfile** (finalize): Multi-stage build, tectonic installed, production uvicorn config.
- **`docker-compose.yml`** for local full-stack dev (backend + frontend).
- **Vercel config** (`vercel.json`) for frontend deployment with API rewrites to backend.
- **Render config** (`render.yaml` or Dockerfile) for backend deployment.
- **CORS configuration** — lock to frontend domain only (not `*`).
- **Rate limit tuning** — set production limits (3-5 generations/IP/day).
- **Health check endpoint** hardening.
- **Final `.env.example`** with all required keys documented.
- **`README.md`** update with full setup, deployment, and architecture docs.

### Best practices applied
| Practice | Detail |
|----------|--------|
| **Multi-stage Docker** | Build stage installs deps, prod stage copies only what's needed. Keeps image small. |
| **CORS lockdown** | Only the production frontend domain, not `*`. |
| **Prod rate limits** | Tightened from dev values. |
| **Docs** | README covers local dev, deployment, and architecture for future contributors / AI sessions. |

### How to test
1. `docker compose up` → full stack runs locally in Docker.
2. All 7 features work in Docker environment.
3. Frontend build (`npm run build`) succeeds without errors.
4. Backend starts with only `.env.example` values → fails fast with clear error about missing keys.
5. CORS: frontend on different port can't access backend (without proxy) → correct.

### Done when
- Docker Compose runs the full stack.
- All config files for Vercel + Render are present and documented.
- README is complete.
- Ready for manual deployment.

---

## Dependency Graph (why this order)

```
Stage 0: Scaffold
  └─▸ Stage 1: PDF Upload + Text Extraction
       └─▸ Stage 2: Structured Profile (needs raw text)
            └─▸ Stage 3: JD Input + Match Score (needs profile + JD)
            │    └─▸ Stage 4: Text Features (same pattern as Match Score)
            │         └─▸ Stage 6a: Salary Estimate (needs profile + JD + Tavily)
            └─▸ Stage 5: Tailored CV (needs profile + JD + LaTeX + Docker)
                 └─▸ Stage 6b: Cover Letter PDF (reuses tectonic infra from Stage 5)
                      └─▸ Stage 7: UI Polish (all features exist to polish)
                           └─▸ Stage 8: Deploy Config (polish done, ready to ship)
```

---

## Assumptions (decided by engineer, not user)

1. **Groq model:** Will use `llama-3.3-70b-versatile` or best available free model at the time. Configurable via settings.
2. **PDF size limit:** 5 MB (generous for CVs, guards against abuse).
3. **Rate limit defaults (dev):** 10 requests/IP/hour. Production: 5 generations/IP/day.
4. **Temp file strategy:** `tempfile.TemporaryDirectory` for LaTeX compilation, auto-cleaned.
5. **HTML preview:** A separate HTML/CSS template that mirrors the LaTeX layout, not a LaTeX-to-HTML conversion.
6. **Cover Letter PDF:** Simple single-page LaTeX letter template, not the full CV template.
7. **Frontend state management:** React Context or `useState` lifting — no Redux/Zustand for MVP.
