import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";

type Client = ReturnType<typeof createClient>;

async function findOne(client: Client, slug: string, id: string) {
  const res = await client.collection(slug).find({ where: { id: { equals: id } }, limit: 1 });
  return res.docs?.[0] ?? null;
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { rsvpRecordId, eventId, scannedBy } = body;

  if (!rsvpRecordId) {
    throw createError({ statusCode: 400, message: "Missing rsvpRecordId" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  // Look up the RSVP record — depth:1 populates group inline
  const rsvpRes = await client.collection("rsvp_records").find({ where: { id: { equals: rsvpRecordId } }, limit: 1, depth: 1 });
  const rsvp = rsvpRes.docs?.[0] ?? null;
  if (!rsvp) {
    throw createError({ statusCode: 404, message: "Invalid QR code — guest not found." });
  }

  if (!rsvp.attending) {
    throw createError({ statusCode: 400, message: "This guest has declined attendance." });
  }

  // Duplicate scan check
  if (rsvp.checkedIn && rsvp.checkIn) {
    let checkInTime = "earlier";
    try {
      const existingId = typeof rsvp.checkIn === "object" ? rsvp.checkIn.id : rsvp.checkIn;
      const existingCheckIn = await findOne(client, "check_ins", existingId);
      if (existingCheckIn?.createdAt) {
        checkInTime = new Date(existingCheckIn.createdAt).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch {}

    throw createError({
      statusCode: 409,
      message: `Guest already checked in at ${checkInTime}.`,
      data: { alreadyCheckedIn: true, checkInTime, guestName: rsvp.leadName },
    });
  }

  const guestName =
    rsvp.hasSpouse && rsvp.spouseName
      ? `${rsvp.leadName} + ${rsvp.spouseName}`
      : rsvp.leadName;
  const partySize = rsvp.hasSpouse ? 2 : 1;

  // group is populated via depth:1
  const groupName = typeof rsvp.group === "object" ? (rsvp.group?.name ?? "") : "";

  // Create the check-in record
  const checkIn = await client.collection("check_ins").create({
    rsvpRecord: rsvpRecordId,
    event: eventId || null,
    guestName,
    partySize,
    scannedBy: scannedBy || "",
  });

  // Update RSVP record to mark as checked in
  await client.collection("rsvp_records").update(rsvpRecordId, {
    checkIn: checkIn.id,
    checkedIn: true,
  });

  return {
    success: true,
    checkIn,
    guest: {
      id: rsvp.id,
      leadName: rsvp.leadName,
      spouseName: rsvp.hasSpouse ? rsvp.spouseName : null,
      hasSpouse: rsvp.hasSpouse ?? false,
      partySize,
      groupName,
    },
    welcomeMessage: `Welcome, ${guestName}! 🎉`,
  };
});
