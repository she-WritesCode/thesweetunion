import { defineEventHandler, getRouterParam, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import nodemailer from "nodemailer";
import { invitationEmail } from "~~/dyrected/emails";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const rsvpId = getRouterParam(event, "rsvpId");
  if (!rsvpId) throw createError({ statusCode: 400, message: "Missing rsvpId" });

  const body = (await readBody(event).catch(() => ({}))) || {};
  const { imageBase64, email } = body;

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

  const targetEmail = (email && typeof email === "string" && email.trim()) || rsvp.leadEmail;
  if (!targetEmail) throw createError({ statusCode: 400, message: "Guest has no email address" });

  const guestName =
    rsvp.hasSpouse && rsvp.spouseName
      ? `${rsvp.leadName} & ${rsvp.spouseName}`
      : rsvp.leadName;

  const passCode = ((rsvp.passCode || rsvp.id) as string).toUpperCase();

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
      const fetchedPng = await $fetch<Buffer>(`/api/pass/card-image/${passCode.toLowerCase()}.png`, {
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
  let appUrl = ((config.public as any).appUrl || "https://thesweetunion.vercel.app").replace(/\/+$/, "");
  if (!appUrl || appUrl.includes("thesweetunion.com") || appUrl.includes("localhost")) {
    appUrl = "https://thesweetunion.vercel.app";
  }
  const passUrl = `${appUrl}/pass/${passCode.toLowerCase()}`;
  const wishlistLink = "https://thesweetunion.vercel.app/wishlist";
  const storyLink = "https://thesweetunion.vercel.app/";

  const textMessage = `Dear ${guestName},

We can't wait to celebrate with you at #TheSweetUnion! 💍✨

Your Reception Access Card is ready. Kindly save the image attached to this message and this pass code to show at the reception:
Pass Code: *${passCode}*.


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

  const attachments: any[] = [];
  if (imageBuffer.length > 0) {
    attachments.push(
      {
        filename: `access-card-${passCode.toLowerCase()}.png`,
        content: imageBuffer,
        contentType: "image/png",
        cid: "accesscard@thesweetunion",
      },
      {
        filename: `wedding-pass-${passCode.toLowerCase()}.png`,
        content: imageBuffer,
        contentType: "image/png",
        contentDisposition: "attachment",
      },
    );
  }

  await transporter.sendMail({
    from,
    to: targetEmail,
    subject: `Your Reception Access Card · #TheSweetUnion`,
    text: textMessage,
    html: invitationEmail({
      guestName,
      accessCode: passCode,
      passUrl,
      eventNames,
      wishlistLink,
      storyLink,
    }),
    attachments,
  });

  const nowIso = new Date().toISOString();
  const updateFields: any = {
    invitationSent: true,
    emailSent: true,
    emailSentAt: nowIso,
    invitationSentAt: rsvp.invitationSentAt || nowIso,
    invitationSentVia: rsvp.invitationSentVia
      ? (String(rsvp.invitationSentVia).includes("email") ? rsvp.invitationSentVia : `${rsvp.invitationSentVia}+email`)
      : "email",
  };
  if (email && typeof email === "string" && email.trim() && email.trim() !== rsvp.leadEmail) {
    updateFields.leadEmail = email.trim();
  }

  await client.collection("rsvp_records").update(rsvpId, updateFields);

  return { success: true, emailedTo: targetEmail };
});
