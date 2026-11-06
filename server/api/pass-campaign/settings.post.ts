import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { requireAdmin } from "~~/server/utils/require-admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);
  if (!body || typeof body !== "object") {
    throw createError({ statusCode: 400, message: "Invalid payload" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
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
