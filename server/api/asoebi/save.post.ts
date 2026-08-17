import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { sendEmail } from "~~/dyrected/mailer";
import {
  rsvpConfirmationEmail,
  rsvpUpdatedEmail,
  asoebiOrderEmail,
  asoebiOrderUpdatedEmail,
  adminRsvpNotificationEmail,
} from "~~/dyrected/emails";
import { formatPhoneNumber } from "~~/utils/phone";

/** Strip all non-digits for fuzzy phone matching (lookup only). */
function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const {
    editToken,
    id,
    leadName,
    leadEmail,
    leadPhone,
    wantsAsoebi,
    asoebiYards,
    wantsAsoOke,
    asoOkeMaleQty,
    asoOkeFemaleQty,
    message,
    attending,
  } = body;

  if (!leadEmail || !leadPhone) {
    throw createError({ statusCode: 400, message: "Email and Phone Number are required." });
  }

  // Normalize phone to E.164 international format (default: +234 Nigeria)
  const normalizedPhone = formatPhoneNumber(leadPhone);

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.public.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  // Construct asoebiDetails summary
  const detailsParts = [];
  if (wantsAsoebi && asoebiYards) {
    detailsParts.push(`Customised Adire Fabric: ${asoebiYards} Yards`);
  }
  if (wantsAsoOke) {
    if (asoOkeMaleQty) detailsParts.push(`Male Aso Oke (Fila/Cap): ${asoOkeMaleQty} set(s)`);
    if (asoOkeFemaleQty) detailsParts.push(`Female Aso Oke (Gele): ${asoOkeFemaleQty} set(s)`);
  }
  const asoebiDetailsStr = detailsParts.join(" | ");

  // 1. Try to find existing record by editToken, id, email, or phone
  let existingRecord: any = null;

  if (editToken) {
    const res = await client.collection("rsvp_records").find({
      where: { editToken: { equals: editToken } },
      limit: 1,
    });
    if (res.total > 0) existingRecord = res.docs[0];
  }

  if (!existingRecord && id) {
    const res = await client.collection("rsvp_records").find({
      where: { id: { equals: id } },
      limit: 1,
    });
    if (res.total > 0) existingRecord = res.docs[0];
  }

  if (!existingRecord) {
    // Lookup by email
    const resEmail = await client.collection("rsvp_records").find({
      where: { leadEmail: { equals: leadEmail.trim().toLowerCase() } },
      limit: 1,
    });
    if (resEmail.total > 0) {
      existingRecord = resEmail.docs[0];
    } else {
      // Lookup by phone match — compare normalized query against normalized stored values
      const allRecs = await client.collection("rsvp_records").find({ limit: 500 });
      const queryPhoneClean = cleanPhone(normalizedPhone);
      const phoneMatch = allRecs.docs.find((r: any) => {
        if (!r?.leadPhone) return false;
        const rClean = cleanPhone(r.leadPhone);
        return queryPhoneClean && rClean && (rClean.endsWith(queryPhoneClean) || queryPhoneClean.endsWith(rClean));
      });
      if (phoneMatch) existingRecord = phoneMatch;
    }
  }

  const appUrl: string = (config.public as any).appUrl || "http://localhost:3000";

  // Fetch Asoebi global settings
  let asoebiSettings: any = null;
  try {
    asoebiSettings = await client.global("asoebi_settings").get();
  } catch (e) {
    console.error("Failed to fetch asoebi settings in asoebi/save.post.ts:", e);
  }

  if (existingRecord) {
    // ── Update Existing Record ──
    const updatedAttending = attending !== undefined ? attending : existingRecord.attending;
    const updated = await client.collection("rsvp_records").update(existingRecord.id, {
      leadName: leadName || existingRecord.leadName,
      leadEmail: leadEmail || existingRecord.leadEmail,
      leadPhone: normalizedPhone || existingRecord.leadPhone,
      wantsAsoebi: wantsAsoebi ?? false,
      asoebiYards: wantsAsoebi ? asoebiYards : "",
      wantsAsoOke: wantsAsoOke ?? false,
      asoOkeMaleQty: wantsAsoOke ? asoOkeMaleQty || 0 : 0,
      asoOkeFemaleQty: wantsAsoOke ? asoOkeFemaleQty || 0 : 0,
      asoebiDetails: asoebiDetailsStr,
      message: message !== undefined ? message : existingRecord.message,
    });

    const editLink = `${appUrl}/rsvp?token=${existingRecord.editToken}`;
    const wishlistLink = `${appUrl}/wishlist`;

    // Fetch events if record has selectedEvents
    const eventIds: string[] = Array.isArray(existingRecord.selectedEvents) ? existingRecord.selectedEvents : [];
    let rsvpEvents: any[] = [];
    if (eventIds.length) {
      const evRes = await client.collection("events").find({ limit: 20 });
      rsvpEvents = evRes.docs.filter((e: any) => eventIds.includes(e.id));
    }

    const emailHtml =
      existingRecord.attending === true
        ? rsvpUpdatedEmail({
            leadName: updated.leadName,
            attending: updatedAttending,
            hasSpouse: updated.hasSpouse || false,
            spouseName: updated.spouseName,
            events: rsvpEvents,
            editLink,
            wishlistLink,
            wantsAsoebi: updated.wantsAsoebi,
            asoebiYards: updated.asoebiYards,
            wantsAsoOke: updated.wantsAsoOke,
            asoOkeMaleQty: updated.asoOkeMaleQty,
            asoOkeFemaleQty: updated.asoOkeFemaleQty,
            asoebiDetails: asoebiDetailsStr,
            asoebiSettings,
            appUrl,
          })
        : asoebiOrderUpdatedEmail({
            leadName: updated.leadName,
            editLink,
            wishlistLink,
            wantsAsoebi: updated.wantsAsoebi,
            asoebiYards: updated.asoebiYards,
            wantsAsoOke: updated.wantsAsoOke,
            asoOkeMaleQty: updated.asoOkeMaleQty,
            asoOkeFemaleQty: updated.asoOkeFemaleQty,
            asoebiDetails: asoebiDetailsStr,
            asoebiSettings,
            appUrl,
          });

    sendEmail({
      to: updated.leadEmail,
      subject: `Your Aso Ebi Selection Updated, ${updated.leadName}! ✨`,
      html: emailHtml,
    }).catch(console.error);

    return { success: true, isNew: false, record: updated };
  } else {
    // ── Create New Record ──
    if (!leadName) {
      throw createError({ statusCode: 400, message: "Full Name is required for new orders." });
    }

    // Find an active RSVP group to link
    const groupsRes = await client.collection("rsvp_groups").find({ limit: 50 });
    const activeGroup = groupsRes.docs.find((g: any) => g.isActive) || groupsRes.docs[0];

    if (!activeGroup) {
      throw createError({ statusCode: 500, message: "No invitation group available. Please contact admin." });
    }

    const created = await client.collection("rsvp_records").create({
      group: activeGroup.id,
      leadName,
      leadEmail: leadEmail.trim().toLowerCase(),
      leadPhone: normalizedPhone,
      attending: attending !== undefined ? attending : false, // Default to false for standalone Asoebi orders
      wantsAsoebi: wantsAsoebi ?? false,
      asoebiYards: wantsAsoebi ? asoebiYards : "",
      wantsAsoOke: wantsAsoOke ?? false,
      asoOkeMaleQty: wantsAsoOke ? asoOkeMaleQty || 0 : 0,
      asoOkeFemaleQty: wantsAsoOke ? asoOkeFemaleQty || 0 : 0,
      asoebiDetails: asoebiDetailsStr,
      message,
    });

    const editLink = `${appUrl}/rsvp?token=${created.editToken}`;
    const wishlistLink = `${appUrl}/wishlist`;

    sendEmail({
      to: leadEmail,
      subject: `Aso Ebi Booking Confirmed, ${leadName}! 🎉`,
      html: asoebiOrderEmail({
        leadName,
        editLink,
        wishlistLink,
        wantsAsoebi: created.wantsAsoebi,
        asoebiYards: created.asoebiYards,
        wantsAsoOke: created.wantsAsoOke,
        asoOkeMaleQty: created.asoOkeMaleQty,
        asoOkeFemaleQty: created.asoOkeFemaleQty,
        asoebiDetails: asoebiDetailsStr,
        asoebiSettings,
        appUrl,
      }),
    }).catch(console.error);

    // Notify admins
    const adminsRes = await client.collection("admins").find({ limit: 20 });
    const adminEmails: string[] = adminsRes.docs.map((a: any) => a.email).filter(Boolean);
    if (adminEmails.length) {
      sendEmail({
        to: adminEmails.join(","),
        subject: `New Aso Ebi Order: ${leadName}`,
        html: adminRsvpNotificationEmail({
          leadName,
          leadEmail,
          leadPhone: normalizedPhone,
          groupName: activeGroup.name,
          attending: created.attending,
          hasSpouse: false,
          eventNames: [],
          message,
          dashboardLink: `${appUrl}/admin`,
          wantsAsoebi: created.wantsAsoebi,
          asoebiYards: created.asoebiYards,
        }),
      }).catch(console.error);
    }

    return { success: true, isNew: true, record: created };
  }
});
