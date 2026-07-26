import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const store = await getStore();
  const body = await request.json();
  const { cleaner_id, scheduled_date, status, notes } = body;
  await store.updateScheduleEntry(Number(params.id), { cleaner_id, scheduled_date, status, notes });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const store = await getStore();
  await store.deleteScheduleEntry(Number(params.id));
  return NextResponse.json({ success: true });
}
