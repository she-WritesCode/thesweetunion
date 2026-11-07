import { defineEventHandler, readBody, createError, getHeader, getCookie } from "h3";
import { createClient } from "@dyrected/sdk";
import { requireAdmin } from "~~/server/utils/require-admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);
  if (!body || typeof body !== "object") {
    throw createError({ statusCode: 400, message: "Invalid payload" });
  }

  const token =
    getHeader(event, "authorization")?.replace(/^Bearer\s+/i, "") ||
    getCookie(event, "__dyrected_token") ||
    getCookie(event, "dyrected_token");

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
    token: token || undefined,
  });

  try {
    await client.global("site_settings").update({
      passCampaignConfig: body,
    });

    return { success: true, config: body };
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to save campaign settings: ${err.message}`,
    });
  }
});
