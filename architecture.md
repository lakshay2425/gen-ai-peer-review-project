# NotebookLM Clone — Architecture & Engineering Decisions

## Project Overview
An AI-powered research assistant inspired by Gemini Notebook LM. Users can create notebooks,
upload multiple knowledge sources, ask questions grounded in those sources, and receive 
answers with proper citations. Built as part of GenAI cohort assignment under a 
36-hour time constraint.

---

## Project Breakdown

### Chapter 1 — Foundation
- Next.js project initialization from personal boilerplate
- Drizzle ORM setup with Postgres
- Docker Compose for local dev (Postgres, Qdrant, MinIO)
- Auth service integration via custom skill file

### Chapter 2 — Notebook Management
- Create, rename and delete notebooks
- Dashboard UI to list all notebooks
- Notebook specific page with sources panel (left) and chat panel (right)
- DB model for notebook

### Chapter 3 — Indexing Phase
- Support for 4 source types: PDF, Plain Text, YouTube Video, Website URL
- Background ingestion pipeline via pg-boss
- Status indicators: pending → indexing → indexed → failed
- PDFs stored in MinIO object storage
- Text content stored directly in database
- Chunks + embeddings stored in Qdrant

### Chapter 4 — Query Phase
- Grounded responses via OpenAI
- Every answer includes citations — no answer without a source
- Soft delete filter applied at query time (see Engineering Decisions)

### Chapter 5 — Citation Viewer
- Click citation → three panel layout
- PDF opens at exact page via presigned URL with #page=N
- YouTube opens at exact timestamp via embed with ?start={seconds}
- Website rendered in iframe with fallback to new tab
- Text shows highlighted relevant chunk

### Chapter 6 — Deployment
- VPS deployment with Docker Compose
- Postgres → Neon/Supabase (production)
- Qdrant → Qdrant Cloud (production)
- MinIO → self-hosted VPS instance (production)

---

## Tech Stack

| Tech | Reason |
|---|---|
| Next.js (App Router) | Full-stack in one repo, clean API routes and layouts |
| Drizzle ORM | Type-safe, lightweight, pairs perfectly with Postgres |
| Postgres | Reliable relational DB for notebooks, sources and chat history |
| pg-boss | Job queue built on Postgres — no extra service like Redis needed |
| Qdrant | Purpose-built vector DB with metadata filtering for notebook isolation |
| MinIO | S3-compatible self-hosted object storage for PDFs |
| OpenAI Embeddings | text-embedding-3-small — cost effective and high quality |
| GPT-4o-mini | Fast and affordable for grounded RAG responses |
| OpenAI SDK | Direct API calls preferred over Vercel AI SDK abstraction for custom RAG pipeline |
| Docker Compose | Single command spins up entire local dev environment |

---

## Environments

| Service | Development | Production |
|---|---|---|
| Postgres | Docker container | Neon / Supabase |
| Qdrant | Docker container | Qdrant Cloud |
| MinIO | Docker container | Personal VPS instance |

Two environment files:
- `.env.development` → local Docker services
- `.env.production` → managed cloud services

---

## Database Schema

### Notebook Table
```ts
id, userId, title, 
status: enum('active', 'deleting'),
createdAt, updatedAt
```

### Source Table
```ts
id, notebookId, type: enum('pdf', 'text', 'youtube', 'website'),
title, metadata: jsonb, 
indexingStatus: enum('pending', 'indexing', 'indexed', 'failed'),
status: enum('active', 'deleting'),
createdAt, updatedAt
```

### Metadata shape per source type
```json
PDF     → { "storageKey": "...", "pageCount": 12 }
YouTube → { "videoId": "...", "url": "..." }
Website → { "url": "..." }
Text    → { "content": "..." }
```

---

## Qdrant Chunk Payload
```json
{
  "notebookId": "...",
  "sourceId": "...",
  "sourceType": "pdf",
  "chunkIndex": 3,
  "content": "...",
  "metadata": {
    "pageNumber": 4,
    "startTime": 142,
    "url": "https://..."
  }
}
```

---
