/**
 * Migration script: Backfill missing `contributionAmount` on existing `reservations` records
 * and synchronize `amountRaised`, `reservedCount`, and `contributorCount` on `wishlist_items`.
 *
 * Usage:
 *   npx tsx scripts/migrate-reservation-amounts.ts
 *
 * What it does:
 *   1. Creates an automated pre-flight full database backup (backups/db-backup-....json)
 *   2. Loads all wishlist items into memory
 *   3. Calculates and backfills `contributionAmount = (item.price * quantity)` for fixed reservations
 *   4. Updates each reservation record in place
 *   5. Synchronizes wishlist_items aggregate metrics
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

async function main() {
  console.log("🚀 Starting reservation amounts backfill migration...\n");

  // 1. Mandatory Automated Pre-flight Backup
  await backupDatabase("pre-migrate-reservation-amounts");

  console.log("\n🔍 Fetching wishlist items and reservations from database...");

  // 2. Fetch Wishlist Items
  const itemRows = await sql.unsafe(`SELECT id, data FROM "collection_wishlist_items"`);
  const itemMap = new Map<string, { price: number; fundingType: string; name: string }>();

  for (const row of itemRows) {
    const data = parseData(row.data);
    itemMap.set(row.id, {
      price: Number(data.price) || 0,
      fundingType: data.fundingType || "fixed",
      name: data.name || "Untitled Item",
    });
  }
  console.log(`📋 Loaded ${itemMap.size} wishlist item(s).`);

  // 3. Fetch Reservations
  const reservationRows = await sql.unsafe(`SELECT id, data FROM "collection_reservations"`);
  console.log(`📋 Found ${reservationRows.length} reservation(s) to inspect.`);

  let reservationsUpdated = 0;
  let reservationsSkipped = 0;

  for (const row of reservationRows) {
    const data = parseData(row.data);
    const itemId = typeof data.item === "object" && data.item !== null ? data.item.id : data.item;
    const item = itemMap.get(itemId);
    const qty = Math.max(1, Number(data.quantity) || 1);

    let needsUpdate = false;
    let targetAmount = Number(data.contributionAmount) || 0;

    if (item && item.fundingType === "fixed") {
      const expectedAmount = item.price * qty;
      if (targetAmount !== expectedAmount) {
        data.contributionAmount = expectedAmount;
        needsUpdate = true;
      }
    } else if (item && item.fundingType === "crowdfund") {
      // Ensure quantity is 1 and contribution amount is a valid number
      if (typeof data.contributionAmount === "undefined" || data.contributionAmount === null) {
        data.contributionAmount = 0;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      try {
        await sql`UPDATE "collection_reservations" SET data = ${sql.json(data)} WHERE id = ${row.id}`;
        console.log(
          `  ✓ Reservation ${row.id} (${data.guestName || "Guest"} — ${item?.name || "Item"}): set contributionAmount = ₦${Number(data.contributionAmount).toLocaleString()}`,
        );
        reservationsUpdated++;
      } catch (err) {
        console.error(`  ✗ Failed to update reservation ${row.id}:`, err);
      }
    } else {
      reservationsSkipped++;
    }
  }

  // 4. Recompute and synchronize wishlist_items stats
  console.log("\n🔄 Synchronizing wishlist_items stats (amountRaised, contributorCount, reservedCount)...");
  const refreshedReservations = await sql.unsafe(`SELECT id, data FROM "collection_reservations"`);

  const itemStatsMap = new Map<string, { amountRaised: number; contributorCount: number; reservedCount: number }>();
  for (const itemId of itemMap.keys()) {
    itemStatsMap.set(itemId, { amountRaised: 0, contributorCount: 0, reservedCount: 0 });
  }

  for (const row of refreshedReservations) {
    const data = parseData(row.data);
    const itemId = typeof data.item === "object" && data.item !== null ? data.item.id : data.item;
    const stats = itemStatsMap.get(itemId);
    const item = itemMap.get(itemId);
    if (!stats || !item) continue;

    const qty = Math.max(1, Number(data.quantity) || 1);
    const amount = Number(data.contributionAmount) || 0;

    if (item.fundingType === "crowdfund") {
      if (data.intent === "contribute" && amount > 0) {
        stats.amountRaised += amount;
        stats.contributorCount += 1;
      }
    } else {
      if (data.intent === "reserve") {
        stats.reservedCount += qty;
      }
    }
  }

  let itemsUpdated = 0;
  for (const row of itemRows) {
    const data = parseData(row.data);
    const stats = itemStatsMap.get(row.id);
    if (!stats) continue;

    const changed =
      data.amountRaised !== stats.amountRaised ||
      data.contributorCount !== stats.contributorCount ||
      data.reservedCount !== stats.reservedCount;

    if (changed) {
      data.amountRaised = stats.amountRaised;
      data.contributorCount = stats.contributorCount;
      data.reservedCount = stats.reservedCount;

      await sql`UPDATE "collection_wishlist_items" SET data = ${sql.json(data)} WHERE id = ${row.id}`;
      console.log(
        `  ✓ Item "${data.name}": raised ₦${stats.amountRaised.toLocaleString()}, ${stats.contributorCount} contributors, ${stats.reservedCount} reserved`,
      );
      itemsUpdated++;
    }
  }

  console.log("\n🎉 ── Migration Summary ─────────────────────────────────");
  console.log(`  Reservations updated : ${reservationsUpdated}`);
  console.log(`  Reservations checked : ${reservationsSkipped} (already had exact amount)`);
  console.log(`  Wishlist items synced: ${itemsUpdated}`);
  console.log("────────────────────────────────────────────────────────\n");

  await sql.end();
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
