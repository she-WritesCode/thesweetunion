import { createClient } from "@dyrected/sdk";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let val = match[2] || "";
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

async function run() {
  const client = createClient({
    baseUrl: process.env.NUXT_PUBLIC_DYRECTED_URL || "http://localhost:3000/api/dyrected",
    apiKey: process.env.DYRECTED_API_KEY || "sk_test_dev_key",
  });

  console.log("Fetching wishlist items...");
  const items = await client.collection("wishlist_items").find({ limit: 100 });
  console.log(`Found ${items.docs.length} items:`);
  for (const item of items.docs) {
    console.log(`- [${item.id}] "${item.name}" (${item.fundingType}): reservedCount=${item.reservedCount}, maxQuantity=${item.maxQuantity}, price=${item.price}`);
  }

  console.log("\nFetching reservations...");
  const reservations = await client.collection("reservations").find({ limit: 100, depth: 1 });
  console.log(`Found ${reservations.docs.length} reservations:`);
  for (const res of reservations.docs) {
    console.log(`- Reservation: ID=${res.id}, Item=${res.item?.id || res.item}, Guest=${res.guestName}, Email=${res.guestEmail}, Amount=${res.contributionAmount}`);
  }
}

run().catch(console.error);
