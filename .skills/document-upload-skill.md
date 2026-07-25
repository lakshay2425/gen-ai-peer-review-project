---
name: document-presigned-upload
description: Design, implement, review, or debug browser document uploads that use a backend-issued S3/MinIO presigned POST policy, direct frontend-to-object-storage transfer, database metadata, and asynchronous upload confirmation. Use for presigned URLs, object storage, document metadata, upload webhooks, download URLs, deletion, upload limits, CORS, or frontend/backend responsibility boundaries.
---

# Presigned document upload

Use this skill to build a secure document-upload flow without proxying file bytes through the application backend. It documents the working Resource Manager implementation, its implicit cross-repository contracts, its known gaps, and a stronger reusable design for new projects.

## First determine which signing mechanism is in use

Do not use “presigned URL” as an ambiguous implementation term.

- A **presigned POST policy** returns a storage URL plus signed form fields. The browser sends `multipart/form-data`. This is what Resource Manager uses.
- A **presigned PUT URL** returns one signed URL. The browser sends the file as the request body with the signed headers.
- Multipart upload uses several signed requests and is appropriate for large files.

Keep the frontend and backend on the same mechanism. POST policy fields cannot be converted into a PUT request.

## Target responsibility boundary

| Concern | Frontend | Backend | Object storage / infrastructure |
| --- | --- | --- | --- |
| File picker and user feedback | Own | No | No |
| Early extension, MIME, and size checks | Advisory only | Authoritative | Policy provides defense in depth |
| Authentication and ownership | Send session credential only to API | Own | Never receive application session cookie |
| Quota and authorization | Display server response | Own | No |
| Object key | Never choose or trust | Generate an opaque key | Enforce exact signed key |
| Upload policy | Consume as opaque data | Generate with least privilege | Enforce signature, expiry, key, type, and size |
| File bytes | Send directly to storage | Do not proxy | Store |
| Upload completion | Poll or consume status | Verify and transition state | Emit object-created event and support `HEAD` |
| Metadata | Display API response | Own canonical record | Report object metadata, not business ownership |
| View/download | Open returned URL | Authorize and sign short-lived GET | Serve object |
| Delete | Request by document ID | Authorize; coordinate DB and object deletion | Delete object |
| Secrets | None | Storage credentials and webhook secret | Protect credentials and event destination |
| Cleanup/reconciliation | No | Own jobs and state transitions | Bucket lifecycle can provide a safety net |

Rules:

1. Never expose storage access keys, secret keys, webhook secrets, bucket administration, or raw object keys as frontend configuration.
2. Never trust client-supplied owner identity, object key, MIME type, file size, or completion state.
3. Never mark an upload complete merely because the browser says its request succeeded. Confirm with a signed storage event or a backend `HEAD` request.
4. Never make a bucket public to simplify uploads or downloads.
5. Client validation improves UX; server validation and policy constraints enforce security.

## Resource Manager: current end-to-end flow

The current system spans:

- Frontend: `/agent/repos/Resource-Manager-Frontend`
- Backend: `/agent/repos/resourceManager-backend`

```mermaid
sequenceDiagram
    actor User
    participant UI as React UI
    participant API as Express API
    participant DB as MongoDB
    participant Store as MinIO

    User->>UI: Select a file
    UI->>UI: Check MIME and size
    UI->>API: POST /api/document/upload-url
    API->>API: Authenticate, validate, enforce quota
    API->>DB: Create PENDING document with UUID object key
    API->>Store: Sign constrained POST policy
    Store-->>API: postURL and formData
    API-->>UI: documentId and uploadData
    UI->>Store: Multipart POST: policy fields, then file
    Store-->>UI: 2xx
    Store->>API: ObjectCreated webhook
    API->>DB: PENDING -> SUCCESS; save reported MIME and size
    UI->>API: GET /api/document/
    API-->>UI: SUCCESS documents only
```

The browser flow has two requests, but the system lifecycle has three phases:

1. Issue upload policy and reserve metadata.
2. Transfer bytes directly to storage.
3. Confirm storage creation and finalize metadata.

The current frontend calls phase 2 “success” even though phase 3 may still be pending. This causes a race when it immediately refetches a list that returns only `SUCCESS` records.

## Current code map

### Frontend

| File | Responsibility |
| --- | --- |
| `src/pages/DocumentManagement.jsx` | File picker, advisory validation, upload/view/delete UI, toasts |
| `src/hooks/useDocuments.js` | React Query list and mutations; two browser-side upload requests |
| `src/api/documentApi.js` | Backend API calls and raw Axios multipart POST to MinIO |
| `src/utilis/Axios.jsx` | Backend Axios client using `VITE_BACKEND_URL` and cookies |
| `src/context/AuthContext.jsx` | Session verification through `VITE_AUTH_URL` |
| `src/App.jsx` | Protected `/documents` route |
| `src/components/Navbar.jsx` | Documents navigation entry |

### Backend

| File | Responsibility |
| --- | --- |
| `app.ts` | API CORS, JSON/cookie middleware, `/api` mount, Mongo and MinIO startup |
| `routes/route.ts` | Mounts `/document` |
| `routes/document.ts` | Document routes, auth, ownership, validation, and rate limits |
| `controllers/document.Controller.ts` | Zod request validation and HTTP response mapping |
| `services/document.services.ts` | Policy generation, webhook processing, list, view URL, and deletion |
| `models/document.ts` | Mongoose document schema and indexes |
| `config/config.ts` | Typed environment configuration and defaults |
| `config/minio.ts` | MinIO client and bucket initialization |
| `middleware/authMiddleware.ts` | JWT cookie verification and development bypass |
| `middleware/checkOwnership.ts` | Owner check before view and single delete |
| `Docker/compose.dev.yml` | MongoDB and MinIO development services |
| `Docker/minio-setup.sh` | MinIO bucket and object-created webhook configuration |

## Current API contract

All application endpoints are below `/api/document`. Application requests use the authenticated backend client with cookies. The direct storage request uses an unauthenticated plain HTTP client.

### Request a POST policy

`POST /api/document/upload-url`

Request:

```json
{
  "original_filename": "report.pdf",
  "mime_type": "application/pdf",
  "file_size": 1048576
}
```

Success:

```json
{
  "message": "Upload policy generated successfully",
  "documentId": "mongo-object-id",
  "uploadData": {
    "postURL": "https://storage.example.com/documents",
    "formData": {
      "bucket": "documents",
      "key": "server-generated-uuid",
      "Content-Type": "application/pdf",
      "x-amz-algorithm": "AWS4-HMAC-SHA256",
      "x-amz-credential": "...",
      "x-amz-date": "...",
      "policy": "...",
      "x-amz-signature": "..."
    }
  }
}
```

Possible failures:

- `400`: malformed request, unsupported MIME type, or oversized file.
- `401`: invalid or expired session.
- `403`: per-user document quota reached.
- `429`: rate limit reached.
- `500`/`502`: database or storage signing failure.

The policy currently constrains:

- Exact bucket.
- Exact opaque UUID object key.
- Exact declared content type.
- Content length from 1 byte through `MAX_FILE_SIZE_MB`.
- Expiry at `PRESIGNED_UPLOAD_EXPIRY_SECONDS`.

### Direct storage POST

Build a new `FormData` body:

```javascript
const body = new FormData()

for (const [key, value] of Object.entries(uploadData.formData)) {
  body.append(key, value)
}

// Keep the file after the signed fields for S3/MinIO POST compatibility.
body.append('file', file)

await rawHttpClient.post(uploadData.postURL, body)
```

Requirements:

- Treat every returned form field as opaque and include it unchanged.
- Use the field name `file`.
- Keep the file after the policy fields for S3/MinIO compatibility.
- Do not manually set multipart `Content-Type`; the browser must add its boundary.
- Do not use the backend Axios instance, bearer token, or `withCredentials`.
- Ensure the file part’s content type matches the signed `Content-Type`.
- Configure storage CORS for the frontend origin and `POST`; API CORS does not configure storage CORS.

### Storage webhook

`POST /api/document/webhook`

- MinIO sends `Authorization: Bearer <MINIO_WEBHOOK_SECRET>`.
- The handler accepts S3 `Records`.
- Only object-created records for the configured bucket are processed.
- A record updates the matching `object_key` only while its state is `PENDING`.
- The transition is idempotent: duplicate events do not create duplicate documents.
- The current code records storage-event `contentType` and `size`, removes `expires_at`, and changes the state to `SUCCESS`.

The webhook is authenticated by a shared secret, not by an end-user JWT. Use a long random production secret, constant-time comparison where practical, TLS, network restrictions, payload size limits, event schema validation, and secret rotation.

### List

`GET /api/document/`

Current response:

```json
{
  "message": "Documents retrieved successfully",
  "documents": [
    {
      "_id": "mongo-object-id",
      "original_filename": "report.pdf",
      "mime_type": "application/pdf"
    }
  ],
  "total": 1
}
```

Only `SUCCESS` records are returned. A reusable implementation should also expose `GET /uploads/:id` or include nonterminal states in an owner-only list so the frontend can represent confirmation accurately.

### View

`GET /api/document/:id/view`

The backend validates the document ID, authenticates the user, checks `gmail` ownership, requires `SUCCESS`, and returns a short-lived presigned GET URL. The current expiry is controlled by `PRESIGNED_VIEW_EXPIRY_SECONDS`.

Do not let the browser construct a storage URL from an object key. Sanitize `Content-Disposition` filenames or emit an RFC 5987 `filename*` value; unescaped user-provided names can break response headers.

### Delete

- `DELETE /api/document/:id`: owner-only single delete.
- `DELETE /api/document`: delete all documents belonging to the authenticated user.

The current single-delete path removes the object first, then the DB row. It retains the DB row if storage deletion fails, except a missing object is treated as already deleted. The current bulk path uses `Promise.allSettled` and deletes all DB rows even when some object deletions fail, which can orphan objects.

Prefer a durable deletion state and retry worker:

```text
SUCCESS -> DELETE_PENDING -> deleted
                     \-> DELETE_FAILED -> retry
```

## Current database schema

Resource Manager uses Mongoose rather than migrations.

```text
documents
├── _id                 ObjectId
├── gmail               string, required; owner from authenticated JWT
├── object_key          string, required, unique; UUID generated by backend
├── original_filename   string, required; supplied by client for display
├── mime_type           string, optional; set from storage event
├── file_size           number, optional; set from storage event
├── status              PENDING | SUCCESS | FAILED
├── expires_at          date, optional
└── created_at          date, generated by Mongoose
```

Indexes:

- Unique `{ object_key: 1 }`.
- TTL `{ expires_at: 1 }` with `expireAfterSeconds: 0`.
- Query index `{ gmail: 1, status: 1 }`.

Current lifecycle:

```text
policy request -> PENDING -> SUCCESS
                     |
                     +-> TTL deletes abandoned DB record
```

`FAILED` exists in the enum but no current code sets it. MongoDB TTL cleanup is asynchronous and deletes only metadata; it does not delete an object that exists in storage.

### Recommended reusable schema

Use neutral names such as `owner_id`, not an identity-provider-specific field such as `gmail`.

```text
uploads
├── id
├── owner_id
├── bucket
├── object_key                 unique
├── original_filename
├── declared_mime_type         from preflight
├── declared_size              from preflight
├── stored_mime_type           from HEAD/event
├── stored_size                from HEAD/event
├── checksum                   optional but recommended
├── status                     PENDING | UPLOADED | PROCESSING | READY | FAILED | DELETE_PENDING
├── failure_code
├── upload_expires_at
├── created_at
└── updated_at
```

Recommended indexes:

- Unique `(bucket, object_key)`.
- `(owner_id, status, created_at desc)` for lists and quotas.
- TTL only for records that are safe to lose, or use a cleanup worker when object deletion is required.
- Optional unique idempotency key scoped to owner.

Keep separate declared and stored metadata. A storage event’s content type is storage-reported metadata, not proof of the file’s actual format. If content safety matters, quarantine uploads and perform magic-byte detection, malware scanning, and content processing before `READY`.

## Environment variables

### Frontend

| Variable | Purpose |
| --- | --- |
| `VITE_BACKEND_URL` | Application API base; currently expected to include `/api` |
| `VITE_AUTH_URL` | Authentication service used to verify the session |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth setup |

Vite variables are public and baked into the client build. Never put credentials or webhook secrets in `VITE_*`. The frontend needs no MinIO/S3 access key, secret, bucket, region, or webhook configuration.

### Backend and infrastructure

| Variable | Purpose | Current development default |
| --- | --- | --- |
| `MONGODB_URL` | Metadata database connection | Local MongoDB |
| `NODE_ENVIRONMENT` | Environment and current SSL switch | `development` |
| `deployedFrontendURI` | Allowed application API CORS origin | `http://localhost:5173` |
| `JWT_PUBLIC_KEY` | Base64-encoded RS256 verification key | Placeholder |
| `BYPASS_AUTH` | Development-only auth bypass | `false` in code |
| `TEST_USER_EMAIL` | Owner for development bypass | Placeholder |
| `MINIO_ENDPOINT` | Storage API host used by SDK/signing | `localhost` |
| `MINIO_PORT` | Storage API port | `9000` |
| `MINIO_ACCESS_KEY` | Backend-only storage access key | Development credential |
| `MINIO_SECRET_KEY` | Backend-only storage secret key | Development credential |
| `MINIO_BUCKET_NAME` | Private document bucket | `documents` |
| `MINIO_WEBHOOK_SECRET` | Shared storage-event secret | Weak development default |
| `MAX_FILE_SIZE_MB` | Authoritative size limit and policy maximum | `10` |
| `PRESIGNED_UPLOAD_EXPIRY_SECONDS` | POST policy lifetime | `600` |
| `PRESIGNED_VIEW_EXPIRY_SECONDS` | GET URL lifetime | `300` |
| `MAX_DOCS_PER_USER` | Quota across `PENDING` and `SUCCESS` | `2` |
| `PENDING_TTL_HOURS` | Abandoned reservation lifetime | `2` |

For a new project:

- Validate all required production variables at startup and reject placeholders or weak defaults.
- Separate `STORAGE_INTERNAL_ENDPOINT` from `STORAGE_PUBLIC_ENDPOINT` when containers use private DNS but browsers need a public URL.
- Configure SSL explicitly rather than deriving it only from the application environment.
- Add storage region, path-style/addressing mode, bucket, and public signing endpoint when the provider requires them.
- Keep the API CORS allowlist and storage bucket CORS as separate configuration.
- Put limits in an authenticated capabilities/config response if the UI must display them; do not duplicate backend environment values in source.

The current backend `.env.sample` omits every MinIO and upload-lifecycle variable. The current frontend has no `.env.example`; its README contains an incomplete template. A new project should keep checked-in, nonsecret examples synchronized with runtime validation.

## Backend implementation procedure

### 1. Authenticate before issuing a policy

Read the owner from the verified session/JWT. Do not accept `owner_id`, email, bucket, or object key in the request body.

### 2. Validate preflight metadata

Validate:

- Filename is nonempty, length-bounded, normalized for display, and never used as an object key.
- MIME type belongs to a server allowlist.
- Size is a positive integer and does not exceed the server limit.
- Owner is allowed to upload and is within quota.

Treat extension and MIME as hints. For high-risk content, verify bytes after upload.

### 3. Generate an opaque object key

Use a cryptographically random identifier, optionally namespaced by tenant:

```text
tenants/{tenant_id}/uploads/{uuid}
```

Do not include an unsanitized original filename. Store the display filename in the database.

### 4. Reserve metadata safely

Create a `PENDING` record with an expiry. Consider:

- An idempotency key to prevent duplicate reservations.
- A transaction or unique quota ledger when concurrent requests can exceed quota.
- Compensating deletion if signing fails after the DB insert.

The current `countDocuments` followed by `create` is race-prone under concurrent requests.

### 5. Sign the least-privileged policy

Bind:

- One bucket.
- One exact key.
- Short expiry.
- Size range.
- Expected content type.
- Optional checksum, encryption, object tags, or tenant metadata supported by the provider.

Return the document/upload ID, URL, fields, expiry, and a stable status endpoint. Do not return backend credentials.

### 6. Confirm completion

Choose an explicit system of record:

- **Webhook-first:** storage event performs an idempotent transition; client polls status.
- **Finalize endpoint:** client calls `POST /uploads/:id/complete`; backend performs `HEAD`, verifies key/size/type/checksum, and transitions. Keep storage events for reconciliation.
- **Queue pipeline:** event transitions to `UPLOADED`, scanning/processing transitions to `READY`.

Never trust a client-only `complete=true` body. Make transitions compare-and-set and safe under duplicate/out-of-order events.

### 7. Reconcile and clean up

Run periodic jobs for:

- Expired `PENDING` records with no object.
- Existing object with stale `PENDING` metadata.
- Object without a metadata row.
- `DELETE_PENDING` retries.
- Stuck scanning/processing states.

Use bucket lifecycle rules as defense in depth, not as the only application cleanup mechanism.

## Frontend implementation procedure

### 1. Validate for UX

Check selected file count, `file.type`, size, and optionally extension. Render limits obtained from the backend. Expect server validation to reject files even when client checks pass.

The current frontend hardcodes 10 MB and “2 documents”; these can drift from backend environment values. It also allows `image/jpg`, while the backend allows `image/jpeg`.

### 2. Request upload authorization

Send only:

```text
original_filename
mime_type
file_size
```

Use the application API client with session credentials.

### 3. Upload directly

Use a raw client without application auth headers. Include every signed field, append the file, and support cancellation and progress. Distinguish:

- Policy request failure.
- Storage CORS/network failure.
- Policy expiry/signature mismatch.
- Storage 4xx rejection.
- Confirmation timeout.

### 4. Wait for confirmed state

Do not discard the returned `documentId`. Poll `GET /uploads/:id` with bounded backoff, consume SSE/WebSocket status, or call a server-verified finalize endpoint.

Suggested UI states:

```text
validating -> authorizing -> uploading -> confirming -> ready
                                      \-> failed / cancelled
```

Only show “uploaded successfully” at `READY`/`SUCCESS`. If storage accepted the bytes but confirmation is delayed, show “Upload received; processing.”

### 5. Refresh the list

After confirmed state, invalidate the list query. If the API returns pending states in the list, optimistically insert the upload ID and reconcile it with server data.

## Authentication, authorization, and CORS

Resource Manager uses:

- A `token` cookie containing an RS256 JWT.
- `withCredentials: true` for backend calls.
- JWT `userInfo.userEmail` as the document owner.
- A development bypass guarded by `NODE_ENVIRONMENT=development` and `BYPASS_AUTH=true`.
- Ownership middleware for view and single delete.

For a new project:

- Prefer immutable internal user/tenant IDs over email.
- Use `Secure`, `HttpOnly`, and appropriate `SameSite` cookie settings in the auth service.
- Protect cookie-authenticated mutating API endpoints against CSRF.
- Apply owner/tenant filters in the database query, not only after loading a row.
- Never send cookies or authorization headers to the storage origin.
- Allow only known frontend origins on the application API.
- Configure storage CORS with exact production origins, required methods, required signed headers, exposed response headers, and a bounded cache age.
- Rate-limit policy creation, status polling, signing downloads, deletion, and webhook traffic separately.

## Storage and network topology

The URL returned to the browser must be reachable and TLS-valid from the browser. A hostname such as `minio`, `localhost`, or a cluster-internal service name often works for the backend but not for end users.

Production deployment must align:

1. The hostname used when signing.
2. The hostname present in the returned `postURL`.
3. DNS and TLS visible to the browser.
4. Storage CORS origin rules.
5. Reverse-proxy body-size and timeout settings.
6. Webhook connectivity from storage back to the API.

Resource Manager development uses:

- MongoDB on port `27017`.
- MinIO API on `9000` and console on `9001`.
- Bucket region `ap-south-1`.
- `host.docker.internal:3000/api/document/webhook` so the MinIO container can reach the host API.
- A `put` bucket event configured by `Docker/minio-setup.sh`.

Do not copy development credentials or the hardcoded webhook secret into production.

## Failure model

Design every boundary as independently fallible.

| Failure | Expected handling |
| --- | --- |
| DB reservation succeeds; signing fails | Delete or expire reservation; do not consume quota indefinitely |
| Policy reaches client; upload never starts | Expire `PENDING`; no object cleanup needed |
| Upload succeeds; webhook is delayed | Remain pending; poll/reconcile; do not claim final success |
| Upload succeeds; webhook is lost | `HEAD` reconciliation promotes or cleanup removes object |
| Duplicate webhook | Idempotent compare-and-set |
| Wrong bucket/key event | Ignore and log safely |
| Invalid webhook secret/schema | Reject without state changes |
| DB finalization fails after event | Retry event or reconciliation |
| Metadata TTL fires after object creation | Cleanup/reconciliation must prevent orphan object |
| Storage delete succeeds; DB delete fails | Retry DB transition; missing object remains an acceptable state |
| DB delete succeeds; storage delete fails | Avoid this order or persist durable deletion work |
| Policy expires during upload | Request a new policy; do not reuse old fields |
| User cancels | Abort HTTP request and optionally cancel reservation |

## Security checklist

- Private bucket; no anonymous list/read/write.
- Storage credentials available only to backend/secret manager.
- Short-lived, exact-key upload and download signatures.
- Server-side allowlist and positive size bounds.
- Signed POST conditions mirror validated request data.
- Random object keys; no path traversal or filename-derived keys.
- Authorization on every metadata, status, view, and delete request.
- Quota enforcement safe under concurrency.
- CSRF protection for cookie-authenticated mutations.
- Strict API and bucket CORS.
- TLS for browser-to-storage and storage-to-webhook traffic.
- Strong webhook authentication, validation, replay/idempotency handling, and network restriction.
- Filename sanitation for UI and `Content-Disposition`.
- Magic-byte detection and malware scanning before content becomes available when required.
- Checksums for integrity when supported.
- Encryption at rest and retention policy appropriate to the data.
- Logs exclude signatures, policy documents, access keys, secrets, cookies, and full download URLs.

## Observability

Emit structured logs and metrics keyed by internal upload ID and request ID, not by signed URL.

Track:

- Policy requests, denials by reason, and latency.
- Storage POST outcomes visible from client telemetry.
- Time from `PENDING` to confirmed state.
- Webhook accepted/rejected/ignored/retried counts.
- Stale pending count and age.
- Reconciliation promotions and deletions.
- Orphan object count and bytes.
- Delete retries.
- Per-owner quota denials.

Alert on webhook failure rate, confirmation latency, stale pending growth, reconciliation backlog, storage signing errors, and deletion backlog.

## Testing strategy

### Backend unit tests

- Request schema rejects missing, zero, negative, oversized, and unsupported input.
- Policy binds exact bucket/key/type/size/expiry.
- Object key is server-generated and collision-safe.
- Quota includes intended states and remains correct under concurrency.
- Unauthorized users cannot issue, view, list, or delete.
- Ownership cannot be bypassed by another valid user.
- Webhook secret and body schema are enforced.
- Wrong bucket/event/key is ignored.
- Duplicate webhook is idempotent.
- Confirmation rejects metadata mismatch when using `HEAD`.
- Content-Disposition handles quotes, Unicode, and control characters.
- Delete behavior persists retryable failures.

### Frontend unit/integration tests

- Client validation mirrors capabilities without being treated as authoritative.
- Policy fields are copied unchanged and the file is appended.
- Storage calls exclude backend cookies/auth headers.
- Multipart boundary is browser-generated.
- Progress, cancellation, policy, storage, and confirmation failures render distinct states.
- Returned upload ID is used until server confirmation.
- List refresh occurs after confirmation rather than storage POST alone.

### End-to-end tests

Run with a real S3-compatible development service:

1. Upload every allowed type.
2. Reject unsupported type, empty file, and oversized file.
3. Verify object key differs from filename.
4. Verify unauthenticated and cross-owner access fails.
5. Verify upload cannot alter bucket/key/type or exceed policy size.
6. Verify storage event transitions the exact record once.
7. Delay or disable the webhook and verify pending UI plus reconciliation.
8. Expire a policy before upload.
9. Delete one and all documents, including simulated storage failure.
10. Verify frontend-origin storage CORS and production-like public endpoint behavior.

Resource Manager currently has no document-specific automated tests. Backend `npm run typecheck`, `npm run lint`, and `npm run build` validate source but do not exercise the storage lifecycle.

## Resource Manager audit findings to address before copying

1. Frontend reports success after storage POST, while backend completion depends on a later webhook.
2. Frontend discards `documentId`, so it cannot poll the reserved upload.
3. Immediate query invalidation can return no new document because list filters to `SUCCESS`.
4. Frontend hardcodes 10 MB and quota text; backend values are environment-driven.
5. Frontend includes `image/jpg`; backend accepts `image/jpeg`.
6. Frontend passes an unused `mimeType` argument to `uploadToMinio`.
7. No upload progress, cancellation, bounded retry, or confirmation timeout exists.
8. DB reservation occurs before signing with no compensating delete if signing fails.
9. Quota uses count-then-create and can be exceeded by concurrent requests.
10. Abandoned `PENDING` records consume quota until TTL cleanup.
11. TTL can remove metadata but cannot remove an uploaded orphan object.
12. `FAILED` status is defined but never assigned.
13. Webhook body is typed as `any` and storage-reported MIME is not revalidated.
14. Weak storage and webhook defaults are accepted by application configuration.
15. Storage CORS is not documented alongside frontend setup.
16. Bulk deletion ignores individual storage failures and can orphan objects.
17. User-provided filename is interpolated into `Content-Disposition` without robust encoding.
18. Backend `.env.sample` and frontend environment documentation omit required upload setup.
19. The MinIO client derives SSL only from `NODE_ENVIRONMENT` and has no separate public signing endpoint.
20. There are no automated upload lifecycle tests or reconciliation jobs.

## New-project implementation checklist

1. Pick POST policy, PUT URL, or multipart deliberately.
2. Define upload states and the authoritative completion mechanism.
3. Define request/response schemas in a shared contract or generated client.
4. Create metadata schema and indexes.
5. Add startup-validated backend env variables and nonsecret examples.
6. Configure a private bucket, CORS, lifecycle, encryption, and event destination.
7. Implement authenticated policy issuance with server key generation and policy constraints.
8. Implement direct frontend upload with no application credentials.
9. Implement event/finalize verification, status endpoint, and frontend confirmation state.
10. Implement owner-authorized short-lived downloads.
11. Implement durable deletion and reconciliation.
12. Add metrics, structured logs, rate limits, and alerts.
13. Test policy tampering, cross-owner access, delayed/lost events, expiry, and cleanup.
14. Verify with production-like browser DNS, TLS, reverse proxy, and CORS.

When reviewing an implementation, trace one upload through every step and record the upload ID, DB state, exact signed constraints, storage request, event/finalize verification, final list response, download authorization, and deletion behavior. A successful storage POST alone is not proof that the application upload lifecycle is correct.
