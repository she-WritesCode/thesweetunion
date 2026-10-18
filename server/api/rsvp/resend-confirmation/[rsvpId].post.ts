import { defineEventHandler, getRouterParam, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import crypto from "crypto";
import { sendEmail } from "~~/dyrected/mailer";
import { rsvpConfirmationEmail } from "~~/dyrected/emails";
import { requireAdmin } from "~~/server/utils/require-admin";
import { isAttending, hasSpouse } from "../_counts";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const rsvpId = getRouterParam(event, "rsvpId");
  if (!rsvpId) throw createError({ statusCode: 400, message: "Missing rsvpId" });

  const body = (await readBody(event).catch(() => ({}))) || {};
  const { email } = body;

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl || (config.public as any).dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const result = await client.collection("rsvp_records").find({
    where: { id: { equals: rsvpId } },
    limit: 1,
    depth: 1,
  });
  const rsvp = result.docs?.[0];
  if (!rsvp) throw createError({ statusCode: 404, message: "RSVP record not found" });

  const targetEmail = (email && typeof email === "string" && email.trim()) || rsvp.leadEmail;
  if (!targetEmail) throw createError({ statusCode: 400, message: "Guest has no email address" });

  // Update leadEmail on the record if it changed
  let updatedEmail = false;
  let editToken = rsvp.editToken;
  const updates: Record<string, any> = {};

  if (targetEmail !== rsvp.leadEmail) {
    updates.leadEmail = targetEmail;
    updatedEmail = true;
  }

  // Ensure editToken exists for editing link
  if (!editToken) {
    editToken = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    updates.editToken = editToken;
  }

  if (Object.keys(updates).length > 0) {
    try {
      await client.collection("rsvp_records").update(rsvpId, updates);
    } catch (err) {
      console.warn("Could not persist updated email/token to rsvp record:", err);
    }
  }

  const appUrl: string = (config.public as any).appUrl || "https://thesweetunion.com";
  const editLink = `${appUrl}/rsvp?token=${editToken}`;
  const wishlistLink = `${appUrl}/wishlist`;

  const attending = isAttending(rsvp.attending);
  const spouse = hasSpouse(rsvp.hasSpouse);
  const wantsAsoebi = Boolean(rsvp.wantsAsoebi);
  const wantsAsoOke = Boolean(rsvp.wantsAsoOke);

  // Fetch events for emails
  const eventIds: string[] = Array.isArray(rsvp.selectedEvents)
    ? rsvp.selectedEvents.map((e: any) => (typeof e === "object" ? e.id : e)).filter(Boolean)
    : [];
  let rsvpEvents: any[] = [];
  try {
    const evRes = await client.collection("events").find({ limit: 20 });
    const allDocs = [...evRes.docs].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    rsvpEvents = allDocs.filter((e: any) => !e.collectsRsvp || eventIds.includes(e.id));
    if (!rsvpEvents.length) {
      rsvpEvents = allDocs;
    }
  } catch (e) {
    console.warn("Could not fetch events for confirmation email:", e);
  }

  // Fetch Asoebi global settings if wantsAsoebi or wantsAsoOke is true
  let asoebiSettings: any = null;
  if (wantsAsoebi || wantsAsoOke) {
    try {
      asoebiSettings = await client.global("asoebi_settings").get();
    } catch (e) {
      console.error("Failed to fetch asoebi settings in resend-confirmation:", e);
    }
  }

  const detailsParts = [];
  if (wantsAsoebi && rsvp.asoebiYards) {
    detailsParts.push(`Customised Adire Fabric: ${rsvp.asoebiYards} Yards`);
  }
  if (wantsAsoOke) {
    if (rsvp.asoOkeMaleQty) detailsParts.push(`Male Aso Oke (Fila/Cap): ${rsvp.asoOkeMaleQty} set(s)`);
    if (rsvp.asoOkeFemaleQty) detailsParts.push(`Female Aso Oke (Gele): ${rsvp.asoOkeFemaleQty} set(s)`);
  }
  const asoebiDetailsStr = rsvp.asoebiDetails || detailsParts.join(" | ");

  const subject = attending
    ? `You're on the list, ${rsvp.leadName}! 🎉`
    : `We'll miss you, ${rsvp.leadName}`;

  await sendEmail({
    to: targetEmail,
    subject,
    html: rsvpConfirmationEmail({
      leadName: rsvp.leadName,
      attending,
      hasSpouse: spouse,
      spouseName: rsvp.spouseName,
      events: rsvpEvents,
      editLink,
      wishlistLink,
      wantsAsoebi: attending && wantsAsoebi,
      asoebiYards: attending && wantsAsoebi ? rsvp.asoebiYards : "",
      wantsAsoOke: attending && wantsAsoOke,
      asoOkeMaleQty: attending && wantsAsoOke ? rsvp.asoOkeMaleQty || 0 : 0,
      asoOkeFemaleQty: attending && wantsAsoOke ? rsvp.asoOkeFemaleQty || 0 : 0,
      asoebiDetails: asoebiDetailsStr,
      asoebiSettings,
      appUrl,
    }),
  });

  return {
    success: true,
    email: targetEmail,
    subject,
    editLink,
    updatedEmail,
    message: `RSVP confirmation email successfully resent to ${targetEmail}!`,
  };
});
