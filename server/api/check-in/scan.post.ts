import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { loadTableMeta } from "~~/server/utils/seating";

type Client = ReturnType<typeof createClient>;

async function findOne(client: Client, slug: string, id: string) {
  const res = await client.collection(slug).find({ where: { id: { equals: id } }, limit: 1 });
  return res.docs?.[0] ?? null;
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
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

  // Normalize input: extract code from full URL (e.g. https://thesweetunion.vercel.app/pass/5QYW6M or /pass/5QYW6M)
  let rawKey = String(rsvpRecordId || "").trim();
  if (rawKey.includes("/pass/")) {
    const part = rawKey.split("/pass/")[1] || "";
    rawKey = part.split(/[?#\/]/)[0].trim();
  } else if (rawKey.startsWith("http://") || rawKey.startsWith("https://")) {
    try {
      const parsed = new URL(rawKey);
      const segments = parsed.pathname.split("/").filter(Boolean);
      rawKey = segments[segments.length - 1] || rawKey;
    } catch {}
  }

  const cleanScanKey = rawKey.replace(/[^\w-]/g, "").trim();
  const upperScanKey = cleanScanKey.toUpperCase();

  // Look up RSVP record by passCode (6-char) or id or editToken
  let rsvpRes = await client.collection("rsvp_records").find({
    where: { passCode: { equals: upperScanKey } },
    limit: 1,
    depth: 1,
  });

  if (!rsvpRes.docs || rsvpRes.docs.length === 0) {
    rsvpRes = await client.collection("rsvp_records").find({
      where: { id: { equals: cleanScanKey } },
      limit: 1,
      depth: 1,
    });
  }

  if (!rsvpRes.docs || rsvpRes.docs.length === 0) {
    rsvpRes = await client.collection("rsvp_records").find({
      where: { editToken: { equals: cleanScanKey } },
      limit: 1,
      depth: 1,
    });
  }

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

  // Create the check-in record using the true record ID
  const checkInData: Record<string, any> = {
    rsvpRecord: rsvp.id,
    guestName,
    partySize,
    scannedBy: scannedBy || "",
  };
  if (eventId) {
    checkInData.event = eventId;
  }

  let checkIn: any = null;
  try {
    checkIn = await client.collection("check_ins").create(checkInData);
  } catch (err: any) {
    console.error("[check-in/scan] Failed to create check_in:", err);
    throw createError({
      statusCode: 500,
      message: `Failed to create check-in record: ${err?.message || "Internal error"}`,
    });
  }

  const checkInId = checkIn?.id || checkIn?.doc?.id;

  // Update RSVP record to mark as checked in using the true record ID
  try {
    await client.collection("rsvp_records").update(rsvp.id, {
      checkIn: checkInId,
      checkedIn: true,
    });
  } catch (err: any) {
    console.warn("[check-in/scan] Could not link checkIn to rsvp_records:", err);
  }

  const tableNum = Number(rsvp.tableNumber);
  const tableNumber = Number.isFinite(tableNum) && tableNum > 0 ? tableNum : null;
  let tableLabel = "";
  if (tableNumber) {
    try {
      tableLabel = (await loadTableMeta(client)).find((t) => t.number === tableNumber)?.label || "";
    } catch {}
  }

  return {
    success: true,
    checkIn,
    guest: {
      tableNumber,
      tableLabel,
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
