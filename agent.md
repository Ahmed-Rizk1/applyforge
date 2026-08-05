# ApplyForge — Project Context (agent.md)

## What this is
A public, no-login MVP web app. User uploads their CV (PDF), pastes a job description, and gets a set of AI-generated, JD-tailored outputs. Goal: ship in ~1 week, share on LinkedIn to get visibility/interactions with recruiters, validate demand before considering multi-tenant SaaS expansion.

## Core principle
No accounts, no persistent user data storage for MVP. Everything lives client-side / per-session only. Validate first, add accounts/persistence later if traction is real.

---

## User flow

1. User uploads CV as a **PDF**.
2. Backend extracts raw text, then runs a dedicated LLM pass to convert it into a **structured JSON profile** (name, contact, work history w/ dates + bullets, skills, education). This structured profile is shown back to the user for review, and is the single source of truth every feature reuses.
3. User pastes a **job description** into a text field.
4. User selects which output(s) to generate from a set of buttons.
5. Outputs are generated and shown; nothing is saved server-side after the response — parsed profile + JD + results live only in front-end state for that session (refresh = gone).

---

## Features (v1, final list — 6 total)

1. **Tailored CV**
   - AI edits/populates a single pre-built ATS-friendly LaTeX template using the user's structured profile, tailored to the JD.
   - Output: styled HTML/CSS preview shown instantly in-browser (not a live LaTeX-typing preview).
   - Two downloads offered: **compiled PDF** (server compiles LaTeX on-demand, on click) and **raw `.tex` source** (same file used to compile), so the user can reuse/edit the LaTeX elsewhere if they want.
   - No live in-browser LaTeX compilation — that's a possible phase-2 feature, not MVP.

2. **Cover Letter**
   - Generated text, editable in UI, copyable. Optional "download as PDF" of the text.

3. **Outreach Email**
   - Short application/outreach email text, copyable.

4. **Match Score**
   - % fit between structured CV profile and JD, with breakdown of matched vs. missing keywords/skills. Single LLM call comparing the two.

5. **LinkedIn Connection/DM Message**
   - Draft outreach message for a recruiter/hiring manager on LinkedIn.
   - Input: JD (required) + optional "recruiter context" field (paste their LinkedIn About text / a recent post / their name).
   - If context field is empty → more generic but still tailored-to-JD message.
   - If filled → sharper, more personalized, references the pasted context. No extra work forced on user, but rewarded if they provide more.

6. **Likely Interview Questions**
   - Max 6 questions.
   - **Cross-referenced against both the JD and the user's structured CV profile** (not JD-only) — so questions are personalized, e.g. flagging specifically which of the user's experiences are likely to be probed because the JD requires it but the CV only mentions it briefly.

7. **Salary Range Estimate**
   - Customized by country, job, level — varies significantly by these factors, so **not** pulled from raw LLM training knowledge alone.
   - Grounded via **real-time web search** (2–3 sources) per request; AI synthesizes a range from actual retrieved sources and cites them.
   - Clearly labeled in UI as an AI-generated estimate based on web sources, not guaranteed/live market data.

*(Note: total is 7 listed above — Tailored CV, Cover Letter, Email, Match Score, LinkedIn DM, Interview Questions, Salary Estimate. All are in scope for v1.)*

---

## Explicitly OUT of scope for MVP (phase 2 candidates)
- User accounts / login / multi-tenancy
- Persistent storage of resumes, JDs, or generated outputs
- Live in-browser LaTeX editing/compilation (WASM or otherwise)
- Bring-your-own-API-key option
- Application tracker / history across sessions
- Referral request message, red flag scanner, "why this company" grounded paragraph (raised as ideas, not selected for v1 — worth revisiting)

---

## Technical architecture decisions

### Frontend
- **React** (SPA)
- Handles: PDF upload UI, structured profile review/edit, JD paste field, 6 feature-trigger buttons, results display panels, PDF/LaTeX download buttons.
- All session state (parsed profile, JD, generated outputs) held in front-end state only — nothing persisted.

### Backend
- **FastAPI**
- Responsibilities:
  - PDF text extraction (e.g., `pdfplumber` or similar) → LLM call to structure into JSON profile
  - LLM calls for each of the 6 features (Anthropic API, since built in Claude)
  - Web search integration for Salary Estimate (Anthropic web search tool or a search API like Serper/Tavily) — grounded, cited sources
  - LaTeX → PDF compilation endpoint (on-demand, triggered by "Download PDF" click only, not live)
  - Rate limiting logic

### LaTeX compilation
- Engine: **`tectonic`** (not full TeXLive) — smaller install, fetches packages on demand, sufficient for a single controlled resume template that we control the packages for.
- One pre-built, ATS-friendly LaTeX resume template designed in-house; AI populates/tailors it from the structured profile + JD. Users are NOT expected to already have their own LaTeX resume.
- Compilation happens server-side, on-demand (button click), not as a live-typing preview.

### Deployment
- **Frontend:** Vercel or Netlify
- **Backend:** Render or Railway (Docker container with FastAPI + `tectonic` installed) — needed because LaTeX compilation requires a native binary + persistent-ish filesystem, which rules out pure serverless (e.g., plain Vercel functions).

### Cost / abuse protection
- **No bring-your-own-key** for MVP — friction would kill the "paste and go" viral/demo effect that's the whole point of the LinkedIn share.
- Server holds the API key. Guardrails instead:
  - IP-based rate limiting (e.g., 3–5 generations per IP per day) — likely via Upstash Redis (serverless-friendly, generous free tier)
  - Max token/request size caps per generation
  - Manual spend monitoring daily for at least the first week post-launch, since there's no auth gate

### LLM provider
- Anthropic API (Claude), including Anthropic's web search tool for the Salary Estimate feature's grounding.

---

## Key design principles established during scoping
- **No storage, no accounts for v1** — every architectural choice defaults to "ephemeral, session-only" to avoid PII/data-retention liability and keep scope small.
- **Structured extraction over raw-text prompting** — one LLM pass turns the uploaded PDF into a clean JSON profile; every downstream feature consumes that same object rather than re-parsing raw text each time. More reliable outputs, and gives a natural "review your parsed info" UI step that builds user trust.
- **Ground anything that requires real-world current facts** (salary data) in actual web search results rather than raw model knowledge, and label it as an estimate.
- **Reward extra user input, don't require it** — e.g., LinkedIn DM message gets better with optional recruiter context, but works fine without it.
- **Don't over-scope the "wow" feature** — live LaTeX editing was considered and deliberately deferred; a good static HTML/CSS preview + on-demand PDF/`.tex` download gives most of the perceived value for much less engineering risk in a 1-week build.

---

## Open items / not yet decided
- Exact LaTeX template design (need to build one ATS-friendly template from scratch)
- Exact copy/branding, logo, final domain name
- Whether phase-2 features (accounts, red flag scanner, referral message, "why this company" grounded paragraph, live LaTeX editing) get built after MVP validation
- Specific rate-limit numbers and abuse-monitoring tooling details
- Whether cover letter / email outputs also get a "Download as PDF" polish pass or stay plain text/copy for v1

---

## Timeline
Target: MVP shipped and live within ~1 week.
