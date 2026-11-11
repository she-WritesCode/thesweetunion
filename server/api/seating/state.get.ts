import { defineEventHandler, setHeader } from "h3";
import { createClient } from "@dyrected/sdk";
import { requireAdmin } from "~~/server/utils/require-admin";
import { fetchAllDocs } from "~~/server/utils/fetch-all";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  setHeader(event, "Cache-Control", "no-store");

  const config = useRuntimeConfig();
  const client = createClient({ baseUrl: config.dyrectedUrl, apiKey: config.dyrectedApiKey });

  const records = await fetchAllDocs(client, "rsvp_records", { depth: 1 });

  // Attending is filtered in JS (boolean WHERE filters fail on Postgres).
  const guests = records
    .filter((r: any) => r && (r.attending === true || r.attending === "true"))
    .map((r: any) => {
      const hasSpouse = r.hasSpouse === true || r.hasSpouse === "true";
      const table = Number(r.tableNumber);
      return {
        id: String(r.id),
        leadName: r.leadName || "Guest",
        spouseName: hasSpouse ? r.spouseName || "" : "",
        hasSpouse,
        seats: hasSpouse ? 2 : 1,
        groupName: typeof r.group === "object" ? r.group?.name || "" : "",
        tableNumber: Number.isFinite(table) && table > 0 ? table : null,
        checkedIn: r.checkedIn === true || r.checkedIn === "true",
      };
    })
    .sort((a: any, b: any) => a.leadName.localeCompare(b.leadName));

  return { success: true, guests };
});
