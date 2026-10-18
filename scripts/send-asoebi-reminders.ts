import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { backupDatabase, loadEnv } from "./backup-db.ts";

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const WAHA_URL = process.env.WAHA_URL;
const WAHA_API_KEY = process.env.WAHA_API_KEY;

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

function normalizeWhatsAppNumber(raw: string): string {
  const value = (raw || "").trim();
  if (value.startsWith("+")) return value.replace(/\D/g, "");
  return `234${value.replace(/^0/, "").replace(/\D/g, "")}`;
}

async function sendWhatsAppMessage({ to, text, session }: { to: string; text: string; session?: string }) {
  if (!WAHA_URL) {
    throw new Error("WAHA_URL is not configured.");
  }
  const baseUrl = WAHA_URL.replace(/\/+$/, "");
  const targetSession = session || process.env.WAHA_SESSION || "AdunsPhone";

  const res = await fetch(`${baseUrl}/api/sendText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}),
    },
    body: JSON.stringify({
      session: targetSession,
      chatId: `${normalizeWhatsAppNumber(to)}@c.us`,
      text,
    }),
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`WAHA send failed (${res.status}): ${json?.message || JSON.stringify(json)}`);
  }
  return json;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function countdownSleep(minutes: number) {
  const totalSeconds = Math.round(minutes * 60);
  console.log(`⏳ Waiting ${minutes} minute(s) before sending the next reminder...`);
  for (let s = totalSeconds; s > 0; s -= 10) {
    const minsLeft = Math.floor(s / 60);
    const secsLeft = s % 60;
    process.stdout.write(`   Next send in ${minsLeft}m ${secsLeft.toString().padStart(2, "0")}s...\r`);
    await sleep(Math.min(10, s) * 1000);
  }
  process.stdout.write("                                                   \r");
}

function buildMessage(record: any, settings: any): { text: string; summary: string; total: number } {
  const bankName = settings?.bankName || "OPay Digital Services Limited";
  const accountNumber = settings?.accountNumber || "8105733592";
  const accountName = settings?.accountName || "ADUNOLUWA ANUOLUWAPO OBADOFIN";
  const repName = settings?.representativeName || "Ololade";
  const ppy = Number(settings?.pricePerYard) || 10000;
  const malePrice = Number(settings?.asoOkeMalePrice) || 6000;
  const femalePrice = Number(settings?.asoOkeFemalePrice) || 6000;

  const wantsAsoebi = record.wantsAsoebi === true || record.wantsAsoebi === "true" || record.wantsAsoebi === 1;
  const asoebiYards = record.asoebiYards ? parseInt(String(record.asoebiYards), 10) : 0;
  const wantsAsoOke = record.wantsAsoOke === true || record.wantsAsoOke === "true" || record.wantsAsoOke === 1;
  const maleQty = Number(record.asoOkeMaleQty) || 0;
  const femaleQty = Number(record.asoOkeFemaleQty) || 0;

  let total = 0;
  const items: string[] = [];

  if (wantsAsoebi && asoebiYards > 0) {
    total += asoebiYards * ppy;
    items.push(`${asoebiYards} yards of Asoebi fabric (Customised Adire)`);
  }
  if (wantsAsoOke && maleQty > 0) {
    total += maleQty * malePrice;
    items.push(`${maleQty} Male Aso Oke (Fila / Cap)`);
  }
  if (wantsAsoOke && femaleQty > 0) {
    total += femaleQty * femalePrice;
    items.push(`${femaleQty} Female Aso Oke (Gele)`);
  }

  const itemsStr = items.length > 0 ? items.join(" + ") : "Aso Ebi";
  const guestName = (record.leadName || "").trim() || "there";
  const totalStr = `₦${total.toLocaleString()}`;

  const defaultTemplate =
    settings?.whatsAppTemplate ||
    `Hi [guest name] , my name is [rep name] a representative of the couple. \n\nThank you for choosing to celebrate #thesweetunion and identifying with the fabric of the day. \nKindly confirm your Asoebi request of; [items] order for #TheSweetUnion. Please pay the total of [total] to [bank] - [account number] ([account name]) and send proof of payment here. Thank you!`;

  const text = defaultTemplate
    .replace(/\[guest name\]/gi, guestName)
    .replace(/\[guest_name\]/gi, guestName)
    .replace(/\{guestName\}/gi, guestName)
    .replace(/\[rep name\]/gi, repName)
    .replace(/\[rep_name\]/gi, repName)
    .replace(/\[representative name\]/gi, repName)
    .replace(/\[representative_name\]/gi, repName)
    .replace(/\{repName\}/gi, repName)
    .replace(/\{representativeName\}/gi, repName)
    .replace(/\[items\]/gi, itemsStr)
    .replace(/\[items_summary\]/gi, itemsStr)
    .replace(/\{items\}/gi, itemsStr)
    .replace(/\[total\]/gi, totalStr)
    .replace(/\[total_amount\]/gi, totalStr)
    .replace(/\{total\}/gi, totalStr)
    .replace(/\[bank\]/gi, bankName)
    .replace(/\[bank_name\]/gi, bankName)
    .replace(/\[bank name\]/gi, bankName)
    .replace(/\{bank\}/gi, bankName)
    .replace(/\[account number\]/gi, accountNumber)
    .replace(/\[account_number\]/gi, accountNumber)
    .replace(/\[accountno\]/gi, accountNumber)
    .replace(/\[account_no\]/gi, accountNumber)
    .replace(/\{accountNumber\}/gi, accountNumber)
    .replace(/\{account_number\}/gi, accountNumber)
    .replace(/\[account name\]/gi, accountName)
    .replace(/\[account_name\]/gi, accountName)
    .replace(/\{accountName\}/gi, accountName)
    .replace(/\{account_name\}/gi, accountName);

  return { text, summary: itemsStr, total };
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const onlyNeverSent = args.includes("--only-never-sent");
  const onlyNotThisMonth = args.includes("--not-this-month") || args.includes("--only-not-this-month");
  const intervalArg = args.find((a) => a.startsWith("--interval="));
  const intervalMinutes = intervalArg ? parseFloat(intervalArg.split("=")[1]) : 5;
  const sessionArg = args.find((a) => a.startsWith("--session="));
  const cliSession = sessionArg ? sessionArg.split("=")[1] : undefined;

  let scopeLabel = "All unpaid Asoebi orders";
  if (onlyNeverSent) {
    scopeLabel = "Only guests never sent a reminder";
  } else if (onlyNotThisMonth) {
    scopeLabel = "Guests not reminded this month (October 2026)";
  }

  console.log("==================================================");
  console.log("👗 ASOEBI WHATSAPP REMINDER DISPATCHER");
  console.log(`⏰ Interval: ${intervalMinutes} minute(s) between sends`);
  console.log(`🔍 Mode: ${isDryRun ? "DRY RUN (No WhatsApp messages will be sent)" : "LIVE SEND"}`);
  console.log(`🎯 Scope: ${scopeLabel}`);
  console.log("==================================================\n");

  // Step 1: Pre-flight database backup if LIVE
  if (!isDryRun) {
    console.log("📦 Creating pre-flight database backup...");
    const backupPath = await backupDatabase("pre-asoebi-reminders");
    console.log(`✅ Backup saved: ${backupPath}\n`);
  }

  // Step 2: Fetch global asoebi settings
  const internalRows = await sql`SELECT value FROM "dyrected_internal" WHERE key = 'global_asoebi_settings'`;
  const asoebiSettings = internalRows.length > 0 ? parseData(internalRows[0].value) : {};
  const targetSession = cliSession || asoebiSettings.wahaSession || "AdunsPhone";

  console.log(`📱 WhatsApp Session: "${targetSession}"`);
  console.log("📝 Active Message Template:");
  console.log("--------------------------------------------------");
  console.log(asoebiSettings.whatsAppTemplate || "(Using default fallback template)");
  console.log("--------------------------------------------------\n");

  // Step 3: Fetch RSVP records
  const rows = await sql`SELECT id, data FROM "collection_rsvp_records"`;
  const eligible: { id: string; rawData: any; parsed: any }[] = [];

  for (const row of rows) {
    const data = parseData(row.data);
    const hasOrder =
      Boolean(data.wantsAsoebi) ||
      Boolean(data.asoebiYards) ||
      Boolean(data.wantsAsoOke) ||
      (Number(data.asoOkeMaleQty) || 0) > 0 ||
      (Number(data.asoOkeFemaleQty) || 0) > 0;

    if (!hasOrder) continue;

    // Check payment status
    const isPaid = data.asoebiPaymentStatus === "received" || data.asoebiPaymentStatus === "waived";
    if (isPaid) continue;

    // Check phone number
    if (!data.leadPhone || !data.leadPhone.trim()) {
      console.warn(`⚠️ Skipping ${data.leadName || row.id}: No phone number.`);
      continue;
    }

    const sentAt = data.asoebiSentAt;
    const isSent = data.asoebiSent === true || data.asoebiSent === "true" || data.asoebiSent === 1;
    const currentYearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const sentThisMonth = Boolean(isSent && sentAt && String(sentAt).startsWith(currentYearMonth));

    if (onlyNeverSent && isSent) {
      continue;
    }

    if (onlyNotThisMonth && sentThisMonth) {
      continue;
    }

    eligible.push({ id: row.id, rawData: row.data, parsed: data });
  }

  console.log(`📋 Found ${eligible.length} unpaid guest(s) requiring a reminder.\n`);

  if (eligible.length === 0) {
    console.log("🎉 Everyone has paid or all reminders have been delivered!");
    await sql.end();
    return;
  }

  // Preview or Send loop
  let sentCount = 0;
  let failCount = 0;

  for (let i = 0; i < eligible.length; i++) {
    const item = eligible[i];
    const { text, summary, total } = buildMessage(item.parsed, asoebiSettings);
    const phone = item.parsed.leadPhone;
    const guestName = item.parsed.leadName || "Guest";

    console.log(`[${i + 1}/${eligible.length}] ${guestName} (${phone})`);
    console.log(`    Order: ${summary} | Total: ₦${total.toLocaleString()}`);
    console.log(`    Payment Status: ${item.parsed.asoebiPaymentStatus || "pending"}`);
    if (item.parsed.asoebiSentAt) {
      console.log(`    Previous Reminder Sent At: ${item.parsed.asoebiSentAt}`);
    }

    if (isDryRun) {
      console.log("    --- PREVIEW MESSAGE ---");
      console.log(text.replace(/^/gm, "    | "));
      console.log("    -----------------------\n");
      sentCount++;
      continue;
    }

    // LIVE SEND:
    try {
      console.log(`    📤 Sending WhatsApp message via WAHA (session: "${targetSession}")...`);
      await sendWhatsAppMessage({ to: phone, text, session: targetSession });
      console.log("    ✅ Sent successfully!");

      // Update database record
      const nowIso = new Date().toISOString();
      const currentData = parseData(item.rawData);
      currentData.asoebiSent = true;
      currentData.asoebiSentAt = nowIso;

      await sql`UPDATE "collection_rsvp_records" SET data = ${JSON.stringify(currentData)} WHERE id = ${item.id}`;
      console.log(`    💾 Record updated: asoebiSent = true (${nowIso})\n`);
      sentCount++;

      // Wait interval before next guest (unless this was the last guest)
      if (i < eligible.length - 1) {
        await countdownSleep(intervalMinutes);
      }
    } catch (err: any) {
      console.error(`    ❌ Failed to send to ${guestName}:`, err.message);
      failCount++;
    }
  }

  console.log("==================================================");
  console.log(`🏁 FINISHED! Total processed: ${sentCount}, Failed: ${failCount}`);
  console.log("==================================================");

  await sql.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
