import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { sendEmail } from "~~/dyrected/mailer";
import { rsvpUpdatedEmail } from "~~/dyrected/emails";
import { syncGroupCounts } from "./_counts";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { editToken, leadName, leadEmail, leadPhone, attending, hasSpouse, spouseName, dietaryNotes, message, selectedEvents } = body;

  if (!editToken) {
    throw createError({ statusCode: 400, message: "Missing edit token" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.public.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  // Find record by editToken
  const search = await client.collection("rsvp_records").find({
    where: { editToken: { equals: editToken } },
    limit: 1,
  });

  if (search.total === 0) {
    throw createError({ statusCode: 404, message: "RSVP record not found or invalid token" });
  }

  const record = search.docs[0];
  const groupId = typeof record.group === "object" ? record.group.id : record.group;

  const newAttending = attending !== undefined ? attending : record.attending;

  try {
    const updated = await client.collection("rsvp_records").update(record.id, {
      leadName,
      leadEmail,
      leadPhone,
      attending,
      hasSpouse,
      spouseName,
      dietaryNotes,
      message,
      selectedEvents,
    });

    await syncGroupCounts(client, groupId);

    // Fetch event names for email
    const eventIds: string[] = Array.isArray(selectedEvents) ? selectedEvents : [];
    let eventNames: string[] = [];
    if (eventIds.length) {
      const evRes = await client.collection("events").find({ limit: 20 });
      eventNames = evRes.docs
        .filter((e: any) => eventIds.includes(e.id))
        .map((e: any) => e.name);
    }

    const config2 = useRuntimeConfig();
    const appUrl: string = (config2.public as any).appUrl || "http://localhost:3000";
    const editLink = `${appUrl}/rsvp?token=${record.editToken}`;

    sendEmail({
      to: updated.leadEmail ?? leadEmail,
      subject: `Your RSVP has been updated, ${updated.leadName ?? leadName}`,
      html: rsvpUpdatedEmail({
        leadName: updated.leadName ?? leadName,
        attending: newAttending,
        hasSpouse: updated.hasSpouse ?? hasSpouse,
        spouseName: updated.spouseName ?? spouseName,
        eventNames,
        editLink,
      }),
    }).catch(console.error);

    return { success: true, record: updated };
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || "Failed to update RSVP record" });
  }
});
