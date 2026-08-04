# GeminiLM

AI-powered research companion. Upload sources (PDFs, text, YouTube), organize them into notebooks, chat with grounded answers, and preview citations in a side panel.

---

## What's included

| Area | Details |
|------|---------|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router) + [React 19](https://react.dev) |
| **Language** | TypeScript |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) |
| **Data fetching** | [TanStack Query v5](https://tanstack.com/query) |
| **HTTP client** | Axios with credentials |
| **Auth** | Google OAuth (auth-code flow) via external auth service + JWT verification (`jose`) |
| **Database** | [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL |
| **Job queue** | [pg-boss](https://github.com/timgit/pg-boss) (Postgres-backed) |
| **Embeddings** | [LangChain](https://js.langchain.com) + OpenAI `text-embedding-3-small` |
| **Vector DB** | [Qdrant](https://qdrant.tech) (`chunks` collection) |
| **Object storage** | [MinIO](https://min.io) (S3-compatible, PDF uploads) |
| **Notifications** | [react-hot-toast](https://react-hot-toast.com) |
| **Git hooks** | Husky — lint on commit, build on push |
| **CI** | GitHub Actions — lint + build (pnpm) |
| **Local infra** | Docker Compose — PostgreSQL, MinIO, Qdrant |
| **Production** | Multi-stage Dockerfile + `docker/compose.yml` (app, worker, Qdrant) |

---

## Features (current)

### Landing page
- Marketing home with sources / features sections
- Auth-aware CTAs: signed-out users see Google sign-in; signed-in users see **Create notebook**
- Custom 404 page

### Auth
- Google OAuth via shared auth service
- Protected `/dashboard` routes (`proxy.ts` + JWT cookie)
- Loading overlay during sign-in / redirect

### Notebooks
- Create, list, rename, soft-delete (single + delete all)
- Server actions + TanStack Query hooks
- Status enum: `active` | `deleted` (fetches only `active`)

### Sources
- Add **text**, **YouTube**, and **PDF** sources via dialog forms (server actions)
- **Website** link type shown in UI with **Coming soon** (not wired to backend)
- PDF upload flow: presigned POST to MinIO → confirm → index job
- Source list with indexing status (`pending` → `indexing` → `indexed` / `failed` / `retrying`)
- Live status polling while a source is processing
- Delete source (soft-delete + async cleanup job)
- Reindex / retry failed sources
- Idempotency keys prevent duplicate uploads on retry

### Indexing pipeline (background worker)
- Separate `workers/index.ts` process subscribes to pg-boss queues
- **Text**: chunk → embed → upsert to Qdrant
- **YouTube**: fetch transcript → chunk → embed → upsert
- **PDF**: download from MinIO → parse → chunk → embed → upsert
- **Delete**: remove Qdrant points + MinIO object (for PDFs), then hard-delete row
- Retries with backoff; failed jobs surface in the UI with a **Retry** action

### Notebook workspace
- Two-column layout by default: **Sources** | **Chat**
- Chat input enabled when at least one source has `indexingStatus = indexed`
- Chat UI shows **demo** assistant message with citation chips (not live RAG yet)
- Submitting a chat message shows a toast — **"It will be implemented soon"** (no AI call yet)
- Citation panel: click a citation chip → third column opens with type-specific viewer
  - YouTube embed at timestamp
  - PDF iframe at `#page=N` (presigned URL API stubbed/commented)
  - Text with highlight
  - Website iframe + open-in-new-tab fallback
- Close citation panel to return to two columns

---

## Tech stack

| Technology | Role |
|------------|------|
| **Next.js** | App framework (App Router, React Server Components, server actions) |
| **PostgreSQL** | Primary relational database + pg-boss job storage |
| **Drizzle** | Type-safe ORM and migrations |
| **pg-boss** | Postgres-backed job queue for async indexing |
| **LangChain** | Text splitting + OpenAI embeddings |
| **Qdrant** | Vector database for chunk retrieval |
| **MinIO** | S3-compatible object storage for PDFs |
| **Docker** | Local infra (Postgres, MinIO, Qdrant) and production images |

Also used in the app: TypeScript, Tailwind CSS, TanStack Query, Axios, Zod, `jose` (JWT), react-hot-toast, `pdf-parse`, `youtube-transcript`.

---

## Project structure

```
gen-ai-peer-review-project/
├── app/
│   ├── api/user/                 # User CRUD API (auth-protected)
│   ├── components/               # Navbar, Dialog, HeroActions, CtaBanner, LoadingOverlay
│   ├── context/AuthContext.tsx
│   ├── dashboard/
│   │   ├── page.tsx              # Notebook list
│   │   └── [notebookId]/page.tsx # Notebook workspace
│   ├── lib/axiosInstance.ts
│   ├── not-found.tsx
│   ├── page.tsx                  # Landing page
│   ├── providers.tsx
│   └── layout.tsx
├── db/
│   ├── index.ts                  # Drizzle client
│   ├── schema.ts
│   └── models/
│       ├── user.ts
│       ├── notebook.ts
│       └── source.ts
├── features/
│   ├── auth/                     # Google OAuth UI + hooks
│   ├── notebooks/                # Actions, hooks, list/workspace UI
│   ├── sources/                  # CRUD actions, forms, hooks, jobs, pipeline
│   └── citations/                # Citation panel + type viewers
├── lib/
│   ├── auth.ts                   # JWT verify, route protection, getCurrentUserId
│   ├── embeddings.ts             # OpenAI embeddings via LangChain
│   ├── minio.ts                  # MinIO client
│   ├── pgboss.ts                 # pg-boss singleton + queue names
│   └── qdrant.ts                 # Qdrant client + collection setup
├── workers/
│   └── index.ts                  # Background worker entrypoint
├── services/api.ts               # userApi + authApi
├── docker/
│   ├── compose.dev.yml           # Local Postgres + MinIO + Qdrant
│   └── compose.yml               # Production app + worker + Qdrant
├── docs/deployment-notes.md      # Production Docker / Coolify notes
├── drizzle/                      # Generated migrations
├── Dockerfile                    # Next.js standalone + worker image
├── proxy.ts                      # Auth gate for /dashboard + /api/user
└── .env.sample
```

Feature-based layout: shared shell under `app/`, domain logic under `features/`.

See also `architecture.md` (MVP guide) and `architecture.v2.md` (production indexing reference).

---

## Prerequisites

- **Node.js** 20+ (Node 24 used in Docker / CI)
- **pnpm** 10+ (recommended; used by Husky and CI)
- **Docker** (local PostgreSQL, MinIO, Qdrant)
- **Google Cloud OAuth client** (Web application)
- **External auth service** that handles Google callback + sets the session cookie
- Auth service must expose JWKS at `/.well-known/jwks.json` (used by `lib/auth.ts`)
- **OpenAI API key** (embeddings during source indexing)

---

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment

```bash
cp .env.sample .env.development
```

Fill in at least:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | App URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_AUTH_URL` | External auth service base URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `NEXT_PUBLIC_BUSINESS_NAME` | App name sent to auth service (default: `GeminiLM`) |
| `DATABASE_URL` | PostgreSQL URL (e.g. `postgresql://postgres:postgres@localhost:5432/geminilm`) |
| `MINIO_*` | MinIO endpoint, keys, bucket (see `.env.sample`) |
| `QDRANT_URL` | Qdrant URL (local: `http://localhost:6333`) |
| `OPENAI_API_KEY` | OpenAI key for embedding calls in the worker |

Also copy/use `.env.development` for Drizzle (`drizzle.config.ts` loads it).

### 3. Start local infrastructure

```bash
docker compose -f docker/compose.dev.yml up -d
```

This starts **PostgreSQL**, **MinIO** (API `:9000`, console `:9001`), and **Qdrant** (`:6333`).

Create the MinIO bucket once (console at [http://localhost:9001](http://localhost:9001), default credentials `minioadmin` / `minioadmin`):

- Bucket name: `documents` (or match `MINIO_BUCKET_NAME` in `.env.development`)

### 4. Run migrations

```bash
pnpm run db:generate   # after schema changes
pnpm run db:migrate
```

### 5. Start the worker

In a **second terminal** (required for source indexing):

```bash
pnpm run worker
```

The worker connects to Postgres (pg-boss), Qdrant, and OpenAI, then listens for indexing jobs.

### 6. Dev server

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm run dev` | Next.js development server |
| `pnpm run build` | Production build |
| `pnpm run start` | Serve production build |
| `pnpm run lint` | ESLint |
| `pnpm run worker` | Background indexing worker (pg-boss) |
| `pnpm run db:generate` | Generate Drizzle migrations from schema |
| `pnpm run db:migrate` | Apply migrations |

---

## Authentication

Google OAuth uses the **authorization code** flow. Session cookies are issued by the **external auth service**; this app verifies JWTs with the auth service JWKS (`createRemoteJWKSet` in `lib/auth.ts`).

```
User clicks Sign in
  → Google popup (auth-code)
  → GET {AUTH_URL}/auth/google/callback?code=...&businessName=...
  → Auth service sets httpOnly cookie
  → Client stores profile in localStorage
  → Redirect to /dashboard
```

### Expected auth service endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/auth/google/callback` | Exchange code; return `userInfo`; set cookie |
| `POST` | `/users/logout` | Clear session |

### Protected routes

Configured in `lib/auth.ts` + `proxy.ts`:

- Pages: `/dashboard`, `/dashboard/*`
- API: `/api/user`, `/api/user/*`

Unauthenticated page visits redirect to `/`.

Server actions use `getCurrentUserId()` (reads cookie + verifies JWT).

---

## Notebooks API (server actions)

Located in `features/notebooks/actions/actions.ts`:

| Action | Behavior |
|--------|----------|
| `createNotebook` | Insert active notebook (default title: `Untitled notebook`) |
| `getNotebooks` | List active notebooks for current user |
| `getNotebookById` | Fetch one active notebook (ownership-scoped) |
| `updateNotebookTitle` | Rename |
| `deleteNotebook` | Soft-delete (`status = deleted`) |
| `deleteAllNotebooks` | Soft-delete all active notebooks for user |

Hooks: `features/notebooks/hooks/index.ts` (`useNotebooks`, `useNotebook`, mutations).

---

## Sources API (server actions)

Located in `features/sources/actions/actions.ts`:

| Action | Behavior |
|--------|----------|
| `listSources` | List active sources for a notebook |
| `getSourceStatus` | Poll indexing status for one source |
| `createTextSource` | Insert text source + enqueue `index-text` job |
| `createYoutubeSource` | Insert YouTube source + enqueue `index-youtube` job |
| `initPdfUpload` | Create PDF row + return MinIO presigned POST policy |
| `confirmPdfUpload` | Verify upload in MinIO + enqueue `index-pdf` job |
| `deleteSource` | Mark `deleting` + enqueue `delete-source` job |
| `reindexSource` | Reset to `pending` + enqueue fresh index job |

Hooks: `features/sources/hooks/index.ts` (`useSources`, mutations, status polling).

Worker jobs: `features/sources/jobs/` (`indexTextJob`, `indexYoutubeJob`, `indexPdfJob`, `deleteSourceJob`).

---

## Citations

Types live in `features/citations/types.ts`:

| Type | Extra fields | Viewer |
|------|--------------|--------|
| `youtube` | `videoId`, `startTime` (seconds) | Embed `?start=` |
| `pdf` | `presignedUrl`, `pageNumber` | iframe `#page=N` |
| `text` | `content`, `highlightText` | Highlighted block |
| `website` | `url` | iframe + new-tab fallback |

Demo chips in the chat panel open the third column. PDF URL fetching is stubbed/commented in `features/citations/service/pdfCitationApi.ts`.

---

## Database models

### `users`
- `id` — auth service user id (JWT `sub`)
- `email`, `fullName`, `role`, `plan`, timestamps

### `notebooks`
- `id` (uuid), `title`, `userId` → users
- `status` enum: `active` | `deleted`
- timestamps

### `sources`
- `id` (uuid), `notebookId` → notebooks, `type` (`pdf` | `text` | `youtube`)
- `title`, `metadata` (jsonb — storage key, video id, text content, etc.)
- `indexingStatus`: `pending` | `indexing` | `retrying` | `indexed` | `failed`
- `status`: `active` | `deleting`
- `idempotencyKey` (unique per notebook)
- timestamps

---

## Production deployment

- **Dockerfile** builds a Next.js standalone **app** image and a separate **worker** image (runs `tsx workers/index.ts`).
- **`docker/compose.yml`** runs `app`, `worker`, and internal **Qdrant** together; `QDRANT_URL` is set to `http://qdrant:6333` inside the stack.
- See **`docs/deployment-notes.md`** for Coolify / worker compile notes and Qdrant networking troubleshooting.

---

## Coming next (not wired yet)

- **Website** source type (UI placeholder only)
- **Real AI chat** (RAG over indexed chunks) — submit currently shows *"It will be implemented soon"*; citations are demo data
- **Live PDF presigned URL API** for the citation panel (replace stub in `pdfCitationApi.ts`)
- **Citation extraction** from model responses (replace `demoCitations`)
- **Compile worker to JS** for production images (see `docs/deployment-notes.md`)

---

## License

Private / peer-review project. Update as needed for your cohort or org.
