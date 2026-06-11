import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { sendEmail } from "~~/dyrected/mailer";
import { rsvpConfirmationEmail, adminRsvpNotificationEmail } from "~~/dyrected/emails";
import { syncGroupCounts } from "./_counts";

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

  // Capacity check — live count from records, not the cached field
  if (attending) {
    const seats = hasSpouse ? 2 : 1;
    const existing = await client.collection("rsvp_records").find({
      where: { group: { equals: group.id } },
      limit: 500,
    });
    const currentSeats = existing.docs
      .filter((r: any) => r.attending)
      .reduce((n: number, r: any) => n + (r.hasSpouse ? 2 : 1), 0);
    if (currentSeats + seats > group.maxCapacity) {
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

    await syncGroupCounts(client, group.id);

    // Fetch event names for emails
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
    const wishlistLink = `${appUrl}/wishlist`;

    // Guest confirmation — fire and forget
    sendEmail({
      to: leadEmail,
      subject: attending
        ? `You're on the list, ${leadName}! 🎉`
        : `We'll miss you, ${leadName}`,
      html: rsvpConfirmationEmail({
        leadName,
        attending,
        hasSpouse,
        spouseName,
        eventNames,
        editLink,
        wishlistLink,
      }),
    }).catch(console.error);

    // Admin notification — fire and forget
    const adminsRes = await client.collection("admins").find({ limit: 20 });
    const adminEmails: string[] = adminsRes.docs.map((a: any) => a.email).filter(Boolean);
    if (adminEmails.length) {
      sendEmail({
        to: adminEmails.join(","),
        subject: `New RSVP: ${leadName} — ${attending ? "Attending" : "Declined"}`,
        html: adminRsvpNotificationEmail({
          leadName,
          leadEmail,
          leadPhone,
          groupName: group.name,
          attending,
          hasSpouse,
          spouseName,
          eventNames,
          message,
          dashboardLink: `${appUrl}/admin`,
        }),
      }).catch(console.error);
    }

    return { success: true, record };
  } catch (err: any) {
    throw createError({ statusCode: 400, message: err.message || "Failed to submit RSVP" });
  }
});
