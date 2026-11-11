import { defineEventHandler, readBody, createError } from "h3";
import { requireAdmin } from "~~/server/utils/require-admin";
import nodemailer from "nodemailer";
import { invitationEmail } from "~~/dyrected/emails";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);
  const { email } = body || {};

  if (!email || typeof email !== "string" || !email.trim()) {
    throw createError({ statusCode: 400, message: "Recipient email address is required" });
  }

  const config = useRuntimeConfig();
  let appUrl = ((config.public as any).appUrl || "https://thesweetunion.vercel.app").replace(/\/+$/, "");
  if (!appUrl || appUrl.includes("thesweetunion.com") || appUrl.includes("localhost")) {
    appUrl = "https://thesweetunion.vercel.app";
  }

  const samplePassCode = "DEMO99";
  const guestName = "Test Guest (Preview)";
  const passUrl = `${appUrl}/pass/${samplePassCode.toLowerCase()}`;
  const wishlistLink = "https://thesweetunion.vercel.app/wishlist";
  const storyLink = "https://thesweetunion.vercel.app/";

  // Fetch or generate pass card image
  let imageBuffer: Buffer = Buffer.alloc(0);
  try {
    const fetchedPng = await $fetch<Buffer>(`/api/pass/card-image/${samplePassCode.toLowerCase()}.png`, {
      responseType: "arrayBuffer",
    });
    imageBuffer = Buffer.from(fetchedPng);
  } catch (err) {
    console.warn("Could not generate test card image:", err);
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const from = process.env.EMAIL_FROM || `TheSweetUnion <${process.env.GMAIL_USER}>`;

  const textMessage = `Dear ${guestName},

We can't wait to celebrate with you at #TheSweetUnion! 💍✨

Your Reception Access Card is ready. Kindly save the image attached to this message and this pass code to show at the reception:
Pass Code: *${samplePassCode}*.


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
        filename: `access-card-${samplePassCode.toLowerCase()}.png`,
        content: imageBuffer,
        contentType: "image/png",
        cid: "accesscard@thesweetunion",
      },
      {
        filename: `wedding-pass-${samplePassCode.toLowerCase()}.png`,
        content: imageBuffer,
        contentType: "image/png",
        contentDisposition: "attachment",
      },
    );
  }

  await transporter.sendMail({
    from,
    to: email.trim(),
    subject: `[TEST] Your Reception Access Card · #TheSweetUnion`,
    text: textMessage,
    html: invitationEmail({
      guestName,
      accessCode: samplePassCode,
      passUrl,
      eventNames: ["Church Wedding Ceremony", "Wedding Reception"],
      wishlistLink,
      storyLink,
    }),
    attachments,
  });

  return { success: true, deliveredTo: email.trim() };
});
