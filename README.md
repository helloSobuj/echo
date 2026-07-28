# Echo — Personal LiveKit Voice Assistant

Monorepo with a Python LiveKit agent backend and a Next.js web UI.

## Architecture

- **Agent** (`agent/`) — Python LiveKit Agents worker (`echo-agent`)
- **Web** (`web/`) — Next.js + Agents UI frontend
- **Transport / models** — LiveKit Cloud (Inference by default; optional BYOK)

## Prerequisites

- [LiveKit CLI](https://docs.livekit.io/reference/developer-tools/livekit-cli/) (`lk`)
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Node.js 20+ and [pnpm](https://pnpm.io/)
- A [LiveKit Cloud](https://cloud.livekit.io/) project (`lk cloud auth`)

## Setup

### 1. Environment files

```powershell
copy agent\.env.example agent\.env.local
copy web\.env.example web\.env.local
```

Fill in both with the same LiveKit credentials from [cloud.livekit.io](https://cloud.livekit.io):

```
LIVEKIT_URL=wss://<your-project>.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

In `web/.env.local` also set:

```
AGENT_NAME=echo-agent
NEXT_PUBLIC_MODEL_MODE=inference
```

### 2. Install dependencies

```powershell
cd agent
uv sync

cd ..\web
pnpm install
```

## Local development (two terminals)

### Terminal 1 — Agent (hot reload)

```powershell
cd agent
lk agent dev
```

Wait until you see `registered worker`.

### Terminal 2 — Web UI

```powershell
cd web
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), click **Start conversation**, allow the microphone, and speak.

### Optional: console mode (agent only)

Fastest way to tune prompts without the browser:

```powershell
cd agent
lk agent console
```

## Model modes

| Mode | Env | Keys needed |
|------|-----|-------------|
| **inference** (default) | `MODEL_MODE=inference` in `agent/.env.local` | LiveKit credentials only |
| **byok** | `MODEL_MODE=byok` | Also `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`, `CARTESIA_API_KEY` |

BYOK is operator-configured on the **agent** process only. Never put provider API keys in `NEXT_PUBLIC_*` or the browser.

Update `NEXT_PUBLIC_MODEL_MODE` in `web/.env.local` so the Settings panel shows the same mode (display only).

## Agent tools

Echo can:

- **save_note** — store a note in `agent/data/notes.json`
- **list_notes** — read saved notes
- **get_current_time** — speak the current local time

Optional user prefs live in `agent/data/profile.json` and are injected into the system prompt.

## Debugging checklist

- `AGENT_NAME=echo-agent` in web env matches `@server.rtc_session(agent_name="echo-agent")` in Python
- Browser microphone permission granted
- `lk agent dev` shows a registered worker before starting a web session
- Fallback: [Agent Console](https://cloud.livekit.io) to verify the agent independently of the UI

## Production deployment

### Deploy the agent to LiveKit Cloud

```powershell
cd agent
lk agent create    # first time only (quota permitting)
# subsequent / when agent already exists:
lk agent deploy --secrets-file .secrets.env
```

Current Cloud agent (project `eco`):

| Field | Value |
|-------|-------|
| Agent ID | `CA_7Pd4WNwgfNQw` |
| Dispatch name | `echo-agent` |
| Region | `ap-south` |
| Config | [`agent/livekit.toml`](agent/livekit.toml) |

Verify with `lk agent status` — Status should be `Running`.

### Deploy the web UI to Vercel

1. Log in once: `vercel login`
2. From the repo:

```powershell
cd web
# Or use the helper (reads web/.env.local):
..\scripts\deploy-web.ps1
```

Or manually:

```powershell
cd web
vercel --prod --yes
```

3. In the Vercel dashboard (Project → Settings → Environment Variables), set:

   | Variable | Value |
   |----------|-------|
   | `LIVEKIT_URL` | your LiveKit URL |
   | `LIVEKIT_API_KEY` | your API key |
   | `LIVEKIT_API_SECRET` | your API secret |
   | `AGENT_NAME` | `echo-agent` |
   | `ALLOW_PUBLIC_TOKEN` | `true` (personal use; add real auth for public apps) |
   | `NEXT_PUBLIC_MODEL_MODE` | `inference` or `byok` |

4. Redeploy after setting env vars if the first deploy missed them.

**Live production URL:** [https://echo-web-tau-ochre.vercel.app](https://echo-web-tau-ochre.vercel.app)
## Project layout

```
echo/
├── agent/                 # Python LiveKit agent
│   ├── src/
│   │   ├── agent.py       # Entrypoint
│   │   ├── assistant.py   # PersonalAssistant + prompt
│   │   ├── config.py      # inference vs BYOK
│   │   └── tools/         # notes + time tools
│   └── data/              # profile + notes
├── web/                   # Next.js frontend
│   ├── app/api/token/     # JWT minting
│   └── components/        # Agents UI
├── .env.example
└── README.md
```

## Docs

- [Voice AI quickstart](https://docs.livekit.io/agents/start/voice-ai/)
- [Agent frontends](https://docs.livekit.io/agents/start/frontend/)
- [Deploy agents](https://docs.livekit.io/agents/ops/deployment/)
