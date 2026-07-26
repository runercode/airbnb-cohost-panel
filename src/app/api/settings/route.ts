import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const store = await getStore();
  const settings = await store.allSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Forbidden" }, { status: 403 });
  }

  const store = await getStore();
  const body = await request.json();
  const settings: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    settings[key] = String(value);
  }
  await store.setSettings(settings);
  return NextResponse.json({ success: true });
}
