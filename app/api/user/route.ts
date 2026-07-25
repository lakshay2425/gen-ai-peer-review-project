import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { users } from "@/db/models/user";
import { db } from "@/db/index";
import { getAuthenticatedRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user } = getAuthenticatedRequest(request);

  const result = await db
    .select({
      id: users.id,
      role: users.role,
      fullName: users.fullName,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(and(eq(users.id, user.userId)));

  if (!result || result.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(result[0], { status: 200 });
}

export async function POST(request: NextRequest) {
  const { email, fullName, role = "user" } = await request.json();
  const { user } = getAuthenticatedRequest(request);
  const userId = user.userId;

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId));

  if (existingUser.length > 0) {
    return NextResponse.json({ message: "User already exists" }, { status: 200 });
  }

  const result = await db
    .insert(users)
    .values({ id: userId, email, fullName, role })
    .returning({ id: users.id });

  if (!result || result.length === 0) {
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "User created successfully" }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { user } = getAuthenticatedRequest(request);

  const result = await db
    .delete(users)
    .where(and(eq(users.id, user.userId)))
    .returning({ id: users.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
