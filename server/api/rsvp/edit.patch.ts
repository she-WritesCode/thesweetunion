import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { editToken, leadName, leadEmail, leadPhone, attending, hasSpouse, spouseName, dietaryNotes, message, events } = body;

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

  // Recalculate capacity changes
  const oldAttending = record.attending;
  const oldSeats = oldAttending ? (record.hasSpouse ? 2 : 1) : 0;
  
  const newAttending = attending !== undefined ? attending : oldAttending;
  const newSeats = newAttending ? ((hasSpouse !== undefined ? hasSpouse : record.hasSpouse) ? 2 : 1) : 0;

  try {
    if (oldAttending && newAttending) {
      const diff = newSeats - oldSeats;
      if (diff !== 0) {
        await client.collection("rsvp_groups").update(groupId, {
          confirmedCount: { [diff > 0 ? "$increment" : "$decrement"]: Math.abs(diff) }
        });
      }
    } else if (oldAttending && !newAttending) {
      await client.collection("rsvp_groups").update(groupId, {
        confirmedCount: { $decrement: oldSeats },
        declinedCount: { $increment: 1 }
      });
    } else if (!oldAttending && newAttending) {
      await client.collection("rsvp_groups").update(groupId, {
        confirmedCount: { $increment: newSeats },
        declinedCount: { $decrement: 1 }
      });
    }

    // Perform update bypassing normal access restrictions via admin client
    const updated = await client.collection("rsvp_records").update(record.id, {
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

    return { success: true, record: updated };
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || "Failed to update RSVP record" });
  }
});
