import { defineEventHandler, getRouterParam, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import nodemailer from "nodemailer";
import { invitationEmail } from "~~/dyrected/emails";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const rsvpId = getRouterParam(event, "rsvpId");
  if (!rsvpId) throw createError({ statusCode: 400, message: "Missing rsvpId" });

  const body = (await readBody(event).catch(() => ({}))) || {};
  const { imageBase64 } = body;

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

  let imageBuffer: Buffer;
  if (imageBase64 && typeof imageBase64 === "string" && imageBase64.trim()) {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    imageBuffer = Buffer.from(base64Data, "base64");
  } else {
    // Generate pass card image automatically on the server via dedicated Resvg card-image endpoint
    try {
      const fetchedPng = await $fetch<Buffer>(`/api/pass/card-image/${rsvpId}.png`, {
        responseType: "arrayBuffer",
      });
      imageBuffer = Buffer.from(fetchedPng);
    } catch (err) {
      console.warn("Could not generate server-side pass image for email:", err);
      imageBuffer = Buffer.alloc(0);
    }
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const from = process.env.EMAIL_FROM || `TheSweetUnion <${process.env.GMAIL_USER}>`;
  const appUrl = (config.public as any).appUrl || "https://thesweetunion.com";
  const passUrl = `${appUrl}/pass/${rsvpId.toLowerCase()}`;
  const wishlistLink = `${appUrl}/wishlist`;

  const attachments: any[] = [];
  if (imageBuffer.length > 0) {
    attachments.push(
      {
        filename: `access-card-${rsvp.leadName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`,
        content: imageBuffer,
        contentType: "image/png",
        cid: "accesscard@thesweetunion",
      },
      {
        filename: `wedding-pass-${rsvp.leadName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`,
        content: imageBuffer,
        contentType: "image/png",
        contentDisposition: "attachment",
      },
    );
  }

  await transporter.sendMail({
    from,
    to: rsvp.leadEmail,
    subject: `You're invited, ${rsvp.leadName}! Your access card is inside 🎉`,
    html: invitationEmail({ guestName, accessCode: rsvpId, passUrl, eventNames, wishlistLink }),
    attachments,
  });

  await client.collection("rsvp_records").update(rsvpId, {
    invitationSent: true,
    invitationSentAt: new Date().toISOString(),
    invitationSentVia: "email",
  });

  return { success: true };
});
