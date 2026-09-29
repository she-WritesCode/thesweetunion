import { defineEventHandler, getRouterParam, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { sendWhatsApp } from "~~/dyrected/whatsapp";
import { sendEmail } from "~~/dyrected/mailer";
import { freeformReminderEmail } from "~~/dyrected/emails";

// Manual, admin-triggered send for one reservation — used by the "Send Reminder"
// action on the reservations collection. Sends exactly the channel + message the
// admin reviewed/edited in the dialog; does not group in other pending
// reminders for the same guest the way the automated daily job does, so the
// effect of a deliberate manual send stays predictable.
export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const reservationId = getRouterParam(event, "reservationId");
  if (!reservationId) {
    throw createError({ statusCode: 400, message: "Missing reservationId" });
  }

  const body = await readBody(event);
  const channel = body?.channel === "email" ? "email" : "whatsapp";
  const contact = (body?.contact || "").trim();
  const message = (body?.message || "").trim();
  const subject = (body?.subject || "").trim();

  if (!contact) {
    throw createError({ statusCode: 400, message: "No contact (phone number or email) to send to." });
  }
  if (!message) {
    throw createError({ statusCode: 400, message: "Message cannot be empty." });
  }

  const config = useRuntimeConfig();
  const client = createClient({ baseUrl: config.dyrectedUrl, apiKey: config.dyrectedApiKey });

  const res = await client.collection("reservations").find({ where: { id: { equals: reservationId } }, limit: 1 });
  const reservation = res.docs?.[0];
  if (!reservation) {
    throw createError({ statusCode: 404, message: "Reservation not found" });
  }

  if (channel === "email") {
    await sendEmail({
      to: contact,
      subject: subject || "A reminder about your gift",
      html: freeformReminderEmail({ bodyText: message }),
    });
  } else {
    await sendWhatsApp({ to: contact, text: message });
  }

  await client.collection("reservations").update(reservationId, { reminderSentAt: new Date().toISOString() });

  return { success: true, channel, contact };
});
