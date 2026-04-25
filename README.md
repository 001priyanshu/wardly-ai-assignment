# Wardly · Pre-Visit Clinical Intake Agent

A chat-based intake assistant that interviews a (simulated) patient and produces a structured **pre-visit clinical brief** — Chief Complaint, History of Present Illness (OPQRST), focused Review of Systems, a red-flag screen, and a non-diagnostic triage impression.

Built with **LangGraph** for the conversation workflow, **Anthropic / OpenAI** behind a provider-abstracted LLM factory, **MongoDB** for persistence + LangGraph checkpointing, **Express** SSE streaming, and **Next.js + Tailwind** for the UI.

---

## Quickstart

```bash
# 1. Configure
cp .env.example .env
# open .env, set ANTHROPIC_API_KEY (or OPENAI_API_KEY + LLM_PROVIDER=openai)

# 2. Run the whole stack
docker compose up --build

# 3. Open the app
open http://localhost:3000
```

| Service        | URL                                                   |
| -------------- | ----------------------------------------------------- |
| Frontend (Next)| http://localhost:3000                                 |
| Backend (API)  | http://localhost:4000  ·  health: `/api/health`       |
| MongoDB        | `mongodb://localhost:27017/wardly_intake`             |

To stop: `docker compose down`. To wipe data: `docker compose down -v`.

---

## Environment variables

All variables are read by `docker-compose.yml` from a root `.env` file. `.env.example` ships with sane defaults; only the LLM key is required to actually run an intake.

### LLM (required)

| Variable            | Default                | Notes                                                                                |
| ------------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| `LLM_PROVIDER`      | `anthropic`            | `anthropic` or `openai`. Switch providers without touching code.                     |
| `ANTHROPIC_API_KEY` | —                      | Required when `LLM_PROVIDER=anthropic`.                                              |
| `ANTHROPIC_MODEL`   | `claude-sonnet-4-6`    | Override if your account uses a different Claude model.                              |
| `OPENAI_API_KEY`    | —                      | Required when `LLM_PROVIDER=openai`.                                                 |
| `OPENAI_MODEL`      | `gpt-4o`               | Override to pick a specific OpenAI model.                                            |

### Server

| Variable        | Default                  | Notes                                                                          |
| --------------- | ------------------------ | ------------------------------------------------------------------------------ |
| `CORS_ORIGIN`   | `http://localhost:3000`  | Comma-separated list of allowed browser origins.                               |
| `TURN_CAP`      | `40`                     | Hard ceiling on conversation turns; the server force-finalizes past this.      |
| `LOG_LEVEL`     | `info`                   | `fatal | error | warn | info | debug | trace` (pino).                          |

### Frontend (build-time)

| Variable                | Default                  | Notes                                                                |
| ----------------------- | ------------------------ | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE`  | `http://localhost:4000`  | Baked at build time. The browser fetches the backend at this origin. |

---

## Conversation flow

The intake is driven by a LangGraph workflow with one node per clinical phase. Each user message advances the graph by one super-step. State is checkpointed to MongoDB on every step, so refreshing the page or restarting the backend resumes mid-conversation cleanly.

```
                        ┌────────────────────────────────┐
                        │           START                 │
                        │  (router on state.phase)        │
                        └────────────────────────────────┘
                                       │
       ┌──────────┬──────────┬─────────┼────────┬────────────┬────────────┬──────────┐
       ▼          ▼          ▼         ▼        ▼            ▼            ▼          ▼
   ┌──────┐  ┌────────┐  ┌──────┐  ┌─────┐  ┌─────┐  ┌────────────┐  ┌────────┐  ┌────────┐
   │greet │→ │identify│→ │  cc  │→ │ hpi │→ │ ros │→ │ redFlags   │→ │readBack│→ │finalize│ → END
   └──────┘  └────────┘  └──────┘  └─────┘  └─────┘  └────────────┘  └────────┘  └────────┘
                  ▲                                                       │
                  └───────────────── correction loop ─────────────────────┘
```

| Phase       | What the assistant does                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| `greet`     | Warm intro; asks for name and DOB.                                                                                      |
| `identify`  | Captures name/DOB. **If only one was given, asks specifically for the missing piece** before moving on.                 |
| `cc`        | Mirrors the chief complaint, classifies it into a clinical category, picks ROS targets and the red-flag rule set.       |
| `hpi`       | OPQRST drill-down: onset, provocation/palliation, quality, region/radiation, severity, timing, associated symptoms.     |
| `ros`       | Focused ROS — only systems pertinent to the CC. Captures explicit pertinent positives **AND** negatives.                |
| `redFlags`  | Walks the category-specific safety screen (always includes a suicidal-ideation screen). Triggers in-chat escalation.    |
| `readBack`  | Summarises everything and asks for an explicit acknowledgment. **If the patient corrects, re-summarises the updated picture and asks again.** |
| `finalize`  | One structured-output call against the JSON schema with the full transcript → produces the brief → renders markdown.    |

**Termination:** patient acknowledges the read-back → auto-finalize → redirect to the brief view. Hard turn cap (`TURN_CAP`) forces finalize as a safety net.

---

## What the brief contains

| Section                | Content                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Patient**            | Self-reported name + DOB (never validated against any record).                                                   |
| **Chief Complaint**    | Patient's own words + duration + clinical category.                                                              |
| **HPI**                | Explicit OPQRST slots, associated symptoms, modifying factors, prior episodes, current meds — **plus a 2–4 sentence clinician-style HPI prose narrative**. |
| **ROS (focused)**      | Only systems pertinent to the CC. Pertinent **positives** (what the patient endorsed) AND pertinent **negatives** ("denies …") because clinicians want both. |
| **Red-Flag Screen**    | Each safety question asked, with `present`, optional detail, and `escalationAdvised`.                            |
| **Triage Impression**  | `acuityHint` (routine / soon / urgent / emergent), one-sentence rationale grounded only in observations, suggested next step. **Explicitly not a diagnosis.** |
| **Patient Confirmation** | The summary read back to the patient and whether they confirmed it (plus any corrections raised).              |

The markdown is rendered deterministically from the JSON in [`briefRenderer.ts`](backend/src/intake/clinical/briefRenderer.ts) — never asked from the LLM, so the JSON and markdown can never drift.

---

## Demo personas

### A — "Maria, 47, chest discomfort" (cardiovascular)

1. http://localhost:3000 → **Start a new intake**.
2. `Maria Lopez, March 12 1978`.
3. CC: `I've had this pressure in my chest since yesterday morning.`
4. Answer the OPQRST follow-ups: started yesterday, worse with stairs, better with rest, feels like pressure, in the centre of the chest, **radiates to the left arm**, ~6/10, intermittent 5–10 min episodes.
5. Associated symptoms: `mild shortness of breath, no nausea, no sweating`.
6. Focused ROS asks Cardiovascular + Respiratory + Constitutional only. Red-flag screen covers radiation, syncope, severe dyspnea, prior cardiac history, plus the always-on SI screen.
7. Acknowledge the read-back → brief is generated automatically.

Expected brief spot-checks:
- `chiefComplaint.statement` ≈ "Chest pressure since yesterday morning"
- `hpi.narrative` reads like a real clinician HPI paragraph with all OPQRST elements
- `ros` includes Cardiovascular & Respiratory entries with both positives **and** negatives ("denies …")
- `redFlagScreen` has at least four entries; "radiation to arm" `present: true`, `escalationAdvised: true`
- `triageImpression.acuityHint` is `urgent` or `emergent` with a rationale grounded only in observations

### B — "Jamie, 22, low mood + sleep" (psychiatric)

Confirms the ROS focus shifts to Psychiatric/Neurological and the SI/HI red-flag screen fires. Try once with `LLM_PROVIDER=anthropic`, once with `LLM_PROVIDER=openai` — the briefs should differ in phrasing but match in structure.

### Failure modes worth poking

- **Refresh mid-stream** → the page reloads and the conversation resumes via the LangGraph checkpointer.
- **Force finalize early** → `curl -X POST -H "x-uid: <your uid>" http://localhost:4000/api/sessions/<id>/finalize` produces a brief that's mostly nulls but valid against the schema, with `meta.warnings` flagging that it was incomplete.
- **Patient gives only their name** → assistant comes back and asks specifically for DOB before moving on.
- **Patient corrects the read-back** → assistant produces an updated summary that incorporates the correction and asks again.

---

## API

| Method | Path                                | Purpose                                                                              |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------ |
| `GET`  | `/api/health`                       | Liveness — pings Mongo, verifies the active LLM key is configured.                   |
| `POST` | `/api/sessions`                     | Start a new intake. Returns `{ sessionId }`.                                         |
| `GET`  | `/api/sessions`                     | List intakes for the current browser uid (`x-uid` header / cookie).                  |
| `GET`  | `/api/sessions/:id`                 | Session detail + transcript + brief (if any).                                        |
| `GET`  | `/api/sessions/:id/brief`           | `{ markdown, json }`.                                                                |
| `POST` | `/api/sessions/:id/messages`        | **SSE.** Body `{ content }`. Streams assistant tokens; emits phase + brief on done.  |
| `POST` | `/api/sessions/:id/finalize`        | Force brief generation. Idempotent.                                                  |

### SSE events (`/messages`)

| Event               | Data                                      | Meaning                                              |
| ------------------- | ----------------------------------------- | ---------------------------------------------------- |
| `token`             | `{ text }`                                | Assistant text chunk; append to streaming bubble.    |
| `phase`             | `{ phase, turnCount }`                    | Phase advance signal for the UI stepper.             |
| `assistant-message` | `{ content, messageId }`                  | Full assistant text after streaming completes.       |
| `done`              | `{ phase, finalized, brief? }`            | Terminal frame. If `finalized: true`, `brief` carries `{ markdown, json }`. |
| `error`             | `{ message }`                             | Non-fatal stream error.                              |

---

## Repo layout

```
.
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/                                  # Node.js + TypeScript + Express
│   └── src/
│       ├── intake/
│       │   ├── graph.ts                      # LangGraph StateGraph
│       │   ├── state.ts                      # IntakeState (Annotation API)
│       │   ├── routing.ts                    # entry router on state.phase
│       │   ├── checkpointer.ts               # MongoDB LangGraph saver
│       │   ├── nodes/                        # one node per clinical phase
│       │   ├── prompts/                      # persona, per-phase, finalize-extraction
│       │   └── clinical/
│       │       ├── ccSystemMap.ts            # CC text → category → focused ROS systems
│       │       ├── redFlagRules.ts           # category → safety questions
│       │       └── briefRenderer.ts          # ClinicalBrief JSON → clinician markdown
│       ├── llm/factory.ts                    # provider switch (Anthropic | OpenAI)
│       ├── routes/                           # sessions, messages (SSE), health
│       ├── shared/                           # zod schema + transport types (single source of truth)
│       └── tests/                            # vitest smoke coverage
└── frontend/                                 # Next.js (App Router) + Tailwind
    └── src/
        ├── app/
        │   ├── page.tsx                              # landing
        │   ├── chat/[sessionId]/page.tsx             # chat UI w/ SSE
        │   ├── sessions/page.tsx                     # dashboard / history
        │   ├── sessions/[id]/page.tsx                # brief view
        │   └── sessions/[id]/transcript/page.tsx     # read-only transcript
        ├── components/                       # ChatComposer, MessageList, PhaseStepper, BriefView
        └── lib/                              # api client, SSE consumer, anonymous uid, types
```

---

## Local development (without Docker)

```bash
# Mongo
docker run -d --rm -p 27017:27017 --name wardly-mongo mongo:7

# Backend (in one shell)
cd backend
cp ../.env.example .env
# in backend/.env, set MONGODB_URI=mongodb://localhost:27017
npm install
npm run dev          # http://localhost:4000

# Frontend (in another shell)
cd frontend
npm install
NEXT_PUBLIC_API_BASE=http://localhost:4000 npm run dev   # http://localhost:3000
```

---

## Tests

```bash
cd backend
npm test
```

22 vitest smoke tests covering:
- Brief markdown rendering (CC, OPQRST table, "denies …" pertinent negatives, escalation marking, triage section, no provider leakage, paragraph-break hygiene).
- Negation normalisation (`"no fever"` → `"denies fever"`, no double-negation).
- CC classification and focused-ROS system selection.
- Red-flag rule loading per category, always-on SI screen.
- Zod brief schema acceptance/rejection.

---

## Design notes (the "whys")

- **Why LangGraph?** Pre-visit intake genuinely is a phased clinical workflow with conditional branches (CC drives ROS focus; red-flag escalation can short-circuit). LangGraph encodes that as data, gives us free MongoDB checkpointing, and leaves a clean seam for adding specialist sub-flows later. We do **not** use LangChain agent abstractions, retrievers, or any heavier primitives — just the graph and structured-output building blocks.
- **One end-of-conversation extraction, not per-turn snapshots.** Earlier drafts ran a snapshot-extraction LLM call after every turn. Dropped — it doubled cost per turn and added a second schema to maintain. The LLM has the full transcript at finalize time and produces a richer, more coherent brief in one go. CC classification is deterministic (keyword-based) so the focused-ROS / red-flag selection still adapts mid-conversation without an extra call.
- **Markdown is rendered from JSON, not requested from the LLM.** Asking the model for both invites drift. The renderer is ~150 lines and produces a clinician-friendly note that prints cleanly. JSON is the source of truth.
- **Triage impression is intentionally not a diagnosis.** The model is instructed to ground its rationale only in observations and to use an acuity hint, not a disease name.
- **No auth.** Demo scope. Sessions are scoped to an anonymous browser uid (header `x-uid`, mirrored to a cookie). Real auth is a clean add later.

---

## What's deliberately out of scope

- **Auth** and multi-tenant clinic deployments.
- **HIPAA-grade security** beyond an in-brief disclaimer.
- **Real EHR integration** / DOB validation.
- **LangSmith / OpenTelemetry** observability.
- **CI/CD** pipeline.
- **Comprehensive automated test suite** beyond the smoke layer.
