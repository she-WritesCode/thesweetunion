/**
 * Migration script: Backfill missing invitationSent = false
 * on existing rsvp_records in PostgreSQL.
 *
 * Usage:
 *   npx tsx scripts/backfill-invitation-sent-defaults.ts
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

async function main() {
  console.log("🚀 Starting invitationSent backfill migration...\n");

  // 1. Mandatory Automated Pre-flight Backup
  await backupDatabase("pre-backfill-invitation-sent");

  console.log("\n🔍 Inspecting rsvp_records in database...");

  const rows = await sql.unsafe(`SELECT id, data FROM "collection_rsvp_records"`);
  console.log(`Found ${rows.length} total RSVP records.`);

  let updatedCount = 0;
  let alreadyTrueCount = 0;
  let alreadyFalseCount = 0;

  for (const row of rows) {
    const data = parseData(row.data);
    let needsUpdate = false;

    if (data.invitationSent === true || data.invitationSent === "true") {
      alreadyTrueCount++;
      if (data.invitationSent !== true) {
        data.invitationSent = true;
        needsUpdate = true;
      }
    } else if (data.invitationSent === false) {
      alreadyFalseCount++;
    } else {
      // Missing / null / undefined / "false" string -> set explicit boolean false
      data.invitationSent = false;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await sql`UPDATE "collection_rsvp_records" SET data = ${sql.json(data)}, updated_at = CURRENT_TIMESTAMP WHERE id = ${row.id}`;
      updatedCount++;
    }
  }

  console.log(`\n✅ Successfully backfilled ${updatedCount} RSVP records to invitationSent: false!`);
  console.log(`📊 Current breakdown:`);
  console.log(`   - Sent (Yes): ${alreadyTrueCount}`);
  console.log(`   - Pending (No): ${alreadyFalseCount + updatedCount}`);
  console.log(`   - Unassigned: 0`);
  console.log(`✨ All ${rows.length} records now have explicit boolean values.`);

  await sql.end();
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
