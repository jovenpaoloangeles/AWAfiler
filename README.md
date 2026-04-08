# AWAfiler

Track and generate remote work (AWA) accomplishment reports with AI-powered text assistance.

## Features

- **Calendar View** — Visualize AWA entries by month with color-coded status (draft/finalized)
- **Table View** — Search, filter, and manage entries in a data table with copy-to-clipboard
- **AI Assist** — Gemini-powered text generation to expand, revise, and generate work assignments
- **Context Library** — Upload reference documents (PDF, DOCX, TXT) to ground AI responses
- **Dark Mode** — System-aware theme with manual toggle
- **Docker Ready** — Single-command containerized deployment

## Tech Stack

- **Runtime:** Bun
- **Frontend:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend:** Bun HTTP server, SQLite (WAL mode)
- **AI:** Google Gemini 2.5 Flash (streaming SSE)

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

## Project Structure

```
src/
├── server/
│   ├── index.ts          # Bun HTTP server + static file serving
│   ├── db.ts             # SQLite schema, migrations, seed
│   ├── ai.ts             # Gemini client + prompt builder
│   └── routes/
│       ├── entries.ts    # Entry CRUD API
│       ├── profile.ts    # Profile API
│       ├── ai.ts         # AI streaming endpoints (SSE)
│       └── context-docs.ts  # Context document upload/management
└── client/
    ├── main.tsx          # React entry point
    ├── index.css         # Tailwind + shadcn theme variables
    ├── lib/
    │   └── api.ts        # Typed API client
    ├── hooks/
    │   ├── use-entries.ts    # Entry CRUD hooks
    │   └── use-ai-stream.ts  # SSE streaming hook
    └── components/
        ├── calendar-view.tsx     # Month calendar grid
        ├── table-view.tsx        # Data table with filters
        ├── entry-form.tsx        # Create/edit entry sheet
        ├── ai-assist-button.tsx  # Inline AI generation
        ├── context-library.tsx   # Document upload management
        ├── sidebar.tsx           # Navigation sidebar
        ├── settings.tsx          # Profile + AI config
        ├── theme-provider.tsx    # Dark/light theme context
        └── ui/                   # shadcn components
```
