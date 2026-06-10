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

  const guestName =
    rsvp.hasSpouse && rsvp.spouseName
      ? `${rsvp.leadName} + ${rsvp.spouseName}`
      : rsvp.leadName;

  const qrDataUrl = await QRCode.toDataURL(rsvpId, {
    width: 200,
    margin: 2,
    color: { dark: "#30222A", light: "#FFFFFF" },
  });

  return {
    rsvpId,
    guestName,
    qrDataUrl,
    rsvp: {
      id: rsvp.id,
      leadName: rsvp.leadName,
      hasSpouse: rsvp.hasSpouse,
      spouseName: rsvp.spouseName,
    },
  };
});
