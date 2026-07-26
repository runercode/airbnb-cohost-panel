import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const store = await getStore();
  await store.deleteCleaner(Number(params.id));
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const store = await getStore();
  const body = await request.json();
  const { name, email, phone, rate } = body;
  await store.updateCleaner(Number(params.id), { name, email, phone, rate });
  return NextResponse.json({ success: true });
}
