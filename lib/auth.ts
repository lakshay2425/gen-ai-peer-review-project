import { createRemoteJWKSet, jwtVerify, errors } from "jose";
import { cookies } from "next/headers";
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

export const PROTECTED_API_ROUTES = [
  "/api/user",
  "/api/user/:path*",
] as const;

export const PROTECTED_PAGE_ROUTES = ["/dashboard"] as const;

export function isProtectedPageRoute(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

// Cached for the lifetime of the server process (not re-fetched every request).
const JWKS = createRemoteJWKSet(
  new URL("https://authentication.lakshaymahajan.com/.well-known/jwks.json"),
);

export async function verifyAuthToken(token: string): Promise<AuthUser> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ["RS256"],
    });

    if (!payload || typeof payload === "string" || !("userInfo" in payload)) {
      throw new AuthError("Invalid token, please login again", 401);
    }

    return {
      userId: payload.sub as string,
      role: "user",
    };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    if (error instanceof errors.JWTExpired)
      throw new AuthError("Token has expired, please login again", 401);
    if (error instanceof errors.JOSEError)
      throw new AuthError("Invalid token, please login again", 401);
    console.error("Auth middleware error:", (error as Error).message);
    throw new AuthError("Internal server error", 500);
  }
}

export function getAuthUser(request: NextRequest): AuthUser {
  const rawUser = request.headers.get(AUTH_USER_HEADER);
  if (!rawUser) throw new Error("Authenticated user not found on request");
  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch (error) {
    console.error(
      "Failed to parse authenticated user from request headers:",
      error,
    );
    throw new Error(
      "Failed to parse authenticated user from request headers",
    );
  }
}

export function getAuthenticatedRequest(
  request: NextRequest,
): AuthenticatedRequest {
  return Object.assign(request, { user: getAuthUser(request) });
}

export async function getCurrentUserId(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    throw new AuthError("Not authenticated", 401);
  }

  const user = await verifyAuthToken(token);
  return user.userId;
}
