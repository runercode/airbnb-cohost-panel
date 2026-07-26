import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

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
  const { cleaner_id, scheduled_date, status, notes } = body;
  await store.updateScheduleEntry(Number(params.id), { cleaner_id, scheduled_date, status, notes });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const store = await getStore();
  await store.deleteScheduleEntry(Number(params.id));
  return NextResponse.json({ success: true });
}
