import { defineEventHandler, getQuery, createError } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const token = query.token as string;

  if (!token) {
    throw createError({ statusCode: 400, message: "Missing edit token" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.public.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  // Find record
  const search = await client.collection("rsvp_records").find({
    where: { editToken: { equals: token } },
    limit: 1,
  });

  if (search.total === 0) {
    throw createError({ statusCode: 404, message: "RSVP record not found" });
  }

  const record = search.docs[0];
  const groupId = typeof record.group === "object" ? record.group.id : record.group;

  try {
    // Release capacity
    if (record.attending) {
      const seats = record.hasSpouse ? 2 : 1;
      await client.collection("rsvp_groups").update(groupId, {
        confirmedCount: { $decrement: seats },
      });
    } else {
      await client.collection("rsvp_groups").update(groupId, {
        declinedCount: { $decrement: 1 },
      });
    }

    await client.collection("rsvp_records").delete(record.id);

    return { success: true };
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || "Failed to cancel RSVP record" });
  }
});
