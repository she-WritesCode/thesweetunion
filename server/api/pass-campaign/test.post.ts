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

  const defaultTemplate = `Dear [Guest Name],

We are delighted to confirm your RSVP for our wedding celebration!

Your VIP Reception Access Pass is ready:
Pass Code: [PASS_CODE]
Digital Pass & Entry Card: [PASS_URL]

CHURCH CEREMONY: [Church Venue & Time]
(Open to all friends & family)

RECEPTION: [Reception Venue & Time]
(Strictly by digital access card or pass code)

DRESS CODE: [Dress Code]
GIFTS & REGISTRY: [Wishlist Link]

We can't wait to celebrate with you!
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
    "Dress Code": dressCode,
    dress_code: dressCode,
    "Wishlist Link": wishlistUrl,
    wishlist_link: wishlistUrl,
  });

  const cardImageUrl = `${appUrl}/api/pass/card-image/${samplePassCode.toLowerCase()}.png?name=Test+Guest&code=${samplePassCode}`;

  await sendWhatsApp({
    to: phone,
    text: rendered,
    imageUrl: attachImage ? cardImageUrl : undefined,
    session: session || undefined,
  });

  return {
    success: true,
    phone,
    rendered,
    sessionUsed: session || "default",
    imageUrl: attachImage ? cardImageUrl : null,
  };
});
