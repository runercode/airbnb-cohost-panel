import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const store = await getStore();
  const user = await getSessionUser();
  const userId = user?.role === "client" ? user.id : undefined;
  const bookings = await store.allBookings(userId);
  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const store = await getStore();
  const body = await request.json();
  const { property_id, guest_name, guest_email, guest_phone, check_in, check_out, notes } = body;

  if (!property_id || !check_in || !check_out) {
    return NextResponse.json({ error: "property_id, check_in, and check_out are required" }, { status: 400 });
  }

  const booking = await store.insertBooking({
    property_id, guest_name: guest_name || "Guest", guest_email: guest_email || null,
    guest_phone: guest_phone || null, check_in, check_out, source: "manual",
    ical_uid: null, status: "confirmed", notes: notes || null,
  });

  // Auto-schedule cleaning on checkout date if enabled
  const autoSchedule = await store.getSetting("auto_schedule_cleaning");
  if (autoSchedule !== "false") {
    await store.insertScheduleEntry({ booking_id: booking.id, cleaner_id: null, scheduled_date: check_out, status: "scheduled", notes: null });
  }

  return NextResponse.json({ id: booking.id, ...body }, { status: 201 });
}
