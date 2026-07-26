import twilio from "twilio";

function getClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured");
  }

  return twilio(accountSid, authToken);
}

export async function sendSMS({
  to,
  body,
}: {
  to: string;
  body: string;
}) {
  try {
    const client = getClient();
    const from = process.env.TWILIO_PHONE_NUMBER!;
    const message = await client.messages.create({ body, to, from });
    return { success: true, sid: message.sid };
  } catch (error: any) {
    console.error("SMS send error:", error);
    return { success: false, error: error.message };
  }
}

export async function forwardGuestSMS({
  guestName,
  guestPhone,
  message,
  bookingDetails,
}: {
  guestName: string;
  guestPhone: string;
  message: string;
  bookingDetails: string;
}) {
  const forwardTo = process.env.FORWARD_TO_PHONE;
  if (!forwardTo) throw new Error("FORWARD_TO_PHONE not configured");

  return sendSMS({
    to: forwardTo,
    body: `[CoHost] ${guestName} (${guestPhone})\nBooking: ${bookingDetails}\nMsg: ${message}`,
  });
}

export async function notifyCleanerSMS({
  cleanerPhone,
  cleanerName,
  guestName,
  propertyName,
  scheduledDate,
}: {
  cleanerPhone: string;
  cleanerName: string;
  guestName: string;
  propertyName: string;
  scheduledDate: string;
}) {
  return sendSMS({
    to: cleanerPhone,
    body: `CoHost: ${cleanerName}, you're scheduled to clean ${propertyName} after ${guestName}'s checkout on ${scheduledDate}. Please confirm.`,
  });
}
