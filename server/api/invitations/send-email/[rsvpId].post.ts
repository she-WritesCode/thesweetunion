import { defineEventHandler, getRouterParam, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import nodemailer from "nodemailer";
import { invitationEmail } from "~~/dyrected/emails";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const rsvpId = getRouterParam(event, "rsvpId");
  if (!rsvpId) throw createError({ statusCode: 400, message: "Missing rsvpId" });

  const { imageBase64 } = await readBody(event);
  if (!imageBase64) throw createError({ statusCode: 400, message: "Missing imageBase64" });

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const result = await client.collection("rsvp_records").find({
    where: { id: { equals: rsvpId } },
    limit: 1,
    depth: 1, // populates selectedEvents inline
  });
  const rsvp = result.docs?.[0];
  if (!rsvp) throw createError({ statusCode: 404, message: "RSVP record not found" });
  if (!rsvp.leadEmail) throw createError({ statusCode: 400, message: "Guest has no email address" });

  const guestName =
    rsvp.hasSpouse && rsvp.spouseName
      ? `${rsvp.leadName} & ${rsvp.spouseName}`
      : rsvp.leadName;

  const eventNames: string[] = Array.isArray(rsvp.selectedEvents)
    ? rsvp.selectedEvents.map((e: any) => (typeof e === "object" ? e.name : e)).filter(Boolean)
    : [];

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const from = process.env.EMAIL_FROM || `TheSweetUnion <${process.env.GMAIL_USER}>`;
  const appUrl = (config.public as any).appUrl || "http://localhost:3000";
  const wishlistLink = `${appUrl}/wishlist`;

  await transporter.sendMail({
    from,
    to: rsvp.leadEmail,
    subject: `You're invited, ${rsvp.leadName}! Your access card is inside 🎉`,
    html: invitationEmail({ guestName, accessCode: rsvpId, eventNames, wishlistLink }),
    attachments: [
      {
        filename: `access-card-${rsvp.leadName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`,
        content: base64Data,
        encoding: "base64",
        contentType: "image/png",
        cid: "accesscard@thesweetunion",
      },
      {
        filename: `access-card-${rsvp.leadName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`,
        content: base64Data,
        encoding: "base64",
        contentType: "image/png",
        contentDisposition: "attachment",
      },
    ],
  });

  await client.collection("rsvp_records").update(rsvpId, {
    invitationSent: true,
    invitationSentAt: new Date().toISOString(),
    invitationSentVia: "email",
  });

  return { success: true };
});
