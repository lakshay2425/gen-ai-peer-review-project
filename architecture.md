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
- Support for 3 source types: PDF, Plain Text, YouTube Video
- Show Website in the source picker as disabled with “Coming soon”
- Background ingestion pipeline via pg-boss
- Status indicators: pending → indexing → retrying → indexed → failed
- Optimistic TanStack create UX for notebooks and sources
- PDFs stored in MinIO object storage
- Text content stored directly in database
- Chunks + embeddings stored in Qdrant

### Chapter 4 — Query Phase
- Grounded responses via OpenAI
- Every answer includes citations — no answer without a source
- Soft delete filter applied at query time

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
status: enum('active', 'deleted'),
idempotencyKey: varchar,
createdAt, updatedAt
```

### Source Table
```ts
id, notebookId, type: enum('pdf', 'text', 'youtube'),
title, metadata: jsonb, 
indexingStatus: enum('pending', 'indexing', 'retrying', 'indexed', 'failed'),
status: enum('active', 'deleting'),
idempotencyKey: varchar,
createdAt, updatedAt
```

### Idempotency constraints
```ts
unique(userId, idempotencyKey)       // notebooks
unique(notebookId, idempotencyKey)   // sources
```

### Metadata shape per source type
```json
PDF     → { "storageKey": "...", "pageCount": 12, "truncated": false, "indexedCharacterCount": 120000, "indexedChunkCount": 340 }
YouTube → { "videoId": "...", "url": "..." }
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

---

## Engineering Decisions

### 1. Soft Delete Filter on Vector Search
Instead of immediately deleting chunks from Qdrant when a source or notebook is marked 
for deletion, we fetch only active source IDs from Postgres and pass them as a Qdrant 
filter at query time:

```ts
filter: {
  must: [
    { key: 'sourceId', match: { any: activeSourceIds } }
  ]
}
```

This ensures deleted sources never appear in results without requiring synchronous 
cleanup of the vector database. Proper async deletion via pg-boss is planned for 
the next version.

### 2. pg-boss for Background Jobs
Used pg-boss for the ingestion pipeline queue instead of introducing Redis or a 
managed queue service. Reuses the existing Postgres instance — keeps the stack lean.

### 3. OpenAI SDK over Vercel AI SDK
For a custom RAG pipeline with manual prompt construction and citation extraction, 
direct API calls are preferable over abstraction. Full transparency and control 
over every step of the LLM interaction.

### 4. PDF Size Limit — 10MB
PDFs are stored on a self-hosted VPS MinIO instance. 10MB limit enforced on both 
frontend and backend to manage storage constraints responsibly.

### 5. No Streaming (V1)
Streaming skipped in V1 due to time constraints. Can be added later by swapping 
generateText for streamText with minimal restructuring.

### 6. Notebook Isolation via Qdrant Filter
Each notebook maintains its own isolated knowledge base. Isolation is enforced at 
query time by filtering Qdrant results by notebookId — no separate collection per notebook.

### 7. Atomic DB Writes + Job Enqueue (Pattern A now, Pattern B later)
Source create / confirm / reindex / delete paths must keep Postgres row changes and
pg-boss job enqueue atomic — either both commit or both roll back.

**V1 decision: Pattern A — single Postgres transaction with pg-boss `db` adapter**

```ts
import { fromDrizzle } from 'pg-boss'
import { sql } from 'drizzle-orm'

await db.transaction(async (tx) => {
  // 1. business write (insert/update source)
  await tx.insert(sources).values(...)

  // 2. enqueue job on the same connection/transaction
  await boss.send('index-pdf', { sourceId }, { db: fromDrizzle(tx, sql) })
})
```

Why Pattern A for now:
- Official pg-boss support via `fromDrizzle(tx, sql)` (works with our `postgres-js` driver)
- Immediate availability of the job after commit (no dispatcher lag)
- No extra outbox table or poller process required for V1
- Safe when workers remain idempotent and re-check source ownership/status

**Future migration: Pattern B — transactional outbox**

Write source row + outbox event in one transaction; a cron/interval dispatcher later
reads undelivered outbox rows and calls `boss.send`. Delay is acceptable, but requires
a dedicated dispatcher, idempotency keys, and `FOR UPDATE SKIP LOCKED` multi-worker safety.

Migration path is intentional: start with Pattern A, then switch enqueue call sites to
outbox publishing when we have time to harden reliability and multi-service boundaries.

### 8. MVP Indexing UX, Idempotency, and Limits
- TanStack Query optimistic create/rollback for notebooks and sources
- Source panel shows progress via 3s polling; no blocking indexing modal
- Chat input disabled until at least one active source is `indexed`
- Persist scoped idempotency keys for notebooks and sources
- Cap PDF extraction at 2M characters / 4,000 chunks; batch upserts of 100
- Run indexing workers with `npm run worker`

---

## Reusable Skill Files Used
- `integrate-auth-service-in-nextjs-project.md` — Auth service integration pattern
- `document-upload-skill.md` — Pre-signed URL file upload workflow

## Future Skill Files (Post Project)
- RAG ingestion pipeline
- Qdrant setup + hybrid search + reranking
- Citation-aware LLM prompting
- YouTube transcript extraction + chunking
- PDF processing + MinIO storage
- Web scraping + chunking pipeline
- Vector DB metadata filtering strategy