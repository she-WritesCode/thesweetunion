/**
 * Migration script: Recalculate and backfill `confirmedCount` and `declinedCount`
 * for all `rsvp_groups` based on existing `rsvp_records`.
 *
 * Usage:
 *   npx tsx scripts/recalculate-group-counts.ts
 *
 * What it does:
 *   1. Creates an automated pre-flight full database backup (backups/db-backup-....json)
 *   2. Loads all invitation groups (collection_rsvp_groups)
 *   3. Loads all guest responses (collection_rsvp_records)
 *   4. Accurately calculates confirmed seats (including spouse seats) and declined counts
 *   5. Updates each group record in the database
 */

import fs from "node:fs";
import path from "node:path";
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

async function main() {
  console.log("🚀 Starting RSVP group counts recalculation and backfill...\n");

  // 1. Mandatory Automated Pre-flight Backup
  await backupDatabase("pre-recalculate-group-counts");

  console.log("\n🔍 Fetching RSVP groups and guest records from database...");

  // 2. Fetch Groups and RSVP Records
  const groupRows = await sql.unsafe(`SELECT id, data FROM "collection_rsvp_groups"`);
  const recordRows = await sql.unsafe(`SELECT id, data FROM "collection_rsvp_records"`);

  console.log(`📋 Found ${groupRows.length} group(s) and ${recordRows.length} guest response(s).\n`);

  // Map each group to its responses
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

  // Aggregate responses per group
  let unassignedRecords = 0;
  for (const recordRow of recordRows) {
    const data = parseData(recordRow.data);
    const groupId = typeof data.group === "object" && data.group !== null ? data.group.id : data.group;

    if (!groupId || !groupStatsMap.has(groupId)) {
      unassignedRecords++;
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

  if (unassignedRecords > 0) {
    console.warn(`⚠️  ${unassignedRecords} guest record(s) have no valid assigned group.`);
  }

  let updatedGroups = 0;
  let unchangedGroups = 0;

  for (const groupRow of groupRows) {
    const data = parseData(groupRow.data);
    const stats = groupStatsMap.get(groupRow.id)!;

    const prevConfirmed = Number(data.confirmedCount) || 0;
    const prevDeclined = Number(data.declinedCount) || 0;

    const changed = prevConfirmed !== stats.confirmedSeats || prevDeclined !== stats.declinedCount;

    data.confirmedCount = stats.confirmedSeats;
    data.declinedCount = stats.declinedCount;

    const maxCap = Number(data.maxCapacity) || 0;
    const remaining = Math.max(0, maxCap - stats.confirmedSeats);

    if (changed) {
      await sql`UPDATE "collection_rsvp_groups" SET data = ${sql.json(data)} WHERE id = ${groupRow.id}`;
      console.log(
        `  ✓ Group "${data.name}" (${groupRow.id}):\n` +
          `     Confirmed Seats: ${prevConfirmed} → ${stats.confirmedSeats} (${stats.confirmedLeads} leads + ${stats.spouseCount} spouses)\n` +
          `     Declined: ${prevDeclined} → ${stats.declinedCount}\n` +
          `     Max Capacity: ${maxCap} (${remaining} seats remaining)\n`,
      );
      updatedGroups++;
    } else {
      console.log(
        `  - Group "${data.name}" (${groupRow.id}): Already accurate (${stats.confirmedSeats} confirmed, ${stats.declinedCount} declined, ${remaining}/${maxCap} seats left).`,
      );
      unchangedGroups++;
    }
  }

  console.log("\n🎉 ── Group Recalculation Summary ─────────────────────");
  console.log(`  Groups updated   : ${updatedGroups}`);
  console.log(`  Groups unchanged : ${unchangedGroups}`);
  console.log(`  Total groups     : ${groupRows.length}`);
  console.log(`  Total responses  : ${recordRows.length}`);
  console.log("───────────────────────────────────────────────────────\n");

  await sql.end();
}

main().catch((err) => {
  console.error("❌ Group recalculation failed:", err);
  process.exit(1);
});
