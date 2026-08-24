import postgres from "postgres";
import { loadEnv } from "./backup-db.ts";

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
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

async function run() {
  const itemRows = await sql.unsafe(`SELECT id, data FROM "collection_wishlist_items"`);
  const itemMap = new Map<string, any>();
  for (const row of itemRows) {
    const data = parseData(row.data);
    itemMap.set(row.id, { id: row.id, ...data });
  }

  const reservationRows = await sql.unsafe(`SELECT id, data FROM "collection_reservations"`);
  console.log(`\n=== RESERVATIONS (${reservationRows.length} total) ===`);
  const parsedReservations = [];
  for (const row of reservationRows) {
    const data = parseData(row.data);
    const itemId = typeof data.item === "object" && data.item !== null ? data.item.id : data.item;
    const item = itemMap.get(itemId);
    const res = {
      id: row.id,
      guestName: data.guestName,
      itemId,
      itemName: item?.name || "UNKNOWN ITEM",
      itemPrice: item?.price,
      itemFundingType: item?.fundingType,
      intent: data.intent,
      paymentTiming: data.paymentTiming,
      paymentOption: data.paymentOption,
      contributionAmount: data.contributionAmount,
      quantity: data.quantity,
      reminderAt: data.reminderAt,
      reminderChannel: data.reminderChannel,
    };
    parsedReservations.push(res);
    console.log(JSON.stringify(res));
  }

  console.log(`\n=== WISHLIST ITEMS SUMMARY ===`);
  let totalTarget = 0;
  let totalRaised = 0;
  let totalReservedCount = 0;
  for (const [id, item] of itemMap) {
    totalTarget += Number(item.price) || 0;
    totalRaised += Number(item.amountRaised) || 0;
    totalReservedCount += Number(item.reservedCount) || 0;
    if (item.amountRaised > 0 || item.reservedCount > 0) {
      console.log(
        JSON.stringify({
          id,
          name: item.name,
          price: item.price,
          fundingType: item.fundingType,
          quantity: item.quantity,
          reservedCount: item.reservedCount,
          amountRaised: item.amountRaised,
        }),
      );
    }
  }
  console.log(`\nTotal items: ${itemMap.size}`);
  console.log(`Total target sum(price): ₦${totalTarget.toLocaleString()}`);
  console.log(`Total raised sum(amountRaised): ₦${totalRaised.toLocaleString()}`);
  console.log(`Total reserved count: ${totalReservedCount}`);

  // Now calculate groupings exactly as WishlistListSummary does vs what they should be
  console.log("\n=== GROUPINGS CALCULATION ===");
  let paidNowSum = 0;
  let weddingDaySum = 0;
  let remindLaterSum = 0;

  for (const r of parsedReservations) {
    const amt = Number(r.contributionAmount) || 0;
    console.log(
      `Res [${r.guestName}]: intent=${r.intent}, timing=${r.paymentTiming}, option=${r.paymentOption}, amount=₦${amt.toLocaleString()}, item=${r.itemName} (₦${r.itemPrice})`,
    );
    if (r.paymentTiming === "now") {
      paidNowSum += amt;
    } else if (r.paymentOption === "bring_to_wedding") {
      weddingDaySum += amt;
    } else {
      remindLaterSum += amt;
    }
  }

  console.log({
    paidNowSum,
    weddingDaySum,
    remindLaterSum,
    sumOfSums: paidNowSum + weddingDaySum + remindLaterSum,
  });

  await sql.end();
}

run().catch(console.error);
