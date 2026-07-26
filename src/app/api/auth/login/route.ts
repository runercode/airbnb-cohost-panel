import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { verifyPassword, createSession, getSessionCookieHeader } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const store = await getStore();
  const user = await store.findUserByEmail(email);

  if (!user || !verifyPassword(password, user.password_hash!)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const sessionId = await createSession(user.id);
  const response = NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });

  response.headers.set("Set-Cookie", getSessionCookieHeader(sessionId));
  return response;
}
