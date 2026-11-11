import { defineEventHandler, readBody, createError, getHeader, getCookie } from "h3";
import { createClient } from "@dyrected/sdk";
import { requireAdmin } from "~~/server/utils/require-admin";
import { loadTableOverrides, MAX_TABLE_CAPACITY } from "~~/server/utils/seating";
import { SEATING_TABLES } from "~~/config/seating";

/** Rename a table and/or change its seat count: { number, label?, capacity? } */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await readBody(event);

  const number = Number(body?.number);
  const table = SEATING_TABLES.find((t) => t.number === number);
  if (!table) throw createError({ statusCode: 400, message: `Table ${body?.number} does not exist.` });

  const label = typeof body?.label === "string" ? body.label.trim().slice(0, 40) : undefined;
  let capacity: number | undefined;
  if (body?.capacity !== undefined && body?.capacity !== null && body?.capacity !== "") {
    capacity = Math.floor(Number(body.capacity));
    if (!Number.isFinite(capacity) || capacity < 0 || capacity > MAX_TABLE_CAPACITY) {
      throw createError({ statusCode: 400, message: `Seats must be between 0 and ${MAX_TABLE_CAPACITY}.` });
    }
  }

  // Updating a global requires a signed-in admin (access.update = "user != null"),
  // so forward the admin's own token along with the API key.
  const token =
    getHeader(event, "authorization")?.replace(/^Bearer\s+/i, "") ||
    getCookie(event, "__dyrected_token") ||
    getCookie(event, "dyrected_token");

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
    token: token || undefined,
  });

  const rows = await loadTableOverrides(client);
  const existing = rows.find((r) => r.number === number);
  const next = {
    number,
    label: label ?? existing?.label ?? "",
    capacity: capacity ?? (existing && Number.isFinite(existing.capacity) ? existing.capacity : table.capacity),
  };

  // Drop rows that match the defaults so the list only holds real overrides.
  const isDefault = !next.label && next.capacity === table.capacity;
  const merged = [...rows.filter((r) => r.number !== number), ...(isDefault ? [] : [next])]
    .sort((a, b) => a.number - b.number)
    .map((r) => ({
      number: r.number,
      label: r.label || "",
      ...(Number.isFinite(r.capacity) ? { capacity: r.capacity } : {}),
    }));

  try {
    await client.global("seating_settings").update({ tables: merged } as any);
  } catch (err: any) {
    console.error("[seating/settings] update failed:", err);
    throw createError({
      statusCode: 500,
      message: `Could not save table settings: ${err?.message || "unknown error"}`,
    });
  }
  return { success: true, table: next };
});
