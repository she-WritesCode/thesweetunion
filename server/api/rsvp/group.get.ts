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
    baseUrl: config.public.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const result = await client.collection("rsvp_groups").find({
    where: { slug: { equals: slug }, isActive: { equals: true } },
    limit: 1,
  });

  if (result.total === 0) {
    throw createError({ statusCode: 404, message: "Group not found or inactive" });
  }

  const group = result.docs[0];
  return {
    id: group.id,
    name: group.name,
    slug: group.slug,
    maxCapacity: group.maxCapacity,
    confirmedCount: group.confirmedCount || 0,
    declinedCount: group.declinedCount || 0,
  };
});
