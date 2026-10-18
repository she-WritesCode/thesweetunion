import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { requireAdmin } from "~~/server/utils/require-admin";
import { sendWhatsApp } from "~~/dyrected/whatsapp";

function renderMessage(template: string, params: Record<string, string>): string {
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
  const { rsvpId, session, customText } = body || {};

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
  });
  const rawDoc = res.docs?.[0];

  if (!rawDoc) {
    throw createError({ statusCode: 404, message: "Guest RSVP record not found" });
  }

  const doc = rawDoc as any;

  // Double-check payment status
  if (doc.asoebiPaymentStatus === "received" || doc.asoebiPaymentStatus === "waived") {
    throw createError({
      statusCode: 400,
      message: `Guest ${doc.leadName || rsvpId} is already marked as ${doc.asoebiPaymentStatus}.`,
    });
  }

  const phone = (doc.leadPhone || "").trim();
  if (!phone) {
    throw createError({
      statusCode: 400,
      message: `No WhatsApp phone number on record for ${doc.leadName || rsvpId}.`,
    });
  }

  // Fetch asoebi settings for template rendering
  const settings: any = (await client.getGlobal("asoebi_settings").catch(() => ({}))) || {};
  const ppy = Number(settings.pricePerYard) || 10000;
  const malePrice = Number(settings.asoOkeMalePrice) || 6000;
  const femalePrice = Number(settings.asoOkeFemalePrice) || 6000;
  const repName = settings.representativeName || "Ololade";
  const bankName = settings.bankName || "OPay Digital Services Limited";
  const accountNumber = settings.accountNumber || "8105733592";
  const accountName = settings.accountName || "ADUNOLUWA ANUOLUWAPO OBADOFIN";

  const wantsAsoebi = doc.wantsAsoebi === true || doc.wantsAsoebi === "true" || doc.wantsAsoebi === 1;
  const asoebiYards = doc.asoebiYards ? parseInt(String(doc.asoebiYards), 10) : 0;
  const wantsAsoOke = doc.wantsAsoOke === true || doc.wantsAsoOke === "true" || doc.wantsAsoOke === 1;
  const maleQty = Number(doc.asoOkeMaleQty) || 0;
  const femaleQty = Number(doc.asoOkeFemaleQty) || 0;

  let total = 0;
  const items: string[] = [];
  if (wantsAsoebi && asoebiYards > 0) {
    total += asoebiYards * ppy;
    items.push(`${asoebiYards} yards of Asoebi fabric (Customised Adire)`);
  }
  if (wantsAsoOke && maleQty > 0) {
    total += maleQty * malePrice;
    items.push(`${maleQty} Male Aso Oke (Fila / Cap)`);
  }
  if (wantsAsoOke && femaleQty > 0) {
    total += femaleQty * femalePrice;
    items.push(`${femaleQty} Female Aso Oke (Gele)`);
  }

  const itemsStr = items.length > 0 ? items.join(" + ") : "Aso Ebi";
  const guestName = (doc.leadName || "").trim() || "there";
  const totalStr = `₦${total.toLocaleString()}`;

  let messageToSend = customText;
  if (!messageToSend || !messageToSend.trim()) {
    const rawTemplate =
      settings.whatsAppTemplate ||
      `Good day Mr/Mrs/Miss [guest name] , my name is [rep name] a representative of the couple. \n\nThank you for choosing to celebrate #thesweetunion and identifying with the fabric of the day. \n\nKindly confirm your Asoebi request of; [items] order for #TheSweetUnion. \n\nPlease pay the total of [total] to [bank] - [account number] ([account name]) and send proof of payment here as production of fabrics has begun, so you can get your fabrics without delay. Thank you!`;

    messageToSend = renderMessage(rawTemplate, {
      "guest name": guestName,
      guest_name: guestName,
      guestName: guestName,
      "rep name": repName,
      rep_name: repName,
      "representative name": repName,
      repName: repName,
      items: itemsStr,
      items_summary: itemsStr,
      total: totalStr,
      total_amount: totalStr,
      bank: bankName,
      bank_name: bankName,
      "bank name": bankName,
      "account number": accountNumber,
      account_number: accountNumber,
      accountNumber: accountNumber,
      "account name": accountName,
      account_name: accountName,
      accountName: accountName,
    });
  }

  const targetSession = session || settings.wahaSession || "AdunsPhone";

  // Send via WAHA
  await sendWhatsApp({
    to: phone,
    text: messageToSend,
    session: targetSession,
  });

  const nowIso = new Date().toISOString();

  // Update record in Dyrected
  await client.collection("rsvp_records").update(rsvpId, {
    asoebiSent: true,
    asoebiSentAt: nowIso,
  });

  return {
    success: true,
    guestName,
    phone,
    sessionUsed: targetSession,
    sentAt: nowIso,
    message: messageToSend,
  };
});
