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

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(AUTH_USER_HEADER, JSON.stringify(user));
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (error) {
    if (isPage) return NextResponse.redirect(new URL("/", request.url));
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const config = {
  matcher: [
    "/api/user/:path*",
    "/dashboard",
    "/dashboard/:path*",
  ],
};
