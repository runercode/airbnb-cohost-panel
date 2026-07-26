import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const store = await getStore();
  const user = await getSessionUser();
  const userId = user?.role === "client" ? user.id : undefined;
  const schedules = await store.allSchedule(userId);
  return NextResponse.json({ schedules });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const store = await getStore();
  const body = await request.json();
  const { booking_id, cleaner_id, scheduled_date, notes } = body;

  if (!booking_id || !scheduled_date) {
    return NextResponse.json({ error: "booking_id and scheduled_date are required" }, { status: 400 });
  }

  const entry = await store.insertScheduleEntry({ booking_id, cleaner_id: cleaner_id || null, scheduled_date, status: "scheduled", notes: notes || null });
  return NextResponse.json({ id: entry.id, ...body }, { status: 201 });
}
