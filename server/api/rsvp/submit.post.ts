import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { groupSlug, leadName, leadEmail, leadPhone, attending, hasSpouse, spouseName, dietaryNotes, message, selectedEvents } = body;

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
    where: { slug: { equals: groupSlug } },
    limit: 1,
  });

  if (groupSearch.total === 0 || !groupSearch.docs[0].isActive) {
    throw createError({ statusCode: 404, message: "Group not found or inactive" });
  }

  const group = groupSearch.docs[0];

  // Duplicate email check
  const emailCheck = await client.collection("rsvp_records").find({
    where: { leadEmail: { equals: leadEmail } },
    limit: 1,
  });
  if (emailCheck.total > 0) {
    throw createError({
      statusCode: 409,
      message: "It looks like you've already RSVP'd. Check your confirmation email to make any changes.",
    });
  }

  // Duplicate phone check
  const phoneCheck = await client.collection("rsvp_records").find({
    where: { leadPhone: { equals: leadPhone } },
    limit: 1,
  });
  if (phoneCheck.total > 0) {
    throw createError({
      statusCode: 409,
      message: "This WhatsApp number has already been used to RSVP. Check your confirmation email to make any changes.",
    });
  }

  // Capacity check
  if (attending) {
    const seats = hasSpouse ? 2 : 1;
    const confirmedCount = group.confirmedCount || 0;
    if (confirmedCount + seats > group.maxCapacity) {
      throw createError({
        statusCode: 409,
        message: "Sorry, there are no more spots available. Please contact the couple directly.",
      });
    }
  }

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
      selectedEvents,
    });

    // Update group counts after successful record creation
    if (attending) {
      const seats = hasSpouse ? 2 : 1;
      await client.collection("rsvp_groups").update(group.id, {
        confirmedCount: { $increment: seats },
      } as any);
    } else {
      await client.collection("rsvp_groups").update(group.id, {
        declinedCount: { $increment: 1 },
      } as any);
    }

    return { success: true, record };
  } catch (err: any) {
    throw createError({ statusCode: 400, message: err.message || "Failed to submit RSVP" });
  }
});
