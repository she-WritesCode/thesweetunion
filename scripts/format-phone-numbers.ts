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

// ─── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\\s*$/);
    if (match) {
      const key = match[1];
      let val = match[2] || "";
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
  // Inline parse (fallback without regex capturing trailing \s*)
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
  console.log("🔍  Connecting to database...");

  // Dyrected stores all record data in a JSONB 'data' column
  // Table: collection_rsvp_records, Phone: data->>'leadPhone'
  const tableName = "collection_rsvp_records";
  const phoneField = "leadPhone";

  // Get all records where the phone doesn't already start with "+"
  let rows: any[] = [];
  try {
    rows = await sql.unsafe(
      `SELECT id, data->>'${phoneField}' as "leadPhone" FROM "${tableName}"
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
    const original = row.leadPhone as string;
    const normalized = formatPhoneNumber(original);

    if (normalized === original) {
      skipped++;
      continue;
    }

    try {
      // Update the JSONB data field using jsonb_set
      await sql.unsafe(
        `UPDATE "${tableName}" SET data = jsonb_set(data, '{${phoneField}}', $1::jsonb) WHERE id = $2`,
        [JSON.stringify(normalized), row.id],
      );
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
