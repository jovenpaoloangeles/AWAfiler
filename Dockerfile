FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

COPY tsconfig.json vite.config.ts ./
COPY src/ ./src/

RUN bun run build

ENV PORT=3000
ENV DATABASE_PATH=/app/data/awafiler.db

EXPOSE 3000

RUN mkdir -p /app/data

CMD ["bun", "run", "src/server/index.ts"]
