import { NextResponse } from "next/server";
import { getStore, Property } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const store = await getStore();
  const user = await getSessionUser();
  const userId = user?.role === "client" ? user.id : undefined;
  const properties = await store.allProperties(userId);
  return NextResponse.json({ properties });
}

export async function POST(request: Request) {
  const store = await getStore();
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { name, address, ical_url } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const ownerId = user.role === "admin" ? body.user_id || user.id : user.id;
  const prop = await store.insertProperty({ name, address: address || null, ical_url: ical_url || null, user_id: ownerId });

  return NextResponse.json({ id: prop.id, ...body }, { status: 201 });
}
