import { defineEventHandler, readBody, createError } from "h3";
import { requireAdmin } from "~~/server/utils/require-admin";
import { sendWhatsApp, normalizeWhatsAppNumber } from "~~/dyrected/whatsapp";
import { renderPassTemplate } from "./send.post";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);
  const { phone, session, customTemplate, attachImage = true } = body || {};

  if (!phone || !phone.trim()) {
    throw createError({ statusCode: 400, message: "Recipient phone number is required" });
  }

  const config = useRuntimeConfig();
  const appUrl = ((config.public as any).appUrl || "https://thesweetunion.com").replace(/\/+$/, "");

  const samplePassCode = "DEMO99";
  const passUrl = `${appUrl}/pass/${samplePassCode.toLowerCase()}`;
  const wishlistUrl = `${appUrl}/wishlist`;
  const churchInfo = "Saturday, Nov 21, 2026 @ 09:30 AM — RCCG Victory Center, No 58 Iju Road, Agege, Lagos";
  const receptionInfo = "Saturday, Nov 21, 2026 @ 02:00 PM — Agege, Lagos (Details on Pass Card)";
  const dressCode = "Strictly Formal / African Regal (Mauve & Gold)";

  const defaultTemplate = `[Greeting, e.g. Dear [Guest Name] / Hi [Guest Name]!]

We can't wait to celebrate with you at #TheSweetUnion! 💍✨

🎟️ YOUR RECEPTION PASS:
Your digital pass code is *[PASS_CODE]*.
Access your official entry card and itinerary here:
[PASS_URL]

⚠️ IMPORTANT VENUE & ENTRY INFO:
• *Church Ceremony:* [Church Venue & Time] (Open to all friends and family)
• *Wedding Reception:* [Reception Venue & Time]
  *Please note: The digital pass above is strictly required for entry at the reception venue. Kindly have it ready on your phone.*

❓ FREQUENTLY ASKED QUESTIONS:
• Colors / Dress Code: [Details...]
• Gifts & Registry: [Wishlist Link...]

With love,
Adun & Uche`;

  let rendered = (customTemplate || defaultTemplate).trim();
  rendered = rendered
    .replace(/\[Greeting[^\]]*\]/gi, "Dear Test Guest,")
    .replace(/\{Greeting[^\}]*\}/gi, "Dear Test Guest,");

  rendered = renderPassTemplate(rendered, {
    "Guest Name": "Test Guest",
    guest_name: "Test Guest",
    guestName: "Test Guest",
    PASS_CODE: samplePassCode,
    pass_code: samplePassCode,
    passCode: samplePassCode,
    PASS_URL: passUrl,
    pass_url: passUrl,
    passUrl: passUrl,
    "Church Venue & Time": churchInfo,
    "Reception Venue & Time": receptionInfo,
    "Details...": dressCode,
    "Details": dressCode,
    "Dress Code": dressCode,
    dress_code: dressCode,
    "Wishlist Link...": wishlistUrl,
    "Wishlist Link": wishlistUrl,
    wishlist_link: wishlistUrl,
  });

  const cardImageUrl = `${appUrl}/api/pass/card-image/${samplePassCode.toLowerCase()}.png?name=Test+Guest&code=${samplePassCode}`;

  try {
    await sendWhatsApp({
      to: phone,
      text: rendered,
      imageUrl: attachImage ? cardImageUrl : undefined,
      session: session || undefined,
    });
  } catch (err: any) {
    const rawMsg = err.message || "";
    if (rawMsg.includes("No LID for user")) {
      throw createError({
        statusCode: 400,
        message: `The phone number "${phone}" is not registered on WhatsApp or was rejected by WhatsApp. Please verify the digits.`,
      });
    }
    throw createError({
      statusCode: 500,
      message: `WhatsApp dispatch failed: ${err.message}`,
    });
  }

  return {
    success: true,
    phone,
    rendered,
    sessionUsed: session || "default",
    imageUrl: attachImage ? cardImageUrl : null,
  };
});
