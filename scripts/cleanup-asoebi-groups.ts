/**
 * Migration script: Detach non-attending / Asoebi-only records from RSVP groups,
 * and recalculate confirmedCount & declinedCount for all groups.
 *
 * Usage:
 *   npx tsx scripts/cleanup-asoebi-groups.ts
 */

import postgres from "postgres";
import { backupDatabase, loadEnv } from "./backup-db.ts";

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set. Check your .env.local file.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: "prefer" });

function parseData(data: any) {
  while (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      break;
    }
  }
  return data && typeof data === "object" ? data : {};
}

function isAttending(val: any): boolean {
  return val === true || val === "true" || val === 1 || val === "1";
}

function hasSpouse(val: any): boolean {
  return val === true || val === "true" || val === 1 || val === "1";
}

function extractGroupId(val: any): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    if (val.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(val);
        if (parsed?.id) return String(parsed.id);
      } catch {}
    }
    return val.trim();
  }
  if (typeof val === "object" && val !== null && val.id) {
    return String(val.id);
  }
  return null;
}

async function main() {
  console.log("🚀 Starting Asoebi group cleanup & recalculation...\n");

  // 1. Mandatory Automated Pre-flight Backup
  await backupDatabase("pre-asoebi-group-cleanup");

  // 2. Fetch all RSVP records
  console.log("\n🔍 Fetching guest records...");
  const records = await sql.unsafe(`SELECT id, data FROM "collection_rsvp_records"`);
  console.log(`📋 Found ${records.length} record(s).`);

  let modifiedCount = 0;
  for (const row of records) {
    const data = parseData(row.data);
    const isAsoebiSource = data.source === "asoebi" || data.asoebiSource === "asoebi";
    const isNonAttending = !isAttending(data.attending);

    // Target records from asoebi page or non-attending records that have a group assigned
    if ((isAsoebiSource || isNonAttending) && data.group) {
      const prevGroup = extractGroupId(data.group);
      data.group = null;
      data.updatedAt = new Date().toISOString();

      await sql`UPDATE "collection_rsvp_records" SET data = ${sql.json(data)} WHERE id = ${row.id}`;
      console.log(
        `  ✓ Detached record "${data.leadName}" (${row.id}) from group "${prevGroup}" (source: ${data.source || "rsvp"}, attending: ${data.attending})`,
      );
      modifiedCount++;
    }
  }

  console.log(`\n✅ Detached group from ${modifiedCount} record(s).\n`);

  // 3. Recalculate group counts
  console.log("🔄 Recalculating group counts for all RSVP groups...");
  const groupRows = await sql.unsafe(`SELECT id, data FROM "collection_rsvp_groups"`);
  const refreshedRecordRows = await sql.unsafe(`SELECT id, data FROM "collection_rsvp_records"`);

  const groupStatsMap = new Map<
    string,
    {
      confirmedSeats: number;
      confirmedLeads: number;
      spouseCount: number;
      declinedCount: number;
      totalResponses: number;
    }
  >();

  for (const groupRow of groupRows) {
    groupStatsMap.set(groupRow.id, {
      confirmedSeats: 0,
      confirmedLeads: 0,
      spouseCount: 0,
      declinedCount: 0,
      totalResponses: 0,
    });
  }

  for (const recordRow of refreshedRecordRows) {
    const data = parseData(recordRow.data);
    const groupId = extractGroupId(data.group);

    if (!groupId || !groupStatsMap.has(groupId)) {
      continue;
    }

    const stats = groupStatsMap.get(groupId)!;
    stats.totalResponses += 1;

    if (isAttending(data.attending)) {
      stats.confirmedLeads += 1;
      const spouse = hasSpouse(data.hasSpouse);
      if (spouse) {
        stats.spouseCount += 1;
        stats.confirmedSeats += 2;
      } else {
        stats.confirmedSeats += 1;
      }
    } else {
      stats.declinedCount += 1;
    }
  }

  let updatedGroups = 0;
  for (const groupRow of groupRows) {
    const data = parseData(groupRow.data);
    const stats = groupStatsMap.get(groupRow.id)!;

    const prevConfirmed = Number(data.confirmedCount) || 0;
    const prevDeclined = Number(data.declinedCount) || 0;

    const changed = prevConfirmed !== stats.confirmedSeats || prevDeclined !== stats.declinedCount;

    data.confirmedCount = stats.confirmedSeats;
    data.declinedCount = stats.declinedCount;

    if (changed) {
      await sql`UPDATE "collection_rsvp_groups" SET data = ${sql.json(data)} WHERE id = ${groupRow.id}`;
      console.log(
        `  ✓ Group "${data.name}" (${groupRow.id}):\n` +
          `     Confirmed Seats: ${prevConfirmed} → ${stats.confirmedSeats}\n` +
          `     Declined: ${prevDeclined} → ${stats.declinedCount}`,
      );
      updatedGroups++;
    }
  }

  console.log(`\n🎉 Recalculation complete. ${updatedGroups} group(s) updated.`);
  await sql.end();
}

main().catch((err) => {
  console.error("❌ Cleanup failed:", err);
  process.exit(1);
});
