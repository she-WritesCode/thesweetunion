import { defineEventHandler, createError } from "h3";
import { requireAdmin } from "~~/server/utils/require-admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const config = useRuntimeConfig();
  const baseUrl = (config.wahaUrl as string)?.replace(/\/+$/, "");
  const apiKey = config.wahaApiKey as string;

  if (!baseUrl) {
    throw createError({ statusCode: 500, message: "WAHA_URL is not configured." });
  }

  try {
    const res = await fetch(`${baseUrl}/api/sessions`, {
      headers: {
        Accept: "application/json",
        ...(apiKey ? { "X-Api-Key": apiKey } : {}),
      },
    });

    if (!res.ok) {
      throw new Error(`WAHA returned status ${res.status}`);
    }

    const sessions = await res.json();
    return {
      success: true,
      sessions: Array.isArray(sessions)
        ? sessions.map((s: any) => ({
            name: s.name,
            status: s.status,
            phone: s.me?.id ? s.me.id.replace(/@.*$/, "") : null,
            pushName: s.me?.pushName || s.name,
          }))
        : [],
    };
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      message: `Failed to fetch WAHA sessions: ${err.message}`,
    });
  }
});
