import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const store = await getStore();
  await store.deleteProperty(Number(params.id));
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const store = await getStore();
  const body = await request.json();
  const { name, address, ical_url } = body;
  await store.updateProperty(Number(params.id), { name, address, ical_url });
  return NextResponse.json({ success: true });
}
