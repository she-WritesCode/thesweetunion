/**
 * Migration script: Backfill unique 6-character passCode on existing rsvp_records.
 *
 * Usage:
 *   npx tsx scripts/backfill-pass-codes.ts
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

const CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

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
  console.log("🚀 Starting passCode backfill migration...\n");

  // 1. Mandatory Automated Pre-flight Backup
  await backupDatabase("pre-backfill-pass-codes");

  console.log("\n🔍 Inspecting rsvp_records in database...");

  const rows = await sql.unsafe(`SELECT id, data FROM "collection_rsvp_records"`);
  console.log(`Found ${rows.length} total RSVP records.`);

  const usedCodes = new Set<string>();

  // Collect existing codes first
  for (const row of rows) {
    const data = parseData(row.data);
    if (data.passCode && typeof data.passCode === "string") {
      usedCodes.add(data.passCode.toUpperCase().trim());
    }
  }

  let updatedCount = 0;
  let alreadyHasCodeCount = 0;

  for (const row of rows) {
    const data = parseData(row.data);
    if (data.passCode && typeof data.passCode === "string" && data.passCode.trim().length === 6) {
      alreadyHasCodeCount++;
      continue;
    }

    // Generate unique 6-character code
    let newCode = generateCode();
    while (usedCodes.has(newCode)) {
      newCode = generateCode();
    }
    usedCodes.add(newCode);

    data.passCode = newCode;

    await sql`UPDATE "collection_rsvp_records" SET data = ${sql.json(data)}, updated_at = CURRENT_TIMESTAMP WHERE id = ${row.id}`;
    updatedCount++;
  }

  console.log(`\n✅ Migration Complete:`);
  console.log(`   - Already had valid 6-char passCode: ${alreadyHasCodeCount}`);
  console.log(`   - Newly assigned unique passCode: ${updatedCount}`);
  console.log(`   - Total active codes: ${usedCodes.size}`);

  await sql.end();
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
