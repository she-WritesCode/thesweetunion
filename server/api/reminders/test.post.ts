import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { sendWhatsApp } from "~~/dyrected/whatsapp";
import { sendEmail } from "~~/dyrected/mailer";
import { wishlistReminderEmail } from "~~/dyrected/emails";

// Admin-only manual test send — lets the couple/planner send themselves a sample
// reminder to confirm the WhatsApp/email pipeline works, without touching real
// reservation records or reminderSentAt.
export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);
  const channel = body?.channel === "email" ? "email" : "whatsapp";
  const contact = (body?.contact || "").trim();
  const guestName = (body?.guestName || "Test Guest").trim();

  if (!contact) {
    throw createError({ statusCode: 400, message: "Please provide a contact (phone number or email)." });
  }

  const config = useRuntimeConfig();
  const client = createClient({ baseUrl: config.dyrectedUrl, apiKey: config.dyrectedApiKey });
  const appUrl = (config.public as any).appUrl || "http://localhost:3000";

  const settingsRes = await client.collection("site_settings").find({ limit: 1, depth: 1 });
  const settings: any = settingsRes.docs?.[0] || {};
  const coupleNames = [settings.partnerOneName, settings.partnerTwoName].filter(Boolean).join(" & ") || "the couple";
  const senderName = settings.whatsappSenderName || "the wedding team";
  const bankName = settings.bankName || "";
  const accountNumber = settings.accountNumber || "";
  const accountName = settings.accountName || "";

  // Sample line items — this is a test send, not tied to a real reservation.
  const items = [
    { name: "Sample Gift Item", amount: 15000 },
    { name: "Another Sample Item", amount: 8500 },
  ];
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const wishlistLink = `${appUrl}/wishlist`;

  if (channel === "email") {
    await sendEmail({
      to: contact,
      subject: `[TEST] A reminder about your gift to ${coupleNames}`,
      html: wishlistReminderEmail({
        guestName,
        senderName,
        coupleNames,
        items,
        total,
        bankName,
        accountNumber,
        accountName,
        wishlistLink,
      }),
    });
  } else {
    const itemLines = items.map((i) => `- ${i.name} — ₦${i.amount.toLocaleString("en-US")}`).join("\n");
    const bankLines = bankName || accountNumber || accountName
      ? `\n\nYou can make payment using the details below:\n\nBank: ${bankName}\nAccount Number: ${accountNumber}\nAccount Name: ${accountName}`
      : "";
    await sendWhatsApp({
      to: contact,
      text:
        `[TEST] Hi ${guestName} 😊\n\n` +
        `This is ${senderName}. I'm reaching out regarding the wedding of ${coupleNames}. ` +
        `You recently reserved a gift on their wedding registry and asked for a reminder, so here it is. 😊\n\n` +
        `You reserved:\n\n${itemLines}\n\nTotal: ₦${total.toLocaleString("en-US")}` +
        `${bankLines}\n\n` +
        `Thank you so much for celebrating with ${coupleNames}! \n#thesweetunion 🤍`,
    });
  }

  return { success: true, channel, contact };
});
