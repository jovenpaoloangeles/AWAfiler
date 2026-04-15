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
# Terminal 1 — API server
bun run dev

# Terminal 2 — Vite dev server (hot reload)
bun run dev:client
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
