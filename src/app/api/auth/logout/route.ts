import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession, getLogoutCookieHeader } from "@/lib/auth";

const SESSION_COOKIE = "cohost_session";

export async function POST() {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await destroySession(sessionId);
  }

  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", getLogoutCookieHeader());
  return response;
}
