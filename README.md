# PolarLink

**Integrated Polar Science Outreach, Knowledge Repository and Media Dissemination Portal**

## What this build is

A working prototype of PolarLink: a public outreach portal for India's four polar research
stations (Maitri, Bharati, Himadri, Himansh), plus a scientist upload flow and an admin
content-review dashboard.

Submissions are shared through a small Vite-dev API (with `localStorage` as a fallback).
AI summaries, captions and tags are generated **locally** by Gemma 4 via Ollama from the
file the scientist uploads. Nothing is sent to a cloud AI service.

## Real vs. simulated: read this before a live demo

So nobody on the team gets caught off guard by a judge's follow-up question, here's exactly
what's real and what's simulated in this codebase:

| Feature | Status |
|---|---|
| Landing page, station explorer, module/impact sections | Real, fully interactive UI |
| Upload form (drag/drop, validation, multi-file) | Real UI, no real file storage |
| Upload progress bar | **Simulated**: a timed animation, not an actual transfer |
| AI summary, social caption and tags | **Real**: Gemma 4 (via Ollama, on-device) reads the uploaded file (PDF/DOCX/CSV/XLSX text, or the image itself) and drafts the text. The scientist can edit it before submitting, and an admin approves it before publishing. |
| AI fallback | If the model is unavailable or too slow, a template draft is used and clearly badged **Template fallback (AI offline)** |
| Scientist login | **Simulated auth**: hardcoded demo credentials in `Login.tsx`, checked client-side. **Not secure**, not representative of production auth |
| Admin review dashboard (approve/reject) | Real UI + shared state, persisted via the Vite `/api/submissions` file store (falls back to `localStorage`) |

Badges in the UI show what is real: **Gemma 4 · local** when the model drafted the text,
**Template fallback (AI offline)** when it didn't, and **Simulated** on seed demo rows.
Each AI draft also shows what it was based on (document text, image, table, or metadata only).

**The honest one-liner for Q&A:** *"Login and the upload progress bar are simulated. The AI
drafts are real: Gemma 4 runs on-device through Ollama and reads the file the scientist just
uploaded. A human edits the draft, and an admin approves it before it goes public.
Production would add Firebase Auth and Firestore/Storage, and keep the same
human-in-the-loop review."*

## Tech stack

- React 19 + TypeScript, built with Vite 8
- Tailwind CSS v4 (design tokens in `src/index.css`)
- No external state library, just `useState`/`useEffect`
- Gemma 4 via Ollama (`POST /api/ai/summarize` Vite middleware → `localhost:11434`)
- File extraction: `pdf-parse` (PDF), `mammoth` (DOCX), `xlsx` (XLSX/CSV), `sharp` (images)
- Built with Figma Make

Intended production stack (shown in-app under Features → Data Flow, not implemented here):
Next.js, Firebase Auth, Firestore, Firebase Storage, Cloud Functions, on-device or hosted LLM.

## Quick start

```bash
npm install            # use npm; pnpm-lock.yaml is out of date
cp .env.example .env   # Windows: copy .env.example .env
npm run ai:check       # verifies Ollama + the model respond
npm run dev            # starts the Vite dev server (default http://localhost:8443)
npm run build          # production build
```

> The AI endpoint lives inside the Vite dev/preview server. Run the demo with `npm run dev`
> or `npm run preview` on the machine running Ollama. A static deploy of `dist/` won't have AI.

## Running the AI locally

Gemma 4 must be installed on the demo laptop. No cloud API keys.

1. Install Ollama: https://ollama.com/download
2. Pull a model, **chosen by how much RAM you have**:

| Laptop RAM | Model | Command |
|---|---|---|
| 8 GB | `gemma4:e2b` (recommended) | `ollama pull gemma4:e2b` |
| 16 GB or more | `gemma4:e4b` | `ollama pull gemma4:e4b` |
| Strong GPU / 32 GB+ | `gemma4:26b` or `gemma4:31b` | `ollama pull gemma4:26b` |

3. Set the model in `.env` to match what you pulled, e.g. `GEMMA_MODEL=gemma4:e2b`
   (see `.env.example`; `OLLAMA_URL` defaults to `http://localhost:11434`).
4. Make sure Ollama is running (it usually starts automatically), then run
   `npm run ai:check`. Expect `Ollama OK model=… latency=…ms`.

`npm run ai:check` pings Ollama, confirms the model is installed, sends a one-line test
prompt, and prints latency. It exits non-zero with a short message if something is wrong.

### How the AI step behaves

- **Content is read first.** PDFs and Word files go in as text, CSV/Excel as column stats and
  sample rows, photos as images. Videos, zips and other formats use metadata only, and the
  draft doesn't claim to have read them.
- **Scanned PDFs** (image-only, no extractable text) fall back to metadata only. Demo with a
  text-based PDF.
- **The model is warmed up** when the dev server starts, so the first upload is faster.
  Start the server a few minutes before presenting.
- **If Ollama is stopped or too slow,** the upload still completes with a template draft and
  a visible **Template fallback (AI offline)** badge. The flow never hangs on stage.
- **Regenerate** re-runs the AI on the same file without uploading again.

### Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Status chip says **Ollama not running** | Open the Ollama app, or run `ollama serve`. If it says `address already in use`, Ollama is already running and you can ignore it. |
| Status chip says **model not installed** | Run `ollama pull <model>` and make sure `GEMMA_MODEL` in `.env` matches `ollama list`. Restart `npm run dev` after editing `.env`. |
| **Gemma timed out** / always falls back | The model is too big for the machine. On an 8 GB Mac, `gemma4:e4b` uses about 7 GB, which causes heavy swapping. Switch to `gemma4:e2b`, quit other apps, and retry with a short PDF. |
| Summary says "based on metadata only" for a PDF | The PDF is probably scanned or image-only. Try a PDF where you can select the text. |
| First upload is slow | The model is loading. Wait, then click **Regenerate**. |
| Preview shows old behaviour | Another copy of the project is serving the port. Stop old `npm run dev` windows and run from this folder only. |
| `npm run build` fails with `Permission denied` | Run `chmod +x node_modules/.bin/*`, then retry. |

Tip: check memory in **Activity Monitor → Memory**. If Memory Pressure is yellow or red,
close apps or use a smaller model.

## Project structure

```
src/
  App.tsx              landing page + view routing
  pages/Login.tsx      demo scientist login (hardcoded credentials, see table above)
  pages/Admin.tsx      submission review dashboard + scientist upload portal
  lib/aiSummarize.ts   browser helper for POST /api/ai/summarize
  server/aiPlugin.ts   Vite middleware: extract file content, call Ollama
  index.css            Tailwind v4 theme tokens, global styles, badges
scripts/check-ai.mjs   `npm run ai:check`
.env.example           OLLAMA_URL, GEMMA_MODEL
```

## Demo checklist

- Close heavy apps and extra browser tabs. Start Ollama and `npm run dev` 5-10 minutes early.
- Run `npm run ai:check`, then one test upload, right before you go on.
- Keep two short sample files ready: a text-based PDF and a small JPG.
- Use the **"Demo credentials"** shortcut buttons on the login screen to sign in instantly.
- Refreshing the browser mid-demo won't log you out (session persists for the tab) or lose
  submissions you've approved or rejected (kept in the shared file store / `localStorage`).
- Use **"↺ Reset demo data"** in the admin sidebar to restore the seed submissions before a
  fresh walkthrough.
- Seed submissions still show a **Simulated** badge; new uploads show **Gemma 4 · local**.
- Backup plan: if the AI is slow on stage, the **Template fallback** keeps the flow moving.
  Say so openly. It's by design.