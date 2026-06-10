import { defineEventHandler, getRouterParam, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import QRCode from "qrcode";

export default defineEventHandler(async (event) => {
  const rsvpId = getRouterParam(event, "rsvpId");
  if (!rsvpId) {
    throw createError({ statusCode: 400, message: "Missing rsvpId" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const result = await client.collection("rsvp_records").find({
    where: { id: { equals: rsvpId } },
    limit: 1,
  });
  const rsvp = result.docs?.[0];
  if (!rsvp) {
    throw createError({ statusCode: 404, message: "RSVP record not found" });
  }

  const guestName = rsvp.hasSpouse && rsvp.spouseName ? `${rsvp.leadName} & ${rsvp.spouseName}` : rsvp.leadName;

  // Generate QR code data URL for the access card
  const qrDataUrl = await QRCode.toDataURL(rsvpId, {
    width: 200,
    margin: 2,
    color: { dark: "#30222A", light: "#FFFFFF" },
  });

  // Build wa.me link with pre-filled message
  const rawPhone = rsvp.leadPhone || "";
  const phone = rawPhone.startsWith("+")
    ? rawPhone.replace(/\D/g, "")
    : `234${rawPhone.replace(/^0/, "").replace(/\D/g, "")}`;

  const message = encodeURIComponent(
    `Hi ${rsvp.leadName}!\n\n` +
      `You're invited to Adun & Uche's wedding. Your personal access code is:\n\n` +
      `${rsvpId?.toUpperCase()}\n\n` +
      `Please show this at the entrance.\n\n#TheSweetUnion`,
  );
  const waUrl = `https://wa.me/${phone}?text=${message}`;

  // Mark invitation as sent
  await client.collection("rsvp_records").update(rsvpId, {
    invitationSent: true,
    invitationSentAt: new Date().toISOString(),
    invitationSentVia: "whatsapp",
  });

  return {
    success: true,
    waUrl,
    qrDataUrl,
    guestName,
    rsvpId,
  };
});
