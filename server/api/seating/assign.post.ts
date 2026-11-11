import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { requireAdmin } from "~~/server/utils/require-admin";
import { fetchAllDocs } from "~~/server/utils/fetch-all";
import { seatingTableByNumber } from "~~/config/seating";

/**
 * Seat (or unseat) one or more guests.
 * body: { guestIds: string[], tableNumber: number | null, force?: boolean }
 * Rejects with 409 when the table would exceed capacity unless `force` is set.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);
  const guestIds: string[] = Array.isArray(body?.guestIds) ? body.guestIds.map(String) : [];
  const tableNumber: number | null = body?.tableNumber == null ? null : Number(body.tableNumber);
  const force = body?.force === true;

  if (!guestIds.length) throw createError({ statusCode: 400, message: "No guests supplied." });

  const table = tableNumber == null ? null : seatingTableByNumber(tableNumber);
  if (tableNumber != null && !table) {
    throw createError({ statusCode: 400, message: `Table ${tableNumber} does not exist.` });
  }

  const config = useRuntimeConfig();
  const client = createClient({ baseUrl: config.dyrectedUrl, apiKey: config.dyrectedApiKey });

  const records = await fetchAllDocs(client, "rsvp_records", { depth: 0 });
  const seatsOf = (r: any) => (r.hasSpouse === true || r.hasSpouse === "true" ? 2 : 1);
  const moving = records.filter((r: any) => guestIds.includes(String(r.id)));
  if (moving.length !== guestIds.length) {
    throw createError({ statusCode: 404, message: "One or more guests were not found." });
  }

  if (table && !force) {
    const movingSet = new Set(guestIds);
    const occupied = records
      .filter(
        (r: any) =>
          Number(r.tableNumber) === table.number &&
          (r.attending === true || r.attending === "true") &&
          !movingSet.has(String(r.id)),
      )
      .reduce((sum: number, r: any) => sum + seatsOf(r), 0);
    const incoming = moving.reduce((sum: number, r: any) => sum + seatsOf(r), 0);
    if (occupied + incoming > table.capacity) {
      throw createError({
        statusCode: 409,
        message: `Table ${table.number} has ${table.capacity - occupied} seat(s) free but ${incoming} needed.`,
        data: { free: table.capacity - occupied, needed: incoming },
      });
    }
  }

  for (const r of moving) {
    await client.collection("rsvp_records").update(String(r.id), { tableNumber });
  }

  return { success: true, updated: moving.length };
});
