import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Forbidden" }, { status: 403 });
  }

  const { email, password, name } = await request.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
  }

  const store = await getStore();
  const existing = await store.findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const hash = hashPassword(password);
  const user = await store.insertUser({ email, password_hash: hash, name, role: "client" });

  return NextResponse.json({
    id: user.id,
    email,
    name,
    role: "client",
  }, { status: 201 });
}
