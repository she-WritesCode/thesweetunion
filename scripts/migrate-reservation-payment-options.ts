/**
 * Migration script: Backfill missing `paymentOption` on existing `reservations` records.
 *
 * Usage:
 *   npx tsx scripts/migrate-reservation-payment-options.ts
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
  console.log("🚀 Starting reservation paymentOption backfill migration...\n");

  // 1. Mandatory Automated Pre-flight Backup
  await backupDatabase("pre-migrate-reservation-payment-options");

  console.log("\n🔍 Fetching reservations from database...");

  // 2. Fetch Reservations
  const reservationRows = await sql.unsafe(`SELECT id, data FROM "collection_reservations"`);
  console.log(`📋 Found ${reservationRows.length} reservation(s) to inspect.`);

  let reservationsUpdated = 0;
  let reservationsSkipped = 0;

  for (const row of reservationRows) {
    const data = parseData(row.data);
    let needsUpdate = false;

    if (!data.paymentOption) {
      data.paymentOption = "bank_transfer";
      needsUpdate = true;
    }

    if (needsUpdate) {
      try {
        await sql`UPDATE "collection_reservations" SET data = ${sql.json(data)} WHERE id = ${row.id}`;
        console.log(
          `  ✓ Reservation ${row.id} (${data.guestName || "Guest"}): set paymentOption = "${data.paymentOption}"`,
        );
        reservationsUpdated++;
      } catch (err) {
        console.error(`  ✗ Failed to update reservation ${row.id}:`, err);
      }
    } else {
      reservationsSkipped++;
    }
  }

  console.log("\n🎉 ── Migration Summary ─────────────────────────────────");
  console.log(`  Reservations updated : ${reservationsUpdated}`);
  console.log(`  Reservations skipped : ${reservationsSkipped} (already had paymentOption)`);
  console.log("────────────────────────────────────────────────────────\n");

  await sql.end();
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
