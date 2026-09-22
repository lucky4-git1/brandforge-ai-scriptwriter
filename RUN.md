# BrandForge AI — Run the MVP

## Prerequisites

1. **Node.js 18+** and npm
2. **Rust** (rustup) — https://rustup.rs
3. **Ollama** — https://ollama.com — then:
   ```bash
   ollama serve
   ollama pull mistral:7b
   ```
4. Optional: **ChromaDB** for enhanced vector memory:
   ```bash
   pip install chromadb
   chroma run --path ./chroma_data
   ```

## Development

```bash
npm install
npm run tauri:dev
```

## Production build

```bash
npm run tauri:build
```

## End-to-end workflow

1. Open **Dashboard** → create/select a brand
2. Enter a topic → **Run full pipeline**
3. Watch real-time progress (trend research → creative direction → ideas → scripts)
4. View saved scripts in **Workspace**
5. Browse **Trends** feed (RSS, Reddit, YouTube signals)
6. **Settings** → switch Ollama models (`qwen3:8b`, `mistral:7b`, `deepseek-r1:8b`, `phi4`)

## Architecture (implemented)

- `src-tauri/src/ai_runtime/` — Ollama, model manager, inference pipeline, GPU detection
- `src-tauri/src/prompt_engine/` — prompt templates
- `src-tauri/src/orchestration/agents/` — Creative Director, Trend Research, Content Ideas, Script Writer, Brand Voice
- `src-tauri/src/orchestration/workflows/` — full content pipeline
- `src-tauri/src/research/` — RSS, Reddit, YouTube, clustering
- `src-tauri/src/storage/` — SQLite + vector fallback (+ ChromaDB when available)
- `src/` — React UI with streaming events via Tauri

Data is stored at: `%APPDATA%\brandforge-ai\brandforge.db`
