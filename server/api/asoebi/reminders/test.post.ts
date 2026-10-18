import { defineEventHandler, readBody, createError } from "h3";
import { requireAdmin } from "~~/server/utils/require-admin";
import { sendWhatsApp } from "~~/dyrected/whatsapp";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);
  const { phone, session = "AdunsPhone", text } = body || {};

  if (!phone || !phone.trim()) {
    throw createError({ statusCode: 400, message: "Phone number is required for test send." });
  }

  const messageText =
    text?.trim() ||
    `🔔 [TEST REMINDER]\nThis is a test notification from #TheSweetUnion automated reminder system via WAHA session "${session}".\nEverything is connected and working!`;

  try {
    const res = await sendWhatsApp({
      to: phone.trim(),
      text: messageText,
      session,
    });

    return {
      success: true,
      phone: phone.trim(),
      session,
      result: res,
    };
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      message: `Test send failed: ${err.message}`,
    });
  }
});
