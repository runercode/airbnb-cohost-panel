import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const store = await getStore();
  await store.deleteBooking(Number(params.id));
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const store = await getStore();
  const body = await request.json();
  const { guest_name, guest_email, guest_phone, check_in, check_out, status, notes } = body;

  const existing = await store.findBookingById(Number(params.id));
  if (!existing) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  await store.updateBooking(Number(params.id), { guest_name, guest_email, guest_phone, check_in, check_out, status, notes });
  return NextResponse.json({ success: true });
}
