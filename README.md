# GeminiLM

AI-powered research companion. Upload sources (PDFs, text, YouTube, websites), organize them into notebooks, chat with grounded answers, and preview citations in a side panel.

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
| **Notifications** | [react-hot-toast](https://react-hot-toast.com) |
| **Git hooks** | Husky — lint on commit |
| **CI** | GitHub Actions — lint + build |
| **Local infra** | Docker Compose for PostgreSQL (MinIO / Qdrant prepared for later) |

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

### Notebook workspace
- Two-column layout by default: **Sources** | **Chat**
- Sources UI: type picker (Text, YouTube, Website, PDF) — add shows a toast for now (upload API next)
- Chat input: enabled when chat is available; submitting a message shows a toast — **"It will be implemented soon"** (no AI call yet)
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
| **PostgreSQL** | Primary relational database |
| **Drizzle** | Type-safe ORM and migrations |
| **Qdrant** | Vector database for embeddings / retrieval |
| **Docker** | Local infrastructure (Postgres, and later MinIO / Qdrant) |
| **pg-boss** | Postgres-backed job queue for async processing |
| **OpenAI SDK** | LLM / embedding calls |
| **MinIO** | S3-compatible object storage for documents (e.g. PDFs) |

Also used in the app today: TypeScript, Tailwind CSS, TanStack Query, Axios, Zod, `jose` (JWT), react-hot-toast.

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
│       └── notebook.ts
├── features/
│   ├── auth/                     # Google OAuth UI + hooks
│   ├── notebooks/                # Actions, hooks, list/workspace UI
│   ├── sources/                  # Add-source dialog + forms (UI only for now)
│   └── citations/                # Citation panel + type viewers
├── lib/auth.ts                   # JWT verify, route protection helpers, getCurrentUserId
├── proxy.ts                      # Auth gate for /dashboard + /api/user
├── services/api.ts               # userApi + authApi
├── docker/compose.dev.yml
├── drizzle/                      # Generated migrations
└── .env.sample
```

Feature-based layout: shared shell under `app/`, domain logic under `features/`.

---

## Prerequisites

- **Node.js** 20+
- **Docker** (for local PostgreSQL)
- **Google Cloud OAuth client** (Web application)
- **External auth service** that handles Google callback + sets the session cookie
- Base64-encoded **RS256 public key** from the auth service (`JWT_PUBLIC_KEY`)

---

## Getting started

### 1. Install dependencies

```bash
npm install
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
| `JWT_PUBLIC_KEY` | Base64-encoded RS256 PEM public key |
| `DATABASE_URL` | PostgreSQL URL (e.g. `postgresql://postgres:postgres@localhost:5432/geminilm`) |

Also copy/use `.env.development` for Drizzle (`drizzle.config.ts` loads it).

### 3. Start PostgreSQL

```bash
docker compose -f docker/compose.dev.yml up -d
```

### 4. Run migrations

```bash
npm run db:generate   # after schema changes
npm run db:migrate
```

### 5. Dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate Drizzle migrations from schema |
| `npm run db:migrate` | Apply migrations |

---

## Authentication

Google OAuth uses the **authorization code** flow. Session cookies are issued by the **external auth service**; this app verifies JWTs with `JWT_PUBLIC_KEY`.

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

---

## Coming next (not wired yet)

- Source upload / persistence (PDF → MinIO, etc.)
- Real AI chat (chat submit currently only shows *"It will be implemented soon"*) + citation extraction from model responses
- Live PDF presigned URL API for citations
- Qdrant / embeddings pipeline

Env keys for MinIO and Qdrant are already in `.env.sample`; Compose services are commented until needed.

---

## License

Private / peer-review project. Update as needed for your cohort or org.
