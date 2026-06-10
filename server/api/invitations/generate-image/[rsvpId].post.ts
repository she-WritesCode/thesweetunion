import { defineEventHandler, getRouterParam, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import QRCode from "qrcode";

export default defineEventHandler(async (event) => {
  const rsvpId = getRouterParam(event, "rsvpId");
  if (!rsvpId) {
    throw createError({ statusCode: 400, message: "Missing rsvpId" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const result = await client.collection("rsvp_records").find({
    where: { id: { equals: rsvpId } },
    limit: 1,
  });
  const rsvp = result.docs?.[0];
  if (!rsvp) {
    throw createError({ statusCode: 404, message: "RSVP record not found" });
  }

  const guestName =
    rsvp.hasSpouse && rsvp.spouseName
      ? `${rsvp.leadName} + ${rsvp.spouseName}`
      : rsvp.leadName;

  const qrDataUrl = await QRCode.toDataURL(rsvpId, {
    width: 200,
    margin: 2,
    color: { dark: "#30222A", light: "#FFFFFF" },
  });

  // Get table label if seating is set up
  let tableLabel = "";
  if (rsvp.seatAssignment) {
    try {
      const assignmentId =
        typeof rsvp.seatAssignment === "object" ? rsvp.seatAssignment.id : rsvp.seatAssignment;
      const assignmentRes = await client.collection("seat_assignments").find({
        where: { id: { equals: assignmentId } },
        limit: 1,
      });
      const assignment = assignmentRes.docs?.[0];
      if (assignment?.table) {
        const tableId = typeof assignment.table === "object" ? assignment.table.id : assignment.table;
        const tableRes = await client.collection("tables").find({
          where: { id: { equals: tableId } },
          limit: 1,
        });
        tableLabel = tableRes.docs?.[0]?.label || "";
      }
    } catch {
      // Seating not yet implemented
    }
  }

  return {
    rsvpId,
    guestName,
    tableLabel,
    qrDataUrl,
    rsvp: {
      id: rsvp.id,
      leadName: rsvp.leadName,
      hasSpouse: rsvp.hasSpouse,
      spouseName: rsvp.spouseName,
    },
  };
});
