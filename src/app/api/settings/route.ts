import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export async function GET() {
  const store = await getStore();
  const settings = await store.allSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const store = await getStore();
  const body = await request.json();
  const settings: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    settings[key] = String(value);
  }
  await store.setSettings(settings);
  return NextResponse.json({ success: true });
}
