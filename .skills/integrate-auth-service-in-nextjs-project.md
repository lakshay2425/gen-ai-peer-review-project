---
name: nextjs-auth-service-integration
description: Integrate the external Google-OAuth + RS256-JWT auth service into a new Next.js (App Router) project. Covers the JWT-verifying proxy/middleware, the users database table and endpoints, the frontend auth context + Google login hook, the axios client, and every environment variable required. Use this when starting a new Next.js app that must authenticate against the same shared auth service used by the Ideas Management Platform.
---

# Integrating the Auth Service into a New Next.js Project

This skill reproduces the complete authentication setup from the Ideas Management Platform so you can drop it into a fresh Next.js App Router project without re-deriving the architecture.

## How the auth model works (read first)

Authentication is split between **two systems**:

1. **The external auth service** (a separate deployment, NOT this repo). It:
   - Runs Google OAuth: you send it the Google `auth-code`, it exchanges the code, and returns the user's profile (`userInfo`).
   - Issues an **RS256-signed JWT** and sets it as an **HTTP-only cookie named `token`** on the browser.
   - Exposes `GET /auth/google/callback` and `POST /users/logout`.
   - Holds the JWT **private** key. Your Next.js app only ever gets the **public** key.

2. **Your Next.js app** (what this skill sets up). It:
   - Never signs or issues tokens. It only **verifies** the `token` cookie using the RS256 **public key** (`jose` + `importSPKI`).
   - Runs a proxy/middleware that guards protected routes, verifies the JWT, and forwards the decoded user to API route handlers via an `x-auth-user` header.
   - Owns its **own `users` table**. After the auth service confirms a Google login, the app upserts a matching row keyed by the JWT `sub` (the auth service's user id).

### Request flow

```
Browser ── Google OAuth popup ──▶ Google
   │  auth-code
   ▼
Next.js frontend (useGoogleAuth)
   │  GET {AUTH_URL}/auth/google/callback?code=...&businessName=...
   ▼
External auth service ── sets HTTP-only `token` cookie (RS256 JWT) ──▶ Browser
   │  returns userInfo
   ▼
Frontend stores userInfo in localStorage, then:
   - GET /api/user/{email}  → does this user exist in our DB?
   - if not, POST /api/user → create the row
   ▼
Later protected requests carry the `token` cookie automatically
   ▼
proxy.ts verifies JWT → injects x-auth-user header → API route reads it
```

The key insight: **the cookie is set by the auth service, sent automatically by the browser (`withCredentials: true`), and verified by your middleware.** Your app is a pure verifier + user-profile store.

---

## Step 1 — Dependencies

```bash
pnpm add jose axios @react-oauth/google @tanstack/react-query react-hot-toast drizzle-orm postgres
pnpm add -D drizzle-kit dotenv
```

- `jose` — RS256 JWT verification
- `@react-oauth/google` — Google OAuth popup + `auth-code` flow
- `axios` — HTTP client with cookie credentials
- `drizzle-orm` + `postgres` + `drizzle-kit` — users table & migrations
- `@tanstack/react-query`, `react-hot-toast` — data fetching & toasts used by the hooks below

---

## Step 2 — Environment variables

Create `.env`:

```bash
# Postgres connection string for the users table
DATABASE_URL=postgresql://user:password@localhost:5432/your_db

# Base64-encoded PEM of the auth service's RS256 PUBLIC key.
# Get this from the auth service. It must be the SPKI/PEM public key,
# base64-encoded (encode the whole "-----BEGIN PUBLIC KEY----- ..." block).
JWT_PUBLIC_KEY=LS0tLS1CRUdJTiBQVUJMSUMgS0VZ...

# Google OAuth client id (same client id registered with the auth service)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Your app's own public URL (axios baseURL). Empty string also works for same-origin.
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Base URL of the external auth service
NEXT_PUBLIC_AUTH_URL=https://auth.yourdomain.com

# Business/tenant name passed to the auth service on callback (optional; has a default)
NEXT_PUBLIC_BUSINESS_NAME=YourAppName
```

> To produce `JWT_PUBLIC_KEY`: take the auth service's public key PEM file and run
> `base64 -w0 public_key.pem` (Linux) or `base64 -i public_key.pem` (macOS), then paste the output.

Environment variable summary:

| Variable | Where used | Purpose |
|---|---|---|
| `DATABASE_URL` | server | Postgres connection for the users table |
| `JWT_PUBLIC_KEY` | server (middleware) | Verify RS256 JWTs from the `token` cookie |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | client | Google OAuth provider |
| `NEXT_PUBLIC_APP_URL` | client | axios baseURL |
| `NEXT_PUBLIC_AUTH_URL` | client | External auth service base URL |
| `NEXT_PUBLIC_BUSINESS_NAME` | client | Tenant name sent on OAuth callback |

---

## Step 3 — Database: users table

`src/db/models/user.ts`:

```ts
import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    // id is the auth service's user id (JWT `sub`), NOT a generated uuid
    id: varchar("id").primaryKey(),
    role: varchar("role").notNull().default("user"),
    fullName: varchar("full_name").notNull(),
    email: varchar("email").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

> Critical: the primary key `id` is a `varchar`, not a generated uuid, because it stores the **auth service's** user id (the JWT `sub`). This is what ties your local user row to the identity the auth service issued.

`src/db/schema.ts`:

```ts
export * from "./models/user";
// ...export your other models here
```

`src/app/index.ts` (db client):

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL environment variable is not set");
const client = postgres(DB_URL, { prepare: false });
export const db = drizzle(client, { schema });
```

`drizzle.config.ts`:

```ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

Generate and run the migration:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## Step 4 — JWT verification library

`src/lib/auth.ts` — the reusable verification core. Copy verbatim:

```ts
import { jwtVerify, importSPKI, errors } from "jose";
import type { NextRequest } from "next/server";

export const AUTH_COOKIE_NAME = "token";
export const AUTH_USER_HEADER = "x-auth-user";

export type AuthUser = {
  userId: string;
  role: string;
};

export type AuthenticatedRequest = NextRequest & { user: AuthUser };

export class AuthError extends Error {
  readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

// List every API route prefix that must require a valid token
export const PROTECTED_API_ROUTES = [
  "/api/user",
  "/api/user/:path*",
  // add your app's protected API routes here, e.g. "/api/products"
] as const;

// List every page route that must require a valid token
export const PROTECTED_PAGE_ROUTES = ["/dashboard"] as const;

export function isProtectedPageRoute(pathname: string): boolean {
  // adjust to your protected page prefixes
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

let cachedPublicKey: Awaited<ReturnType<typeof importSPKI>> | null = null;

async function getPublicKey() {
  if (cachedPublicKey) return cachedPublicKey;

  const base64PublicKey = process.env.JWT_PUBLIC_KEY;
  if (!base64PublicKey) {
    throw new Error("JWT_PUBLIC_KEY environment variable is not set.");
  }
  try {
    const pemKey = Buffer.from(base64PublicKey, "base64").toString("utf-8");
    cachedPublicKey = await importSPKI(pemKey, "RS256");
    return cachedPublicKey;
  } catch (error) {
    console.error("Failed to import JWT_PUBLIC_KEY:", error);
    throw new Error("Failed to import JWT_PUBLIC_KEY. Ensure it is a valid base64-encoded PEM string.");
  }
}

export function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export async function verifyAuthToken(token: string): Promise<AuthUser> {
  try {
    const publicKey = await getPublicKey();
    const { payload } = await jwtVerify(token, publicKey, { algorithms: ["RS256"] });

    if (!payload || typeof payload === "string" || !("userInfo" in payload)) {
      throw new AuthError("Invalid token, please login again", 401);
    }

    return {
      userId: payload.sub as string, // auth service's user id
      role: "user",
    };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    if (error instanceof errors.JWTExpired) throw new AuthError("Token has expired, please login again", 401);
    if (error instanceof errors.JOSEError) throw new AuthError("Invalid token, please login again", 401);
    console.error("Auth middleware error:", (error as Error).message);
    throw new AuthError("Internal server error", 500);
  }
}

// Read the decoded user that the proxy injected into the request headers
export function getAuthUser(request: NextRequest): AuthUser {
  const rawUser = request.headers.get(AUTH_USER_HEADER);
  if (!rawUser) throw new Error("Authenticated user not found on request");
  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch (error) {
    console.error("Failed to parse authenticated user from request headers:", error);
    throw new Error("Failed to parse authenticated user from request headers");
  }
}

export function getAuthenticatedRequest(request: NextRequest): AuthenticatedRequest {
  return Object.assign(request, { user: getAuthUser(request) });
}
```

Notes:
- The public key is cached across invocations (`cachedPublicKey`) so it's imported once.
- `verifyAuthToken` requires the payload to contain `userInfo` — this matches the shape the auth service signs. Adjust if your auth service uses a different claim.
- The decoded user id comes from the JWT `sub` claim.

---

## Step 5 — The proxy (Next.js middleware)

In **Next.js 16 the middleware file is named `proxy.ts`** (older versions use `middleware.ts`). Place it at `src/proxy.ts`:

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_USER_HEADER,
  AuthError,
  isProtectedApiRoute,
  isProtectedPageRoute,
  verifyAuthToken,
} from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = isProtectedApiRoute(pathname);
  const isPage = isProtectedPageRoute(pathname);

  if (!isApi && !isPage) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    if (isPage) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await verifyAuthToken(token);

    if (isPage) return NextResponse.next();

    // For API routes: forward the decoded user to the route handler
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(AUTH_USER_HEADER, JSON.stringify(user));
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (error) {
    if (isPage) return NextResponse.redirect(new URL("/", request.url));
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const config = {
  matcher: [
    "/api/user/:path*",
    "/dashboard",
    "/dashboard/:path*",
    // add your other protected matchers here
  ],
};
```

> If your Next.js version predates the `proxy.ts` rename, name the file `middleware.ts` and export `middleware` instead of `proxy`. The body is identical.

How it works:
- **Protected pages** without a valid token → redirect to `/`.
- **Protected API routes** without a valid token → `401 JSON`.
- **Valid token** → the decoded `{ userId, role }` is serialized into the `x-auth-user` request header, which route handlers read via `getAuthenticatedRequest`.
- Keep the `config.matcher` list in sync with `PROTECTED_API_ROUTES` / `isProtectedPageRoute`.

---

## Step 6 — User API endpoints

`src/app/api/user/route.ts` — get current user, create user (upsert), delete user:

```ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { users } from "@/db/models/user";
import { eq, and } from 'drizzle-orm/sql/expressions/conditions';
import { db } from "@/app/index";
import { getAuthenticatedRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
    const { user } = getAuthenticatedRequest(request);
    const result = await db
        .select({ id: users.id, role: users.role, fullName: users.fullName, createdAt: users.createdAt, updatedAt: users.updatedAt })
        .from(users)
        .where(and(eq(users.id, user.userId)));
    if (!result || result.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(result[0], { status: 200 });
}

export async function POST(request: NextRequest) {
    const { email, fullName, role = "user" } = await request.json();
    const { user } = getAuthenticatedRequest(request);
    const userId = user.userId;

    const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
    if (existingUser.length > 0) {
        return NextResponse.json({ message: "User already exists" }, { status: 200 });
    }

    const result = await db.insert(users).values({ id: userId, email, fullName, role }).returning({ id: users.id });
    if (!result || result.length === 0) {
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
    return NextResponse.json({ message: "User created successfully" }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
    const { user } = getAuthenticatedRequest(request);
    const result = await db.delete(users).where(and(eq(users.id, user.userId))).returning({ id: users.id });
    if (result.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
}
```

`src/app/api/user/[email]/route.ts` — existence check used right after login:

```ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { users } from "@/db/models/user";
import { eq } from 'drizzle-orm/sql/expressions/conditions';
import { db } from "@/app/index";

export async function GET(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
    const { email } = await params;
    const result = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (result.length === 0) return NextResponse.json({ exist: false }, { status: 200 });
    return NextResponse.json({ exist: true }, { status: 200 });
}
```

> The `POST /api/user` handler derives the row's `id` from the verified JWT (`user.userId`), never from the request body — a client cannot forge another user's id. The `[email]` existence check is intentionally lightweight and is the only user route that is safe to leave unprotected (it leaks only a boolean); if you prefer, add `/api/user/:path*` to the matcher (as shown) so it too requires a token.

---

## Step 7 — Frontend HTTP client & services

`src/lib/axiosInstance.ts` — **`withCredentials: true` is mandatory** so the `token` cookie rides along:

```ts
import axios from 'axios';

export const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || '',
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});
```

`src/lib/getApiErrorMessage.ts` — consistent error extraction:

```ts
import axios from 'axios';

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

export function getApiErrorMessage(error: unknown, fallback = DEFAULT_MESSAGE): string {
    if (axios.isAxiosError(error)) {
        const apiError = error.response?.data as { error?: string } | undefined;
        if (apiError?.error) return apiError.error;
        return fallback;
    }
    if (error instanceof Error && error.message && !error.message.includes('Request failed')) {
        return error.message;
    }
    return fallback;
}
```

`src/services/api.ts` — the `userApi` and `authApi` calls (trim to what you need):

```ts
import { axiosInstance } from '@/lib/axiosInstance';

export const userApi = {
    getCurrent: async () => {
        const { data } = await axiosInstance.get('/api/user');
        return data as { id: string; role: string; fullName: string; createdAt: string; updatedAt: string };
    },
    getByEmail: async (email: string) => {
        const { data } = await axiosInstance.get<{ exist: boolean }>(`/api/user/${encodeURIComponent(email)}`);
        return data;
    },
    create: async (payload: { email: string; fullName: string; role?: string }) => {
        const { data } = await axiosInstance.post<{ message: string }>('/api/user', payload);
        return data;
    },
    delete: async () => {
        await axiosInstance.delete('/api/user');
    },
};

export const authApi = {
    googleCallback: async (code: string, businessName: string) => {
        const authService = process.env.NEXT_PUBLIC_AUTH_URL;
        if (!authService) throw new Error('NEXT_PUBLIC_AUTH_URL environment variable is not set');

        const { data } = await axiosInstance.get<{
            userInfo: {
                profileImage: string | null;
                username: string;
                name: string;
                email: string;
            };
        }>(`${authService}/auth/google/callback`, { params: { code, businessName } });

        return data;
    },
    logout: async () => {
        const authService = process.env.NEXT_PUBLIC_AUTH_URL;
        if (!authService) throw new Error('NEXT_PUBLIC_AUTH_URL environment variable is not set');
        await axiosInstance.post(`${authService}/users/logout`);
    },
};
```

> `googleCallback` and `logout` hit the **external auth service** directly (absolute URL from `NEXT_PUBLIC_AUTH_URL`). Because `withCredentials` is on, the auth service can set/clear the HTTP-only `token` cookie in the browser. Everything else (`/api/user...`) hits your own Next.js API.

---

## Step 8 — Auth context (session state)

`src/context/AuthContext.tsx` — holds the user profile in React state + localStorage, and exposes `createUser` / `logout`:

```tsx
"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { userApi, authApi } from "@/services/api";

export type StoredUserInfo = {
  profilePic: string | null;
  username: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  user: StoredUserInfo | null;
  setIsAuthenticated: (value: boolean) => void;
  setUser: (value: StoredUserInfo | null) => void;
  createUser: (email: string, fullName: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const USER_INFO_KEY = "userInfo";

function readStoredAuthState(): { user: StoredUserInfo | null; isAuthenticated: boolean } {
  try {
    const storedUser = localStorage.getItem(USER_INFO_KEY);
    if (storedUser) {
      return { user: JSON.parse(storedUser) as StoredUserInfo, isAuthenticated: true };
    }
  } catch (error) {
    console.error("Failed to read stored auth state:", error);
  }
  return { user: null, isAuthenticated: false };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUserState] = useState<StoredUserInfo | null>(() => readStoredAuthState().user);
  const [isAuthenticated, setIsAuthenticated] = useState(() => readStoredAuthState().isAuthenticated);

  const setUser = useCallback((value: StoredUserInfo | null) => {
    setUserState(value);
    if (value === null) localStorage.removeItem(USER_INFO_KEY);
    else localStorage.setItem(USER_INFO_KEY, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("localStorage-change", { detail: { key: USER_INFO_KEY, value } }));
  }, []);

  const createUser = useCallback(async (email: string, fullName: string, role = "user") => {
    await userApi.create({ email, fullName, role });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
      setUser(null);
      setIsAuthenticated(false);
      router.push("/");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong!");
    }
  }, [router, setUser]);

  const value = useMemo(
    () => ({ isAuthenticated, user, setIsAuthenticated, setUser, createUser, logout }),
    [createUser, isAuthenticated, logout, setUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
```

> Note: `isAuthenticated` here is a **client-side UX signal only** (drives what the UI shows). Real authorization is always enforced server-side by the proxy verifying the `token` cookie. Never trust `localStorage` for access control.

---

## Step 9 — Google login hook

`src/hooks/useGoogleAuth.ts` — orchestrates the full login sequence:

```ts
"use client";

import { useState } from "react";
import { useGoogleLogin, type CodeResponse } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { authApi, userApi } from "@/services/api";

const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "YourAppName";

export function useGoogleAuth() {
  const { setIsAuthenticated, setUser, createUser } = useAuth();
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const googleResponse = async (authResult: CodeResponse) => {
    setIsAuthenticating(true);
    try {
      if (!authResult.code) throw new Error("Missing Google authorization code");

      // 1. Exchange the code with the auth service (also sets the token cookie)
      const data = await authApi.googleCallback(authResult.code, businessName);

      // 2. Store profile locally for UI
      setUser({
        profilePic: data.userInfo.profileImage,
        username: data.userInfo.username,
        name: data.userInfo.name,
        email: data.userInfo.email,
      });
      setIsAuthenticated(true);

      // 3. Ensure a matching row exists in our own users table
      const doesUserExist = await userApi.getByEmail(data.userInfo.email);
      if (!doesUserExist.exist) {
        await createUser(data.userInfo.email, data.userInfo.name);
      }

      toast.success("Logged in successfully");
      router.push("/dashboard"); // change to your post-login route
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong!");
      setIsAuthenticating(false);
    }
  };

  const handleGoogleError = (error: { error?: string }) => {
    if (error.error === "popup_closed_by_user" || error.error === "access_denied") {
      toast.error("Account selection canceled.");
      return;
    }
    console.error("Google Login Error:", error);
    toast.error("Google login failed.");
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: googleResponse,
    onError: handleGoogleError,
    flow: "auth-code", // MUST be auth-code so the server can exchange it
  });

  return { handleGoogleLogin, isAuthenticating };
}
```

The `flow: "auth-code"` is important — it makes Google return a one-time code that the auth service exchanges server-side, rather than an access token exposed to the browser.

---

## Step 10 — Providers & layout wiring

`src/app/providers.tsx`:

```tsx
"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  if (!googleClientId) {
    throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable is not set");
  }
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <Toaster position="top-center" />
        </AuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
```

`src/app/layout.tsx` — wrap the app:

```tsx
import Providers from "./providers";
import "./globals.css";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## Step 11 — A login button

Anywhere in a client component:

```tsx
"use client";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";

export function LoginButton() {
  const { handleGoogleLogin, isAuthenticating } = useGoogleAuth();
  return (
    <button onClick={() => handleGoogleLogin()} disabled={isAuthenticating}>
      {isAuthenticating ? "Signing in..." : "Continue with Google"}
    </button>
  );
}
```

To read the session in any client component: `const { user, isAuthenticated, logout } = useAuth();`

To read the authenticated user in any protected API route:

```ts
import { getAuthenticatedRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user } = getAuthenticatedRequest(request); // { userId, role }
  // ...use user.userId to scope DB queries
}
```

---

## Integration checklist

- [ ] Installed dependencies (Step 1)
- [ ] All 6 env vars set; `JWT_PUBLIC_KEY` is the base64 of the auth service's **public** PEM (Step 2)
- [ ] `users` table created and migrated; PK is `varchar` holding the JWT `sub` (Step 3)
- [ ] `src/lib/auth.ts` copied; `PROTECTED_API_ROUTES`, `isProtectedPageRoute`, and `verifyAuthToken`'s expected claim adjusted for your app (Step 4)
- [ ] `src/proxy.ts` (or `middleware.ts`) added; `config.matcher` matches your protected routes (Step 5)
- [ ] `/api/user` and `/api/user/[email]` routes added (Step 6)
- [ ] axios instance uses `withCredentials: true` (Step 7)
- [ ] `authApi.googleCallback` / `authApi.logout` point at `NEXT_PUBLIC_AUTH_URL` (Step 7)
- [ ] `AuthProvider`, `GoogleOAuthProvider`, `QueryClientProvider` wrap the app (Steps 8, 10)
- [ ] `useGoogleAuth` uses `flow: "auth-code"` and redirects to your post-login route (Step 9)

## Common pitfalls

- **Cookie not sent:** forgetting `withCredentials: true` on axios — protected requests will 401.
- **CORS on the auth service:** the auth service must allow your app's origin with credentials, or the `Set-Cookie` will be dropped by the browser.
- **Wrong key:** `JWT_PUBLIC_KEY` must be the **public** key, base64-encoded PEM, matching the algorithm `RS256`. A private key or raw (non-base64) PEM will fail `importSPKI`.
- **Matcher drift:** if a route is in `PROTECTED_API_ROUTES` but not in `config.matcher` (or vice-versa), it silently won't be guarded. Keep them in sync.
- **Claim shape:** `verifyAuthToken` rejects tokens without a `userInfo` claim. If your auth service signs a different payload, update that guard and the `userId`/`role` extraction.
- **Next.js version:** middleware is `proxy.ts` in Next 16, `middleware.ts` earlier. Use the right filename/export for your version.
