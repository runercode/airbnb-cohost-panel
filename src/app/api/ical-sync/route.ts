import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { fetchAndParseICal, syncBookingsFromICal } from "@/lib/ical-parser";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { property_id } = await request.json();

  if (!property_id) {
    return NextResponse.json({ error: "property_id is required" }, { status: 400 });
  }

  const store = await getStore();
  const property = await store.findPropertyById(property_id);

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const icalUrl = property.ical_url || process.env.AIRBNB_ICAL_URL;
  if (!icalUrl) {
    return NextResponse.json({ error: "No iCal URL configured. Set it in Settings or .env" }, { status: 400 });
  }

  try {
    const events = await fetchAndParseICal(icalUrl);
    const imported = await syncBookingsFromICal(property_id, events);
    return NextResponse.json({ success: true, imported, total: events.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
