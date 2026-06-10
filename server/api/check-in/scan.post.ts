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

  // Look up the RSVP record
  const rsvp = await findOne(client, "rsvp_records", rsvpRecordId);
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

  // Get table label from seat assignment if seating has been implemented
  let tableLabel = "";
  if (rsvp.seatAssignment) {
    try {
      const assignmentId =
        typeof rsvp.seatAssignment === "object" ? rsvp.seatAssignment.id : rsvp.seatAssignment;
      const assignment = await findOne(client, "seat_assignments", assignmentId);
      if (assignment?.table) {
        const tableId = typeof assignment.table === "object" ? assignment.table.id : assignment.table;
        const table = await findOne(client, "tables", tableId);
        tableLabel = table?.label || "";
      }
    } catch {
      // Seating not yet implemented — skip gracefully
    }
  }

  // Create the check-in record
  const checkIn = await client.collection("check_ins").create({
    rsvpRecord: rsvpRecordId,
    event: eventId || null,
    guestName,
    tableLabel,
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
      name: guestName,
      partySize,
      tableLabel,
    },
    welcomeMessage: tableLabel
      ? `Welcome, ${guestName}! You're at ${tableLabel}. 🎉`
      : `Welcome, ${guestName}! 🎉`,
  };
});
