# Changelog

## [Unreleased] - 2026-04-08

### Added

#### AI Generation Features
- **Generate Accomplishments** — AI generates accomplishments based on work assignment + expected output, using past entries for style matching
- **Generate Work Assignment** — AI suggests work assignments based on profile and past entries (no input required)
- **Expand Assignment** — AI expands brief assignment ideas into fuller descriptions
- All AI prompts now use past entries (last 30 days) + profile + context documents for contextual generation

#### UI Components
- `AIGenerateButton` — Button for generating accomplishments from work assignment + expected output
- `AIGenerateAssignmentButton` — Button for generating work assignments from past entries context
- Both buttons stream AI responses with accept/discard/retry actions

### Changed

#### Docker Configuration
- Changed port mapping from `3000:3000` to `3456:3000` to avoid conflicts
- Added `NODE_ENV=production` environment variable to enable production mode
- Server now serves built static files instead of redirecting to Vite dev server

#### AI Prompts
- All AI prompts revised for concise, natural output (less robotic)
- Emphasis on factual, direct language over fluff and buzzwords
- Prompts now reference both work assignment AND expected output for better context

#### Cleaned Up
- Removed dead `generate-assignment` mode that had no UI exposure (re-added with proper implementation)

### Deployment

```bash
make prod    # Full rebuild and start
# or
make rebuild && make up
```
