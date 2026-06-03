import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { groupSlug, leadName, leadEmail, leadPhone, attending, hasSpouse, spouseName, dietaryNotes, message, events } = body;

  if (!groupSlug) {
    throw createError({ statusCode: 400, message: "Missing group slug" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.public.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  // Resolve group slug to ID
  const groupSearch = await client.collection("rsvp_groups").find({
    where: { slug: { equals: groupSlug }, isActive: { equals: true } },
    limit: 1,
  });

  if (groupSearch.total === 0) {
    throw createError({ statusCode: 404, message: "Group not found or inactive" });
  }

  const group = groupSearch.docs[0];

  try {
    const record = await client.collection("rsvp_records").create({
      group: group.id,
      leadName,
      leadEmail,
      leadPhone,
      attending,
      hasSpouse,
      spouseName,
      dietaryNotes,
      message,
      events,
    });

    return { success: true, record };
  } catch (err: any) {
    throw createError({ statusCode: 400, message: err.message || "Failed to submit RSVP" });
  }
});
