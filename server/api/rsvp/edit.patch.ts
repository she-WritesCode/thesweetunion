import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { sendEmail } from "~~/dyrected/mailer";
import { rsvpUpdatedEmail } from "~~/dyrected/emails";
import { syncGroupCounts } from "./_counts";
import { formatPhoneNumber } from "~~/utils/phone";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const {
    editToken,
    leadName,
    leadEmail,
    leadPhone,
    attending,
    hasSpouse,
    spouseName,
    dietaryNotes,
    message,
    selectedEvents,
    wantsAsoebi,
    asoebiYards,
    wantsAsoOke,
    asoOkeMaleQty,
    asoOkeFemaleQty,
  } = body;

  if (!editToken) {
    throw createError({ statusCode: 400, message: "Missing edit token" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl || config.public.dyrectedUrl,
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

  // Normalize phone to E.164 international format (default: +234 Nigeria)
  const normalizedPhone = leadPhone ? formatPhoneNumber(leadPhone) : leadPhone;

  const newAttending = attending !== undefined ? attending : record.attending;
  const newWantsAsoebi = wantsAsoebi !== undefined ? wantsAsoebi : record.wantsAsoebi;
  const newAsoebiYards = asoebiYards !== undefined ? asoebiYards : record.asoebiYards;
  const newWantsAsoOke = wantsAsoOke !== undefined ? wantsAsoOke : record.wantsAsoOke;
  const newAsoOkeMaleQty = asoOkeMaleQty !== undefined ? asoOkeMaleQty : record.asoOkeMaleQty;
  const newAsoOkeFemaleQty = asoOkeFemaleQty !== undefined ? asoOkeFemaleQty : record.asoOkeFemaleQty;

  const detailsParts = [];
  if (newWantsAsoebi && newAsoebiYards) {
    detailsParts.push(`Customised Adire Fabric: ${newAsoebiYards} Yards`);
  }
  if (newWantsAsoOke) {
    if (newAsoOkeMaleQty) detailsParts.push(`Male Aso Oke (Fila/Cap): ${newAsoOkeMaleQty} set(s)`);
    if (newAsoOkeFemaleQty) detailsParts.push(`Female Aso Oke (Gele): ${newAsoOkeFemaleQty} set(s)`);
  }
  const asoebiDetailsStr = detailsParts.join(" | ");

  try {
    const updated = await client.collection("rsvp_records").update(record.id, {
      leadName,
      leadEmail,
      leadPhone: normalizedPhone,
      attending: newAttending,
      hasSpouse,
      spouseName,
      dietaryNotes,
      message,
      selectedEvents,
      wantsAsoebi: newWantsAsoebi,
      asoebiYards: newWantsAsoebi ? newAsoebiYards : "",
      wantsAsoOke: newWantsAsoOke,
      asoOkeMaleQty: newWantsAsoOke ? newAsoOkeMaleQty || 0 : 0,
      asoOkeFemaleQty: newWantsAsoOke ? newAsoOkeFemaleQty || 0 : 0,
      asoebiDetails: asoebiDetailsStr,
    });

    await syncGroupCounts(client, groupId);

    // Fetch events for email
    const eventIds: string[] = Array.isArray(selectedEvents) ? selectedEvents : [];
    let rsvpEvents: any[] = [];
    const evRes = await client.collection("events").find({ limit: 20 });
    const allDocs = [...evRes.docs].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    rsvpEvents = allDocs.filter((e: any) => !e.collectsRsvp || eventIds.includes(e.id));
    if (!rsvpEvents.length) {
      rsvpEvents = allDocs;
    }

    const config2 = useRuntimeConfig();
    const appUrl: string = (config2.public as any).appUrl || "http://localhost:3000";
    const editLink = `${appUrl}/rsvp?token=${record.editToken}`;
    const wishlistLink = `${appUrl}/wishlist`;

    // Fetch Asoebi global settings if wantsAsoebi or wantsAsoOke is true
    let asoebiSettings: any = null;
    if (newWantsAsoebi || newWantsAsoOke) {
      try {
        asoebiSettings = await client.global("asoebi_settings").get();
      } catch (e) {
        console.error("Failed to fetch asoebi settings in edit.patch.ts:", e);
      }
    }

    sendEmail({
      to: updated.leadEmail ?? leadEmail,
      subject: `Your RSVP has been updated, ${updated.leadName ?? leadName}`,
      html: rsvpUpdatedEmail({
        leadName: updated.leadName ?? leadName,
        attending: newAttending,
        hasSpouse: updated.hasSpouse ?? hasSpouse,
        spouseName: updated.spouseName ?? spouseName,
        events: rsvpEvents,
        editLink,
        wishlistLink,
        wantsAsoebi: newWantsAsoebi,
        asoebiYards: newWantsAsoebi ? newAsoebiYards : "",
        wantsAsoOke: newWantsAsoOke,
        asoOkeMaleQty: newWantsAsoOke ? newAsoOkeMaleQty || 0 : 0,
        asoOkeFemaleQty: newWantsAsoOke ? newAsoOkeFemaleQty || 0 : 0,
        asoebiDetails: asoebiDetailsStr,
        asoebiSettings,
        appUrl,
      }),
    }).catch(console.error);

    return { success: true, record: updated };
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || "Failed to update RSVP record" });
  }
});
