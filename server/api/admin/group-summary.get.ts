import { defineEventHandler } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const client = createClient({
    baseUrl: config.public.dyrectedUrl || config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  try {
    const groupsRes = await client.collection("rsvp_groups").find({ limit: 1000, depth: 1 });
    const groupDocs = groupsRes?.docs || [];

    let totalCapacity = 0;
    let respondedCount = 0;

    for (const g of groupDocs) {
      totalCapacity += Number(g.allowedGuests) || 0;
      if (g.hasSubmitted) {
        respondedCount++;
      }
    }

    const responsePct =
      groupDocs.length > 0 ? Math.round((respondedCount / groupDocs.length) * 100) : 0;

    return {
      success: true,
      data: {
        totalGroups: groupDocs.length,
        totalCapacity,
        respondedCount,
        responsePct,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to calculate group summary",
    };
  }
});
