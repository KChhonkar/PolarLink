# PolarLink — SIH 2026 · PS-26063

**Integrated Polar Science Outreach, Knowledge Repository and Media Dissemination Portal**
Problem Statement PS-26063 · Ministry of Earth Sciences (MoES) / NCPOR
Team of 6 · Bennett University · Smart India Hackathon 2026 — Internal Screening

## What this build is

A high-fidelity **front-end prototype** demonstrating the intended user experience of PolarLink:
a public outreach portal for India's four polar research stations (Maitri, Bharati, Himadri,
Himansh), plus a scientist upload flow and an admin content-review dashboard.

This build is presentation-ready. Submissions are persisted through a small Vite-dev API
(or `localStorage` as fallback). AI drafts are generated **locally** by Gemma 4 via Ollama.

## Real vs. simulated — read this before a live demo

So nobody on the team gets caught off guard by a judge's follow-up question, here's exactly
what's real and what's simulated in this codebase:

| Feature | Status |
|---|---|
| Landing page, station explorer, module/impact sections | Real, fully interactive UI |
| Upload form (drag/drop, validation, multi-file) | Real UI, no real file storage |
| Upload progress bar | **Simulated** — a timed animation, not an actual transfer |
| AI summary & social caption generation | **Real** — Gemma 4 (via Ollama, runs locally) reads the uploaded file (PDF/DOCX/CSV/XLSX text, or the image itself) and generates the summary, caption and tags. Scientist reviews/edits before submit; admin approves before publishing. |
| Scientist login | **Simulated auth** — hardcoded demo credentials in `Login.tsx`, checked client-side. **Not secure**, not representative of production auth |
| Admin review dashboard (approve/reject) | Real UI + shared local state, persisted via the Vite `/api/submissions` file store (falls back to `localStorage`) |

Every place this matters in the UI now carries a small **"Simulated" / "Demo Mode" badge**
(or a **Gemma 4 · local** badge when the model actually drafted the text)
so it's transparent in front of judges, not just in the code.

**The honest one-liner for Q&A:** *"This is a high-fidelity prototype of the full product
experience. Login is simulated; the AI drafts are real and generated on-device by Gemma 4
via Ollama from the file the scientist just uploaded. Production would add Firebase Auth,
Firestore/Storage, and keep the same human-in-the-loop review."*

## Tech stack

- React 19 + TypeScript, built with Vite 8
- Tailwind CSS v4 (design tokens in `src/index.css`)
- No external state library — plain `useState`/`useEffect`
- Gemma 4 via Ollama (`POST /api/ai/summarize` Vite middleware → `localhost:11434`)
- Built with Figma Make

Intended production stack (shown in-app under Features → Data Flow, not implemented here):
Next.js, Firebase Auth, Firestore, Firebase Storage, Cloud Functions, on-device or hosted LLM.

## Running locally

```bash
npm install   # or pnpm install
npm run dev   # starts Vite dev server
npm run build # production build
```

## Running the AI locally

Gemma 4 must be installed on the demo laptop. No cloud API keys.

```bash
# 1. Install Ollama: https://ollama.com/download
# 2. Pull the model (e4b = best speed/quality for a laptop; use 26b or 31b only if you have a strong GPU)
ollama pull gemma4:e4b
# 3. Make sure Ollama is running (it usually starts automatically), then:
npm install
npm run ai:check     # verifies the model responds
npm run dev
```

If the demo machine is weak, set `GEMMA_MODEL=gemma4:e2b` in `.env` (see `.env.example`).

`npm run ai:check` pings Ollama, confirms the model is installed, sends a one-line test
prompt, and prints latency. It exits non-zero with a short message if Ollama is down.

The first upload after a cold start can take 5–40 s while the model loads. Vite fires a
non-blocking warm-up on `npm run dev` so the demo path stays snappy. If Ollama is stopped,
uploads still complete with a visible **Template fallback (AI offline)** badge — the flow
never hangs on stage.

## Project structure

```
src/
  App.tsx              — landing page + view routing
  pages/Login.tsx      — demo scientist login (hardcoded credentials — see table above)
  pages/Admin.tsx      — submission review dashboard + scientist upload portal
  lib/aiSummarize.ts   — browser helper for POST /api/ai/summarize
  server/aiPlugin.ts   — Vite middleware: extract file content, call Ollama
  index.css            — Tailwind v4 theme tokens, global styles, badges
scripts/check-ai.mjs   — `npm run ai:check`
```

## Demo tips

- Use the **"Demo credentials"** shortcut buttons on the login screen to sign in instantly.
- Refreshing the browser mid-demo won't log you out (session persists for the tab) or lose
  any submissions you've approved/rejected (persisted in the shared file store / `localStorage`).
- Use **"↺ Reset demo data"** in the admin sidebar to restore the original seed submissions
  before a fresh walkthrough or rehearsal.
- Seed submissions in the queue still show a **Simulated** badge; new uploads show **Gemma 4 · local**.
