import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  let user = process.env.GMAIL_USER;
  let pass = process.env.GMAIL_APP_PASSWORD;
  let from = process.env.EMAIL_FROM;

  try {
    const config = useRuntimeConfig();
    if (config.gmailUser) user = config.gmailUser;
    if (config.gmailAppPassword) pass = config.gmailAppPassword;
    if (config.emailFrom) from = config.emailFrom;
  } catch (e) {
    // Graceful fallback if called outside Nuxt server context (like in dyrected.config.ts)
  }

  if (!from) {
    from = `TheSweetUnion <${user}>`;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({ from, to, subject, html });
}

