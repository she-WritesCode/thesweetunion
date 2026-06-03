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

  const search = await client.collection("rsvp_records").find({
    where: { editToken: { equals: token } },
    limit: 1,
    depth: 1,
  });

  if (search.total === 0) {
    throw createError({ statusCode: 404, message: "RSVP record not found or invalid token" });
  }

  return search.docs[0];
});
