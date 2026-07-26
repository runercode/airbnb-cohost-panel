import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const store = await getStore();
  const user = await getSessionUser();
  const userId = user?.role === "client" ? user.id : undefined;
  const stats = await store.getDashboardStats(userId);
  return NextResponse.json({ stats });
}
