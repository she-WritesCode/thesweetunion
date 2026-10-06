import { defineEventHandler, readBody, getQuery, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { requireAdmin } from "~~/server/utils/require-admin";
import { syncGroupCounts, recalculateAllGroupCounts } from "./_counts";

export default defineEventHandler(async (event) => {
  // Allow authenticated admin OR dyrected internal api key
  const config = useRuntimeConfig();
  const apiKeyHeader = event.node.req.headers["x-api-key"];
  const isApiKeyAuth =
    apiKeyHeader &&
    (apiKeyHeader === config.dyrectedApiKey || apiKeyHeader === config.public.dyrectedApiKey);

  if (!isApiKeyAuth) {
    try {
      await requireAdmin(event);
    } catch (err: any) {
      // If neither apiKey nor admin JWT, reject
      throw createError({
        statusCode: 401,
        message: err.message || "Admin authorization required.",
      });
    }
  }

  const body = await readBody(event).catch(() => ({}));
  const query = getQuery(event);
  const groupId = (body?.groupId || body?.id || query?.groupId || query?.id) as string | undefined;

  const client = createClient({
    baseUrl: config.dyrectedUrl || config.public.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  try {
    if (groupId) {
      // Recalculate single group
      const stats = await syncGroupCounts(client, groupId);
      return {
        success: true,
        message: `Group counts recalculated: ${stats.confirmedCount} confirmed, ${stats.declinedCount} declined.`,
        groupId,
        stats,
      };
    } else {
      // Recalculate all groups
      const summary = await recalculateAllGroupCounts(client);
      return {
        success: true,
        message: `Recalculated counts across all ${summary.totalGroups} groups (${summary.updatedCount} updated, ${summary.totalRecords} RSVP records processed).`,
        ...summary,
      };
    }
  } catch (err: any) {
    console.error("Failed to recalculate group counts:", err);
    throw createError({
      statusCode: 500,
      message: err.message || "Failed to recalculate group counts",
    });
  }
});
