# AWAfiler

Track and generate remote work (AWA) accomplishment reports.

## Bakit

what if ganito na lang

contri kayo please

## Quick Start

### Recommended: Docker (no Bun needed)

If you just want it running and don't care about installing runtimes:

1. Make sure you have [Docker](https://docs.docker.com/get-docker/) installed
2. Get a [Google Gemini API key](https://aistudio.google.com/apikey)
3. Run:

```bash
cp .env.example .env
# Edit .env and add your Gemini API key

docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database persists in a Docker volume (`awafiler-data`).

### From source

If you want to hack on it or run without Docker:

#### 1. Prerequisites

- [Bun](https://bun.sh/) — runtime & package manager
- A [Google Gemini API key](https://aistudio.google.com/apikey) — for AI-assisted report generation

#### 2. Install dependencies

```bash
bun install
```

#### 3. Set up environment

```bash
cp .env.example .env
```

Then open `.env` and fill in your Gemini API key:

```
GEMINI_API_KEY=your-key-here
```

The rest of the variables have sensible defaults — you only need to change them if you know what you're doing.

#### 4. Run in development

```bash
# Terminal 1 — Vite dev server (hot reload)
bun run dev

# Terminal 2 — (optional) ERP sync server — see ERP Sync section below
bun run dev:server
```

Open [http://localhost:5173](http://localhost:5173).

#### 5. Run in production

```bash
bun run build
bun run start
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | — | Google Gemini API key (required for AI features) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model to use |
| `PORT` | `3000` | Server port |
| `DATABASE_PATH` | `./data/awafiler.db` | SQLite database file path |
| `VITE_ERP_ENABLED` | `false` | Set to `"true"` to show the ERP sync button (local only) |

---

## ERP Sync (Local / Self-Hosted Only)

> This feature is **hidden on the public GitHub Pages site** (`jovenpaoloangeles.github.io/AWAfiler`).
> It only appears when you run the app locally with `VITE_ERP_ENABLED=true`.

The ERP sync button lets you pull your approved and pending pass slips from
`erp.asti.dost.gov.ph` directly into AWAfiler as draft entries.

### Why it can't work on GitHub Pages

- The ERP is only reachable from the ASTI office network or over the VPN
- Browser security (same-origin policy) blocks `jovenpaoloangeles.github.io`
  from reading responses from a different origin — there is no workaround for this
- Your ERP credentials must never pass through a shared server

### Requirements

- Machine connected to the ASTI network or VPN
- [Bun](https://bun.sh/) installed
- `VITE_ERP_ENABLED=true` in your `.env`

### Setup

**1. Copy and edit the env file**

```bash
cp .env.example .env
```

Set these two values in `.env`:

```
VITE_ERP_ENABLED=true
```

**2. Start both servers (two terminals)**

```bash
# Terminal 1 — ERP sync API server (must be on VPN)
bun run dev:server

# Terminal 2 — Vite dev client
bun run dev
```

**3. Set your ERP username**

Open [http://localhost:5173](http://localhost:5173) → Settings → fill in **ERP Username**.

**4. Sync**

Click **Sync ERP** in the calendar header → enter your ERP password → click Sync.
Pass slips for the current payroll period are imported as draft entries.
Your password is never stored — it is used once for this request only.

### Docker

The Docker image runs the Bun server which handles both the frontend and
the ERP sync endpoint. The ERP button is visible when `VITE_ERP_ENABLED=true`
is passed at build time:

```bash
VITE_ERP_ENABLED=true docker compose up -d
```

> Make sure the Docker host is on the VPN — the container needs to reach
> `erp.asti.dost.gov.ph` directly.
