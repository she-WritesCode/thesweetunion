import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { requireAdmin } from "~~/server/utils/require-admin";
import { sendWhatsApp, normalizeWhatsAppNumber } from "~~/dyrected/whatsapp";

const ROTATING_GREETINGS = [
  "Dear [Guest Name],",
  "Hi [Guest Name]!",
  "Hello [Guest Name],",
  "Good day [Guest Name],",
];

export function renderPassTemplate(template: string, params: Record<string, string>): string {
  let text = template;
  for (const [key, val] of Object.entries(params)) {
    const rxBracket = new RegExp(`\\[${key}\\]`, "gi");
    const rxBrace = new RegExp(`\\{${key}\\}`, "gi");
    text = text.replace(rxBracket, val).replace(rxBrace, val);
  }
  return text;
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);
  const {
    rsvpId,
    session,
    customTemplate,
    attachImage = true,
    mode = "automated", // "automated" | "manual"
  } = body || {};

  if (!rsvpId) {
    throw createError({ statusCode: 400, message: "rsvpId is required" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const res = await client.collection("rsvp_records").find({
    where: { id: { equals: rsvpId } },
    limit: 1,
    depth: 1,
  });
  const rsvp = res.docs?.[0] as any;

  if (!rsvp) {
    throw createError({ statusCode: 404, message: "Guest RSVP record not found" });
  }

  const rawPhone = (rsvp.leadPhone || "").trim();
  if (!rawPhone) {
    throw createError({ statusCode: 400, message: `No phone number on record for ${rsvp.leadName || rsvpId}` });
  }

  const leadName = (rsvp.leadName || "").trim() || "Guest";
  const hasSpouse = Boolean(rsvp.hasSpouse && rsvp.spouseName);
  const guestName = hasSpouse ? `${leadName} & ${rsvp.spouseName.trim()}` : leadName;
  const passCode = ((rsvp.passCode || rsvp.id) as string).toUpperCase();

  const appUrl = ((config.public as any).appUrl || "https://thesweetunion.com").replace(/\/+$/, "");
  const passUrl = `${appUrl}/pass/${passCode.toLowerCase()}`;
  const wishlistUrl = `${appUrl}/wishlist`;

  // Select a rotating greeting for anti-bot variation
  const randomGreeting = ROTATING_GREETINGS[Math.floor(Math.random() * ROTATING_GREETINGS.length)].replace(
    /\[Guest Name\]/gi,
    leadName,
  );

  const defaultTemplate = `[Greeting]

We can't wait to celebrate with you at #TheSweetUnion! 💍✨

🎟️ YOUR RECEPTION PASS:
Your digital pass code is [PASS_CODE].
Access your official entry card and itinerary here:
[PASS_URL]

⚠️ IMPORTANT VENUE & ENTRY INFO:
• Church Ceremony: [Church Venue & Time] (Open to all friends and family)
• Wedding Reception: [Reception Venue & Time]
  *Please note: The digital pass above is strictly required for entry at the reception venue. Kindly have it ready on your phone.*

❓ FREQUENTLY ASKED QUESTIONS:
• Colors / Dress Code: [Dress Code]
• Gifts & Registry: [Wishlist Link]

With love,
Adun & Uche`;

  const templateToUse = (customTemplate || defaultTemplate).trim();

  // Substitute tags
  let rendered = templateToUse;
  if (/\[Greeting[^\]]*\]/i.test(rendered) || /\{Greeting[^\}]*\}/i.test(rendered)) {
    rendered = rendered.replace(/\[Greeting[^\]]*\]/gi, randomGreeting).replace(/\{Greeting[^\}]*\}/gi, randomGreeting);
  }

  const churchInfo = "Saturday, Nov 21, 2026 @ 09:30 AM — RCCG Victory Center, No 58 Iju Road, Agege, Lagos";
  const receptionInfo = "Saturday, Nov 21, 2026 @ 02:00 PM — Agege, Lagos (Details on Pass Card)";
  const dressCode = "Strictly Formal / African Regal (Mauve & Gold)";

  rendered = renderPassTemplate(rendered, {
    "Guest Name": guestName,
    guest_name: guestName,
    guestName: guestName,
    PASS_CODE: passCode,
    pass_code: passCode,
    passCode: passCode,
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

  const cleanDigits = normalizeWhatsAppNumber(rawPhone);
  const waUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(rendered)}`;

  const cardImageUrl = `${appUrl}/api/pass/card-image/${passCode.toLowerCase()}.png`;

  // If automated dispatch via WAHA:
  if (mode === "automated") {
    await sendWhatsApp({
      to: rawPhone,
      text: rendered,
      imageUrl: attachImage ? cardImageUrl : undefined,
      session: session || undefined,
    });
  }

  // Stamp record as sent
  const nowIso = new Date().toISOString();
  await client.collection("rsvp_records").update(rsvpId, {
    invitationSent: true,
    invitationSentAt: nowIso,
    invitationSentVia: "whatsapp",
  });

  return {
    success: true,
    guestName,
    phone: rawPhone,
    passCode,
    renderedMessage: rendered,
    waUrl,
    cardImageUrl,
    sessionUsed: session || "default",
    sentAt: nowIso,
  };
});
