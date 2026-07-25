import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { users } from "@/db/models/user";
import { db } from "@/db/index";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ email: string }> },
) {
  const { email } = await params;

  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, decodeURIComponent(email)));

  if (result.length === 0) {
    return NextResponse.json({ exist: false }, { status: 200 });
  }

  return NextResponse.json({ exist: true }, { status: 200 });
}
