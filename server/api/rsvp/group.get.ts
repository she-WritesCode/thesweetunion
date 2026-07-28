import { defineEventHandler, getQuery, createError } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const slug = query.slug as string;

  if (!slug) {
    throw createError({ statusCode: 400, message: "Missing group slug" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl || config.public.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  try {
    const result = await client.collection("rsvp_groups").find({
      where: { slug: { equals: slug } },
      limit: 1,
    });

    if (!result.docs || result.docs.length === 0) {
      throw createError({ statusCode: 404, message: "Group not found" });
    }

    const group = result.docs[0];

    if (group.isActive === false || group.isActive === "false") {
      throw createError({ statusCode: 404, message: "This RSVP group is no longer active" });
    }

    return {
      id: group.id,
      name: group.name,
      slug: group.slug,
      maxCapacity: group.maxCapacity || 1,
      confirmedCount: group.confirmedCount || 0,
      declinedCount: group.declinedCount || 0,
    };
  } catch (err: any) {
    if (err.statusCode) throw err;
    console.error(`[GET /api/rsvp/group] Error fetching group '${slug}':`, err);
    throw createError({
      statusCode: 500,
      message: err.message || "Failed to fetch RSVP group",
    });
  }
});
