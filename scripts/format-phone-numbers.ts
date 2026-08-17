/**
 * Migration script: normalize all existing rsvp_records.leadPhone values to E.164 format.
 *
 * Usage:
 *   pnpm tsx scripts/format-phone-numbers.ts
 *
 * What it does:
 *   1. Loads env from .env.local
 *   2. Connects to PostgreSQL (DATABASE_URL)
 *   3. Fetches all rsvp_records where leadPhone does not already start with "+"
 *   4. Normalizes each number using formatPhoneNumber (defaults to Nigeria +234)
 *   5. Updates the record in place
 */

import fs from "node:fs";
import path from "node:path";
// postgres is a transitive dep of @dyrected/db-postgres (postgres@3.4.9)
import postgres from "postgres";
import { formatPhoneNumber } from "../utils/phone.ts";
import { backupDatabase } from "./backup-db.ts";

// ─── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1 || line.trim().startsWith("#")) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL not set. Check your .env.local file.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: "prefer" });

async function main() {
  // Always create an automatic database backup before running mutations
  await backupDatabase("pre-format-phones");

  console.log("🔍  Connecting to database...");

  // Dyrected stores all record data in a JSONB 'data' column
  // Table: collection_rsvp_records, Phone: data->>'leadPhone'
  const tableName = "collection_rsvp_records";
  const phoneField = "leadPhone";

  // Get all records where the phone doesn't already start with "+"
  let rows: any[] = [];
  try {
    rows = await sql.unsafe(
      `SELECT id, data FROM "${tableName}"
       WHERE data->>'${phoneField}' IS NOT NULL
         AND data->>'${phoneField}' != ''
         AND data->>'${phoneField}' NOT LIKE '+%'`,
    );
  } catch (e2) {
    console.error("❌  Could not query table:", e2);
    await sql.end();
    process.exit(1);
  }

  console.log(`📋  Found ${rows.length} record(s) to migrate.`);

  if (rows.length === 0) {
    console.log("✅  Nothing to do — all phone numbers already normalized.");
    await sql.end();
    return;
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    let data = row.data;
    while (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        break;
      }
    }

    if (!data || typeof data !== "object") continue;

    const original = (data.leadPhone as string) || "";
    const normalized = formatPhoneNumber(original.replace(/["'\\]/g, "").trim());

    if (normalized === original) {
      skipped++;
      continue;
    }

    try {
      data.leadPhone = normalized;
      await sql`UPDATE "${tableName}" SET data = ${sql.json(data)} WHERE id = ${row.id}`;
      console.log(`  ✓  ${row.id}: "${original}" → "${normalized}"`);
      updated++;
    } catch (err) {
      console.error(`  ✗  ${row.id}: Failed to update "${original}":`, err);
      failed++;
    }
  }

  console.log("\n── Migration complete ─────────────────────────────────");
  console.log(`  Updated : ${updated}`);
  console.log(`  Skipped : ${skipped} (already correct)`);
  console.log(`  Failed  : ${failed}`);

  await sql.end();
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
