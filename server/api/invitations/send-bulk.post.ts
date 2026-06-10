import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { rsvpIds, via = "whatsapp" }: { rsvpIds: string[]; via?: string } = body;

  if (!Array.isArray(rsvpIds) || rsvpIds.length === 0) {
    throw createError({ statusCode: 400, message: "rsvpIds array is required" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const results: { id: string; success: boolean; guestName?: string; error?: string }[] = [];

  for (const rsvpId of rsvpIds) {
    try {
      const rsvp = await client.collection("rsvp_records").findByID(rsvpId);
      if (!rsvp || !rsvp.leadPhone) {
        results.push({ id: rsvpId, success: false, error: "No phone number on record" });
        continue;
      }

      await client.collection("rsvp_records").update(rsvpId, {
        invitationSent: true,
        invitationSentAt: new Date().toISOString(),
        invitationSentVia: via,
      });

      results.push({ id: rsvpId, success: true, guestName: rsvp.leadName });
    } catch (err: any) {
      results.push({ id: rsvpId, success: false, error: err.message });
    }
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return { results, sent, failed };
});
