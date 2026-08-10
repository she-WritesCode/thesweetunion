import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await readBody(event);
  const { whatsAppTemplate } = body;

  if (typeof whatsAppTemplate !== "string" || !whatsAppTemplate.trim()) {
    throw createError({ statusCode: 400, message: "whatsAppTemplate is required" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const updated = await client.updateGlobal("asoebi_settings", {
    whatsAppTemplate: whatsAppTemplate.trim(),
  });

  return {
    success: true,
    settings: updated,
  };
});
