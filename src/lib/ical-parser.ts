import ical from "node-ical";
import { getStore } from "./db";

interface ParsedEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  description?: string;
}

export async function fetchAndParseICal(url: string): Promise<ParsedEvent[]> {
  const response = await fetch(url, {
    headers: { "User-Agent": "CoHost-Panel/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch iCal: ${response.status} ${response.statusText}`);
  }

  const icsData = await response.text();
  const events = ical.sync.parseICS(icsData);
  const parsed: ParsedEvent[] = [];

  for (const key in events) {
    const event = events[key];
    if (event.type === "VEVENT") {
      parsed.push({
        uid: event.uid || `${event.start.toISOString()}-${event.end.toISOString()}`,
        summary: event.summary || "Reserved",
        start: event.start,
        end: event.end,
        description: event.description,
      });
    }
  }

  return parsed;
}

export async function syncBookingsFromICal(propertyId: number, events: ParsedEvent[]) {
  const store = await getStore();
  let imported = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const autoScheduleEnabled = (await store.getSetting("auto_schedule_cleaning")) !== "false";

  for (const event of events) {
    const startDate = event.start;
    if (startDate < today) continue;

    const existing = await store.findBookingByIcalUid(event.uid);
    if (existing) continue;

    const booking = await store.insertBooking({
      property_id: propertyId,
      guest_name: event.summary,
      check_in: event.start.toISOString().split("T")[0],
      check_out: event.end.toISOString().split("T")[0],
      source: "ical",
      ical_uid: event.uid,
      guest_email: null,
      guest_phone: null,
      status: "confirmed",
      notes: null,
    });
    imported++;

    if (autoScheduleEnabled) {
      await store.insertScheduleEntry({
        booking_id: booking.id,
        cleaner_id: null,
        scheduled_date: event.end.toISOString().split("T")[0],
        status: "scheduled",
        notes: null,
      });
    }
  }

  return imported;
}
