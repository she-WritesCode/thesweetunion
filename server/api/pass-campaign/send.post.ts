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
  const targetId = body?.rsvpId || body?.guestId;
  const {
    customTemplate,
    attachImage = true,
    mode = "automated", // "automated" | "manual"
  } = body || {};
  let targetSession = body?.session;

  if (!targetId) {
    throw createError({ statusCode: 400, message: "rsvpId or guestId is required" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const res = await client.collection("rsvp_records").find({
    where: { id: { equals: targetId } },
    limit: 1,
    depth: 1,
  });
  const rsvp = res.docs?.[0] as any;

  if (!rsvp) {
    throw createError({ statusCode: 404, message: "Guest RSVP record not found" });
  }

  let activeTemplate = customTemplate;

  // If session or template wasn't explicitly passed, check campaign config in site_settings
  try {
    const settings = (await client.global("site_settings").get()) as any;
    const passConfig = settings?.passCampaignConfig;
    if (!targetSession && passConfig) {
      // 1. Check direct guest assignment
      if (passConfig.guestSenderMap?.[rsvp.id]) {
        const senderId = passConfig.guestSenderMap[rsvp.id];
        const match = (passConfig.senders || []).find((s: any) => s.id === senderId);
        if (match?.wahaSession) {
          targetSession = match.wahaSession;
        }
      }
      // 2. Otherwise use group sender mapping
      else {
        const groupId = typeof rsvp.group === "object" ? rsvp.group?.id : rsvp.group;
        if (groupId && passConfig.groupSenderMap?.[groupId]) {
          const senderId = passConfig.groupSenderMap[groupId];
          const match = (passConfig.senders || []).find((s: any) => s.id === senderId);
          if (match?.wahaSession) {
            targetSession = match.wahaSession;
          }
        }
      }
    }
    if (!activeTemplate && passConfig?.messageTemplate) {
      activeTemplate = passConfig.messageTemplate;
    }
  } catch {
    // fallback
  }

  const rawPhone = (rsvp.leadPhone || "").trim();
  if (!rawPhone) {
    throw createError({ statusCode: 400, message: `No phone number on record for ${rsvp.leadName || rsvpId}` });
  }

  const leadName = (rsvp.leadName || "").trim() || "Guest";
  const hasSpouse = Boolean(rsvp.hasSpouse && rsvp.spouseName);
  const guestName = hasSpouse ? `${leadName} & ${rsvp.spouseName.trim()}` : leadName;
  const passCode = ((rsvp.passCode || rsvp.id) as string).toUpperCase();

  let appUrl = ((config.public as any).appUrl || "https://thesweetunion.vercel.app").replace(/\/+$/, "");
  if (!appUrl || appUrl.includes("thesweetunion.com") || appUrl.includes("localhost")) {
    appUrl = "https://thesweetunion.vercel.app";
  }
  const passUrl = `${appUrl}/pass/${passCode.toLowerCase()}`;
  const wishlistUrl = `${appUrl}/wishlist`;

  // Select a rotating greeting for anti-bot variation
  const randomGreeting = ROTATING_GREETINGS[Math.floor(Math.random() * ROTATING_GREETINGS.length)].replace(
    /\[Guest Name\]/gi,
    leadName,
  );

  const defaultTemplate = `[Greeting, e.g. Dear [Guest Name]

We can't wait to celebrate with you at #TheSweetUnion! 💍✨

Your Reception Access Card is ready. Kindly save the image attached to this message and this pass code to show at the reception:
Pass Code: *[PASS_CODE]*.


*Venue Details*
CHURCH CEREMONY: 
Saturday, Nov 21, 2026 @ 09:00 AM
RCCG Victory Center, No 58 Iju Road, Agege, Lagos
(Open to all friends & family)

RECEPTION: 
Saturday, Nov 21, 2026 @ 01:00 PM 
*Ronnie Dee Event Centre, 67 Iju Rd, Pen Cinema Zone, beside Eterna Petrol Station, Agege, Lagos 101232, Lagos*
(Strictly by digital access card or pass code)


DRESS CODE: Mauve & Gold
GIFTS & REGISTRY: https://thesweetunion.vercel.app/wishlist

Want to read about our love story? Check here: https://thesweetunion.vercel.app/

With love,
Adun & Uche`;

  const templateToUse = (activeTemplate || defaultTemplate).trim();

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
    "Details...": dressCode,
    "Details": dressCode,
    "Dress Code": dressCode,
    dress_code: dressCode,
    "Wishlist Link...": wishlistUrl,
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
      session: targetSession || undefined,
    });
  }

  // Stamp record as sent
  const nowIso = new Date().toISOString();
  const alreadyEmail = Boolean(rsvp.emailSent || String(rsvp.invitationSentVia || "").includes("email"));
  await client.collection("rsvp_records").update(targetId, {
    invitationSent: true,
    invitationSentAt: nowIso,
    invitationSentVia: alreadyEmail ? "whatsapp+email" : "whatsapp",
    emailSent: alreadyEmail ? true : Boolean(rsvp.emailSent),
  });

  return {
    success: true,
    guestName,
    phone: rawPhone,
    passCode,
    renderedMessage: rendered,
    waUrl,
    cardImageUrl,
    sessionUsed: targetSession || "default",
    sentAt: nowIso,
  };
});
