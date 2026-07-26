import { getStore, User } from "./db";
import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "cohost_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export function hashPassword(password: string): string {
  const bcrypt = require("bcryptjs");
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  const bcrypt = require("bcryptjs");
  return bcrypt.compareSync(password, hash);
}

export async function createSession(userId: number): Promise<string> {
  const store = await getStore();
  const sessionId = crypto.randomUUID();
  await store.createSession(userId, sessionId);
  return sessionId;
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const store = await getStore();
  return store.getSessionUser(sessionId);
}

export async function requireAuth(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}

export function getSessionCookieHeader(sessionId: string): string {
  return `${SESSION_COOKIE}=${sessionId}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE / 1000}; SameSite=Lax`;
}

export function getLogoutCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

export async function destroySession(sessionId: string) {
  const store = await getStore();
  await store.destroySession(sessionId);
}
