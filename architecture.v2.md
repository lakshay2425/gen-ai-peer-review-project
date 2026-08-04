# NotebookLM Clone — Architecture v2 (Production-Grade Reference)

> **Purpose of this document**
>
> This file captures the hardened, production-grade indexing architecture and known
> correctness concerns discovered during design review. It is intentionally separate
> from `architecture.md`, which remains the MVP/assessment shipping guide.
>
> **Ship MVP first. Iterate using this document later.**

---

## MVP vs V2 Scope

| Area | MVP (`architecture.md`) | V2 (this document) |
|---|---|---|
| Source types | PDF, text, YouTube | Same + website when ready |
| Queue atomicity | Pattern A acceptable | Pattern A required correctly; Pattern B later |
| PDF processing | Buffer or temp file, basic caps | Streaming download, explicit truncation metadata |
| YouTube chunking | Basic transcript grouping | Single-level grouping, no timestamp drift |
| Qdrant setup | Create collection on first use | Initialize-or-validate + payload indexes |
| Race protection | Status checks at job start | Version fencing + singleton keys + idempotency |
| Retry UX | `pending/indexing/indexed/failed` | Add `retrying` with correct terminal handling |
| Upload flow | Presigned URL + confirm | Presigned POST policy + `statObject` verification |

---

## Chapter 3 — Indexing Phase (V2 Target)

### Supported source types
- `pdf`
- `text`
- `youtube`
- `website` → UI only, disabled with **“Coming soon”** (no backend route)

### Status model

#### Source lifecycle
```ts
status: enum('active', 'deleting')
```

#### Indexing lifecycle
```ts
indexingStatus: enum('pending', 'indexing', 'retrying', 'indexed', 'failed')
```

Frontend polling (3s):
- `pending` → spinner
- `indexing` → yellow
- `retrying` → orange + attempt info
- `indexed` → green, stop polling
- `failed` → red + re-index CTA, stop polling

---

## Database Schema (Drizzle)

### `sources` table
```ts
id: uuid pk
notebookId: uuid fk -> notebooks.id
type: enum('pdf', 'text', 'youtube')
title: varchar
metadata: jsonb
indexingStatus: enum('pending', 'indexing', 'retrying', 'indexed', 'failed')
status: enum('active', 'deleting')
indexVersion: integer default(0) not null
idempotencyKey: varchar(255) nullable
createdAt: timestamp defaultNow
updatedAt: timestamp defaultNow + $onUpdate(() => new Date())
```

### Indexes / constraints
```ts
unique(notebookId, idempotencyKey)  // scoped idempotency
index(notebookId, status)
index(notebookId, indexingStatus)
```

### Metadata shapes
```json
PDF     → { "storageKey": "notebooks/{notebookId}/{sourceId}.pdf", "pageCount": 12, "truncated": false, "indexedCharacterCount": 120000, "indexedChunkCount": 340 }
YouTube → { "videoId": "...", "url": "..." }
Text    → { "content": "..." }
```

### Drizzle conventions
- Always destructure `returning()`:
  ```ts
  const [source] = await db.insert(sources).values(...).returning()
  ```
- Use `$onUpdate(() => new Date())` on `updatedAt`
- Never trust client-passed `userId`; resolve from auth token

---

## Ownership & Authorization

Every source/notebook query must enforce:

```ts
where:
  notebooks.id = notebookId
  notebooks.userId = currentUserId
  notebooks.status = 'active'
  sources.status = 'active'          // for active-source reads/mutations
  sources.id = sourceId              // when fetching a specific source
```

Apply to:
- list sources
- get source status
- create text/youtube source
- PDF init/confirm
- reindex
- delete

Extend `PROTECTED_API_ROUTES` and `proxy.ts` matcher for all `/api/notebooks/**` routes.

MinIO webhook (if used) must use shared secret auth, not JWT.

---

## API Routes

```
GET    /api/notebooks/[notebookId]/sources
POST   /api/notebooks/[notebookId]/sources/text
POST   /api/notebooks/[notebookId]/sources/youtube
POST   /api/notebooks/[notebookId]/sources/pdf/init
POST   /api/notebooks/[notebookId]/sources/pdf/confirm
DELETE /api/notebooks/[notebookId]/sources/[sourceId]
POST   /api/notebooks/[notebookId]/sources/[sourceId]/reindex
GET    /api/notebooks/[notebookId]/sources/[sourceId]/status
```

### Reindex guard (sync + async)
Before queueing reindex:
- fetch source with ownership filters
- if `status === 'deleting'` → return `409`, do not enqueue

In worker at start:
- re-fetch with same filters
- if missing or `deleting` → exit early (no Qdrant writes)

---

## MinIO PDF Upload (Production Flow)

Use **presigned POST policy**, not plain presigned PUT.

Why:
- POST policy can enforce exact key, MIME type, and content-length range
- PUT cannot enforce max size at policy level

### Init
1. Authenticate user
2. Validate notebook ownership
3. Validate `mime_type`, `file_size <= 10MB`
4. Insert pending PDF source
5. Return `postURL` + signed `formData` fields

### Browser upload
- Direct multipart POST to MinIO
- No app cookies/auth on storage origin

### Confirm
1. Re-check ownership
2. `statObject` on `storageKey`
3. Verify object exists, size <= 10MB, expected type
4. Enqueue `index-pdf` only after verification

Reference: `.skills/document-upload-skill.md` (MinIO/presigned flow only)

### Env vars (from `.env.sample`)
```
DATABASE_URL
MINIO_ENDPOINT
MINIO_PORT
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
MINIO_BUCKET_NAME
MINIO_USE_SSL
MINIO_WEBHOOK_SECRET
QDRANT_URL
QDRANT_API_KEY
OPENAI_API_KEY            # add to .env.sample when implementing
```

---

## pg-boss (Correct API Usage)

### Client setup
```ts
const boss = new PgBoss({ connectionString: process.env.DATABASE_URL })
await boss.start()
```

Retry config belongs on **queue**, not constructor:
```ts
await boss.createQueue('index-pdf', {
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
  expireInSeconds: 900,
})
```

### Worker registration
```ts
await boss.work(
  'index-pdf',
  { includeMetadata: true },
  async ([job]) => { ... }
)
```

Notes:
- `work()` handlers receive an array: `([job]) =>`
- Use `includeMetadata: true` when handling retry state
- Run workers in a dedicated long-lived process (not only Next.js request lifecycle)

### Job payload must include version
```ts
{ sourceId, indexVersion }
```

Never rely only on reading current DB version at job start.

---

## Atomic DB + Queue Writes

### Pattern A (V1/V2 initial)
Single Postgres transaction + pg-boss `db` adapter:

```ts
import { fromDrizzle } from 'pg-boss'
import { sql } from 'drizzle-orm'

await db.transaction(async (tx) => {
  const [source] = await tx.insert(sources).values(...).returning()

  await boss.send(
    'index-pdf',
    { sourceId: source.id, indexVersion: source.indexVersion },
    {
      db: fromDrizzle(tx, sql),
      singletonKey: source.id,
    },
  )
})
```

### Pattern B (later hardening)
Transactional outbox:
1. Write source + outbox row in one transaction
2. Dispatcher (interval/cron) reads undelivered rows with `FOR UPDATE SKIP LOCKED`
3. Calls `boss.send`, marks delivered idempotently

Delay is acceptable; requires dispatcher process and replay safety.

---

## LangChain Imports (Current Packages)

```ts
import { Document } from '@langchain/core/documents'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { OpenAIEmbeddings } from '@langchain/openai'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
```

```ts
const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-small',
  apiKey: process.env.OPENAI_API_KEY,
})
```

PDF page metadata path:
```ts
page.metadata.loc.pageNumber   // ✅ correct
page.metadata.page             // ❌ wrong
```

---

## 10. YouTube Transcript Chunking (V2 Fix)

### Problem
Earlier design had timestamp drift:
1. Grouped transcript segments (~300 words) with a start time
2. Ran LangChain second split on groups
3. All child chunks inherited the same group `startTime`
4. Boundary logic sometimes used last segment offset instead of next group first offset

### Fix — single-level grouping only
```ts
const rawChunks = []
let currentSegments: TranscriptSegment[] = []

for (const segment of transcript) {
  currentSegments.push(segment)

  const wordCount = currentSegments.reduce(
    (acc, s) => acc + s.text.trim().split(/\s+/).filter(Boolean).length,
    0,
  )

  if (wordCount >= 300) {
    rawChunks.push({
      text: currentSegments.map((s) => s.text).join(' ').trim(),
      startTime: Math.floor(currentSegments[0].offset), // first segment of THIS group
    })
    currentSegments = []
  }
}

if (currentSegments.length > 0) {
  rawChunks.push({
    text: currentSegments.map((s) => s.text).join(' ').trim(),
    startTime: Math.floor(currentSegments[0].offset),
  })
}
```

### Decisions
- Skip second LangChain split for YouTube (groups are already retrieval-sized)
- `startTime` always reflects where chunk content begins
- 300 words is a target, not a hard token guarantee; use tokenizer if strict cap needed later
- `youtube-transcript` is unofficial and may break; handle missing transcript as `failed`

---

## 11. PDF Guardrails (V2)

### Problems
- 10MB compressed PDF can expand to millions of extracted characters
- Full-buffer download causes memory spikes
- Unlimited chunks => unbounded embedding cost and Qdrant growth

### Production approach
```ts
// 1) Stream download to temp file (cap streamed bytes at 10MB)
const tempPath = `/tmp/${sourceId}-${job.id}.pdf`

await pipeline(
  Readable.fromWeb(response.body),
  new ByteLimitTransform(10 * 1024 * 1024),
  fs.createWriteStream(tempPath),
)

try {
  const loader = new PDFLoader(tempPath, { splitPages: true })
  const pages = await loader.load()

  // 2) Character cap (2M) — truncate boundary page, don't silently drop whole tail page
  const safePages = capPagesByCharacterBudget(pages, 2_000_000)

  const pagesWithMeta = safePages.map((page) => new Document({
    pageContent: page.pageContent,
    metadata: {
      sourceId,
      notebookId,
      pageNumber: page.metadata.loc.pageNumber,
    },
  }))

  const allChunks = await splitDocuments(pagesWithMeta)
  const validChunks = allChunks.filter((c) => c.pageContent.trim().length > 50)
  const limitedChunks = validChunks.slice(0, 4000)

  // 3) Batch embed + upsert
  const BATCH_SIZE = 100
  for (let i = 0; i < limitedChunks.length; i += BATCH_SIZE) {
    const batch = limitedChunks.slice(i, i + BATCH_SIZE)

    // Re-check version/status between batches during long jobs
    await assertSourceStillIndexable(sourceId, jobVersion)

    const vectors = await embeddings.embedDocuments(batch.map((c) => c.pageContent))

    await qdrantClient.upsert('chunks', {
      wait: true,
      points: batch.map((c, j) => ({
        id: uuidv5(`${sourceId}-${jobVersion}-${i + j}`, NAMESPACE),
        vector: vectors[j],
        payload: {
          sourceId,
          notebookId,
          sourceType: 'pdf',
          chunkIndex: i + j,
          indexVersion: jobVersion,
          content: c.pageContent,
          metadata: { pageNumber: c.metadata.pageNumber },
        },
      })),
    })
  }

  // 4) Persist truncation metadata (do not claim full indexing if truncated)
  await db.update(sources).set({
    metadata: {
      ...source.metadata,
      pageCount: safePages.length,
      truncated: wasTruncated,
      indexedCharacterCount,
      indexedChunkCount: limitedChunks.length,
    },
  })
} finally {
  await fs.unlink(tempPath).catch(() => {})
}
```

### Documented trade-offs
- 2M character cap: content beyond cap is not indexed in V2 initial rollout
- 4000 chunk cap: content beyond cap is not indexed
- Temp file reduces upload-buffer pressure, but `PDFLoader.load()` still materializes extracted pages in memory

### Alternatives for later
| Option | Pros | Cons |
|---|---|---|
| Fail-fast hard cap | Predictable cost | Rejects large docs |
| Adaptive larger chunks when over cap | Keeps whole doc partially indexed | Lower retrieval precision |
| Page-priority indexing (first N pages) | Cheap, useful for reports | Partial recall |
| Streaming page-by-page parser | Best memory profile | More custom code outside LangChain |
| Worker thread isolation | Crash isolation | More ops complexity |

---

## 12. Qdrant Setup Completion (V2)

### What was incomplete in MVP plan
1. Collection creation not guaranteed
2. Vector size/distance not validated
3. No schema mismatch guard
4. Upsert/delete without `wait: true` can drift from DB status
5. Missing payload indexes on `sourceId` / `notebookId`
6. Placeholder namespace invalid

### Initialize-or-use pattern
```ts
// lib/qdrant.ts
let initPromise: Promise<void> | null = null

export async function ensureQdrantCollection() {
  if (!initPromise) initPromise = _ensureQdrantCollection()
  return initPromise
}

async function _ensureQdrantCollection() {
  const name = 'chunks'
  const expected = { size: 1536, distance: 'Cosine' as const }

  const { collections } = await qdrantClient.getCollections()
  const exists = collections.some((c) => c.name === name)

  if (!exists) {
    try {
      await qdrantClient.createCollection(name, { vectors: expected })
    } catch (err) {
      // concurrent startup: if another worker created it, continue
      if (!isAlreadyExistsError(err)) throw err
    }
  }

  const info = await qdrantClient.getCollection(name)
  const vectorConfig = info.config.params.vectors

  if (vectorConfig.size !== expected.size || vectorConfig.distance !== expected.distance) {
    throw new Error(`Qdrant collection "${name}" has incompatible vector config`)
  }

  // Ensure payload indexes even when collection already existed
  await ensurePayloadIndex(name, 'sourceId', 'keyword')
  await ensurePayloadIndex(name, 'notebookId', 'keyword')
}
```

### Deterministic point IDs
Use stable app namespace (not placeholder):
```ts
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8' // DNS namespace UUID
```

Include version in ID/payload when fencing:
```ts
uuidv5(`${sourceId}-${indexVersion}-${chunkIndex}`, NAMESPACE)
```

### All writes should wait
```ts
await qdrantClient.upsert('chunks', { wait: true, points })
await qdrantClient.delete('chunks', { wait: true, filter })
```

Run `ensureQdrantCollection()` from worker bootstrap before registering pg-boss handlers.

---

## 13. Indexing vs Deletion Race Protection (V2)

### Goal
Prevent stale index jobs from recreating chunks after delete/reindex, and prevent duplicate enqueue from UI/network retries.

### Layer 1 — Idempotency key (UI/API)
```ts
idempotencyKey: varchar(255)
unique(notebookId, idempotencyKey)
```

Use DB-level conflict handling:
```ts
const [source] = await tx
  .insert(sources)
  .values({ notebookId, idempotencyKey, ... })
  .onConflictDoNothing()
  .returning()

if (!source) {
  // fetch existing by notebookId + idempotencyKey + ownership filters
}
```

Do not rely on `findFirst` then `insert` (race-prone).

### Layer 2 — Queue dedupe
```ts
await boss.send('index-source', payload, {
  singletonKey: sourceId,
  // choose queue policy explicitly (standard / stately / exclusive)
})
```

If `!jobId`, treat as already queued and return current status.

### Layer 3 — Version fencing (critical)
Increment version in same transaction as enqueue:

```ts
const [source] = await tx
  .update(sources)
  .set({
    indexingStatus: 'pending',
    indexVersion: sql`${sources.indexVersion} + 1`,
  })
  .where(/* ownership + active filters */)
  .returning()

await boss.send(
  'index-source',
  { sourceId: source.id, indexVersion: source.indexVersion },
  { db: fromDrizzle(tx, sql), singletonKey: source.id },
)
```

Delete path:
```ts
await tx.update(sources).set({
  status: 'deleting',
  indexVersion: sql`${sources.indexVersion} + 1`,
})
```

Worker checks:
1. At job start: `status === 'active'` and `indexVersion === job.data.indexVersion`
2. Before final DB/Qdrant writes: same check
3. Between Qdrant batches on long jobs: same check
4. Final indexed update must be conditional:
   ```ts
   .where(and(
     eq(sources.id, sourceId),
     eq(sources.status, 'active'),
     eq(sources.indexVersion, jobVersion),
   ))
   ```

If check fails: abort silently; optionally delete this generation's Qdrant points.

### Coverage matrix

| Scenario | Protection |
|---|---|
| Double-click create | Idempotency key |
| Duplicate enqueue | `singletonKey` |
| Reindex while job running | Version increment + payload version check |
| Delete while job running | `deleting` + version increment |
| Job starts after delete | Start-of-job status/version check |
| Worker crash mid-batch | Query-time active-source filter + reconciliation cleanup |

Important: absolute "no orphan chunks ever" is not realistic with async workers. Use:
- versioned chunk IDs/payload
- query-time active source filter (already in `architecture.md`)
- periodic reconciliation to remove stale generations

---

## Retry State Handling (V2)

Do **not** mark terminal `failed` on first caught error.

In worker catch (with `includeMetadata: true`):
```ts
const attemptsUsed = job.retryCount + 1
const attemptsAllowed = job.retryLimit + 1 // initial attempt + retries

if (attemptsUsed < attemptsAllowed) {
  await db.update(sources)
    .set({ indexingStatus: 'retrying' })
    .where(eq(sources.id, sourceId))
  throw err // pg-boss schedules retry
}

await db.update(sources)
  .set({ indexingStatus: 'failed' })
  .where(eq(sources.id, sourceId))
throw err
```

For crash/expiration paths where catch may not run, add dead-letter worker or reconciliation job to mark terminal `failed`.

---

## Folder Structure (V2 Target)

```
features/sources/
├── components/
├── actions/
│   ├── createTextSource.ts
│   ├── createYoutubeSource.ts
│   ├── createPdfSource.ts
│   ├── deleteSource.ts
│   ├── reindexSource.ts
│   └── listSources.ts
├── jobs/
│   ├── indexTextJob.ts
│   ├── indexYoutubeJob.ts
│   ├── indexPdfJob.ts
│   ├── deleteSourceJob.ts
│   └── registerJobs.ts
├── pipeline/
│   ├── chunker.ts
│   └── qdrantUpsert.ts
└── types.ts

lib/
├── qdrant.ts
├── minio.ts
└── pgboss.ts

workers/
└── index.ts                 # dedicated pg-boss worker process
```

---

## MVP Shipping Checklist (Assessment)

Use `architecture.md` and implement only what is needed to demo end-to-end:

- [ ] `sources` Drizzle model + migration
- [ ] Auth-protected source APIs with notebook ownership checks
- [ ] Text + YouTube create + list sources endpoint
- [ ] PDF init/confirm (POST policy + basic confirm)
- [ ] pg-boss worker for index/delete jobs
- [ ] Qdrant upsert/delete with deterministic IDs
- [ ] Frontend wiring (stop discarding form payloads)
- [ ] Status polling UI
- [ ] Website shown disabled: “Coming soon”

Defer to post-assessment (this document):
- [ ] Version fencing across batches
- [ ] Idempotency key with DB conflict semantics
- [ ] Truncation metadata + advanced PDF streaming caps
- [ ] Transactional outbox dispatcher
- [ ] Dead-letter terminal failure reconciliation
- [ ] Full MinIO webhook reconciliation jobs

---

## Review Findings Log (Why V2 Exists)

1. Presigned PUT cannot enforce upload size/type like POST policy.
2. pg-boss retry options belong on queue config; workers receive job arrays.
3. DB enqueue must be transactional (`fromDrizzle`) or outbox-based.
4. `failed` on first retry breaks UX; add `retrying`.
5. YouTube second split causes citation timestamp drift.
6. PDF plan chunked wrong variable (`pagesWithMeta` vs `safePages`).
7. Qdrant init must validate existing collections and create payload indexes idempotently.
8. Version fencing must use job payload version, not only DB read at start.
9. Singleton queue behavior depends on explicit pg-boss queue policy.
10. Terminal failure handling needs DLQ/reconciliation, not assumed `onComplete`.

---

## Deferred During MVP Implementation

Captured while shipping the assessment MVP:

1. Notebook status remains `active | deleted` in DB (not `deleting`) to avoid a breaking
   migration during the assessment window. Source deletion already uses `deleting`.
2. PDF init creates the source row before signing; if policy signing fails after insert,
   an abandoned pending PDF row can remain until cleanup/TTL. Compensating delete or
   outbox-style finalize belongs in V2.
3. PDF indexing currently buffers the object into memory via MinIO `getObject` chunks.
   Temp-file streaming and worker-thread isolation remain V2.
4. Version fencing across Qdrant batches and dead-letter terminal reconciliation remain V2.
5. MinIO bucket/CORS/webhook auto-setup is still manual for local Docker.

---

## Chapter 6 — Deployment

- VPS deployment with Docker Compose (`docker/compose.yml`)
- Postgres → Neon/Supabase (production)
- Qdrant → self-hosted Docker container (production, same compose stack as app/worker)
- MinIO → self-hosted VPS instance (production)

---

## Environments

| Service | Development | Production |
|---|---|---|
| Postgres | Docker container | Neon / Supabase |
| Qdrant | Docker container | Self-hosted Docker container (compose stack) |
| MinIO | Docker container | Personal VPS instance |

Two environment files:
- `.env.development` → local Docker services
- `.env.production` → managed cloud services (Postgres) + self-hosted compose services (Qdrant, MinIO)

In production compose, `QDRANT_URL` is set internally to `http://qdrant:6333` — no Qdrant Cloud dependency.

---

## Migration Path

1. Ship MVP against `architecture.md`
2. Keep API contracts stable where possible
3. Add `indexVersion`, `idempotencyKey`, `retrying` via migration
4. Introduce worker process hardening + Qdrant init guard
5. Replace direct enqueue call sites with outbox only if reliability requirements increase
