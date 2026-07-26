import nodemailer from "nodemailer";

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"CoHost Panel" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Email send error:", error);
    return { success: false, error: error.message };
  }
}

export async function forwardGuestMessage({
  guestName,
  guestEmail,
  message,
  bookingDetails,
}: {
  guestName: string;
  guestEmail: string;
  message: string;
  bookingDetails: string;
}) {
  const forwardTo = process.env.FORWARD_TO_EMAIL;
  if (!forwardTo) throw new Error("FORWARD_TO_EMAIL not configured");

  return sendEmail({
    to: forwardTo,
    subject: `[CoHost] Message from ${guestName} - ${bookingDetails}`,
    text: `Guest: ${guestName} (${guestEmail})\n\nBooking: ${bookingDetails}\n\nMessage:\n${message}\n\n---\nSent via CoHost Panel`,
  });
}

export async function notifyCleaner({
  cleanerEmail,
  cleanerName,
  guestName,
  propertyName,
  scheduledDate,
}: {
  cleanerEmail: string;
  cleanerName: string;
  guestName: string;
  propertyName: string;
  scheduledDate: string;
}) {
  return sendEmail({
    to: cleanerEmail,
    subject: `[CoHost] Cleaning Assignment - ${propertyName} on ${scheduledDate}`,
    text: `Hi ${cleanerName},\n\nYou have been scheduled to clean ${propertyName} after ${guestName}'s checkout on ${scheduledDate}.\n\nPlease confirm your availability.\n\nThanks,\nCoHost Panel`,
  });
}
