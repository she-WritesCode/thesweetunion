import { defineEventHandler, getQuery, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { sendEmail } from "~~/dyrected/mailer";
import { rsvpCancelledEmail } from "~~/dyrected/emails";
import { syncGroupCounts } from "./_counts";

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
    await client.collection("rsvp_records").delete(record.id);
    await syncGroupCounts(client, groupId);

    sendEmail({
      to: record.leadEmail,
      subject: `Your RSVP has been cancelled, ${record.leadName}`,
      html: rsvpCancelledEmail({ leadName: record.leadName }),
    }).catch(console.error);

    return { success: true };
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || "Failed to cancel RSVP record" });
  }
});
