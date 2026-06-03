import { defineEventHandler, getQuery, createError } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const id = query.id as string;

  if (!id) {
    throw createError({ statusCode: 400, message: "Missing reservation id" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.public.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  try {
    await client.collection("reservations").delete(id);
    return { success: true };
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || "Failed to cancel reservation" });
  }
});
