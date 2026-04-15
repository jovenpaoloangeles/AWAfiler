# AWAfiler

Track and generate remote work (AWA) accomplishment reports.

## Bakit

Extra Work pa kasi so ganito na lang
contri kayo please
## Quick Start

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and add your Gemini API key
```

### 3. Run in development

```bash
# Terminal 1 — API server
bun run dev

# Terminal 2 — Vite dev server (hot reload)
bun run dev:client
```

Open [http://localhost:5173](http://localhost:5173).

### 4. Run in production

```bash
bun run build
bun run start
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

```bash
cp .env.example .env
# Edit .env and add your Gemini API key

docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database persists in a Docker volume (`awafiler-data`).

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | — | Google Gemini API key (required for AI features) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model to use |
| `PORT` | `3000` | Server port |
| `DATABASE_PATH` | `./data/awafiler.db` | SQLite database file path |
