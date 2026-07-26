import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { forwardGuestMessage } from "@/lib/email";
import { forwardGuestSMS } from "@/lib/sms";

export async function GET() {
  const store = await getStore();
  const user = await getSessionUser();
  const userId = user?.role === "client" ? user.id : undefined;
  const messages = await store.allMessages(userId);
  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const store = await getStore();
  const body = await request.json();
  const { booking_id, direction, channel, content } = body;

  if (!booking_id || !direction || !channel || !content) {
    return NextResponse.json({ error: "booking_id, direction, channel, and content are required" }, { status: 400 });
  }

  const msg = await store.insertMessage({ booking_id, direction, channel, content });

  if (direction === "outbound") {
    const booking = await store.findBookingById(booking_id);
    if (booking) {
      const bookingDetails = `${booking.guest_name} - ${booking.check_in} to ${booking.check_out}`;
      if (channel === "email") {
        await forwardGuestMessage({ guestName: booking.guest_name, guestEmail: booking.guest_email || "unknown", message: content, bookingDetails }).catch(console.error);
      } else if (channel === "sms") {
        await forwardGuestSMS({ guestName: booking.guest_name, guestPhone: booking.guest_phone || "unknown", message: content, bookingDetails }).catch(console.error);
      }
    }
  }

  return NextResponse.json({ id: msg.id, ...body }, { status: 201 });
}
