import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { requireAdmin } from "~~/server/utils/require-admin";
import { fetchAllDocs } from "~~/server/utils/fetch-all";
import { loadTableMeta } from "~~/server/utils/seating";

/**
 * Seat (or unseat) guests. Accepts one or many assignments in a single call:
 *   { assignments: [{ guestIds: string[], tableNumber: number | null }], force?: boolean }
 * (legacy single form { guestIds, tableNumber } is also accepted).
 * Rejects with 409 when any table would exceed capacity unless `force` is set.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);
  const force = body?.force === true;
  const rawAssignments: any[] = Array.isArray(body?.assignments)
    ? body.assignments
    : [{ guestIds: body?.guestIds, tableNumber: body?.tableNumber }];

  const assignments = rawAssignments.map((a) => ({
    guestIds: Array.isArray(a?.guestIds) ? a.guestIds.map(String) : [],
    tableNumber: a?.tableNumber == null ? null : Number(a.tableNumber),
  }));

  if (!assignments.length || assignments.some((a) => !a.guestIds.length)) {
    throw createError({ statusCode: 400, message: "No guests supplied." });
  }

  const config = useRuntimeConfig();
  const client = createClient({ baseUrl: config.dyrectedUrl, apiKey: config.dyrectedApiKey });

  const [records, tables] = await Promise.all([
    fetchAllDocs(client, "rsvp_records", { depth: 0 }),
    loadTableMeta(client),
  ]);
  const tableByNumber = new Map(tables.map((t) => [t.number, t]));

  for (const a of assignments) {
    if (a.tableNumber != null && !tableByNumber.has(a.tableNumber)) {
      throw createError({ statusCode: 400, message: `Table ${a.tableNumber} does not exist.` });
    }
  }

  const seatsOf = (r: any) => (r.hasSpouse === true || r.hasSpouse === "true" ? 2 : 1);
  const byId = new Map(records.map((r: any) => [String(r.id), r]));
  const movingIds = new Set<string>();
  for (const a of assignments) {
    for (const id of a.guestIds) {
      if (!byId.has(id)) throw createError({ statusCode: 404, message: "One or more guests were not found." });
      movingIds.add(id);
    }
  }

  if (!force) {
    // Seats already taken per table by guests who are NOT being moved in this request
    const taken = new Map<number, number>();
    for (const r of records) {
      const n = Number(r.tableNumber);
      if (!n || movingIds.has(String(r.id))) continue;
      if (!(r.attending === true || r.attending === "true")) continue;
      taken.set(n, (taken.get(n) || 0) + seatsOf(r));
    }
    for (const a of assignments) {
      if (a.tableNumber == null) continue;
      taken.set(a.tableNumber, (taken.get(a.tableNumber) || 0) + a.guestIds.reduce((s, id) => s + seatsOf(byId.get(id)), 0));
    }
    for (const [n, used] of taken) {
      const cap = tableByNumber.get(n)?.capacity ?? 0;
      const movedHere = assignments.some((a) => a.tableNumber === n);
      if (movedHere && used > cap) {
        throw createError({
          statusCode: 409,
          message: `Table ${n} would have ${used} guests for ${cap} seats.`,
          data: { table: n, used, capacity: cap },
        });
      }
    }
  }

  const updates = assignments.flatMap((a) => a.guestIds.map((id) => ({ id, tableNumber: a.tableNumber })));
  for (let i = 0; i < updates.length; i += 10) {
    await Promise.all(
      updates.slice(i, i + 10).map((u) => client.collection("rsvp_records").update(u.id, { tableNumber: u.tableNumber })),
    );
  }

  return { success: true, updated: updates.length };
});
