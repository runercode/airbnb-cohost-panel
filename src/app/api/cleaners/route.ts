import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const store = await getStore();
  const cleaners = await store.allCleaners();
  return NextResponse.json(cleaners);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const store = await getStore();
  const body = await request.json();
  const { name, email, phone, rate } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const c = await store.insertCleaner({ name, email: email || null, phone: phone || null, rate: rate || 0 });
  return NextResponse.json({ id: c.id, ...body }, { status: 201 });
}
