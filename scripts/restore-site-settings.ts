import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { backupDatabase, loadEnv } from "./backup-db";

async function main() {
  loadEnv();

  // 1. Mandatory pre-flight backup
  console.log("Creating pre-flight backup...");
  const backupFile = await backupDatabase("pre-restore-site-settings");
  console.log(`Pre-flight backup created at: ${backupFile}`);

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL not set. Check .env.local.");
  }

  // 2. Load the baseline site settings from the Nov 6 backup
  const baselineBackupPath = path.resolve(
    process.cwd(),
    "backups/db-backup-2026-11-06T19-58-08-977Z-pre-backfill-pass-codes.json"
  );
  if (!fs.existsSync(baselineBackupPath)) {
    throw new Error(`Baseline backup not found at ${baselineBackupPath}`);
  }

  const baselineJson = JSON.parse(fs.readFileSync(baselineBackupPath, "utf-8"));
  const baselineInternals = baselineJson.data?.dyrected_internal || [];
  const baselineRecord = baselineInternals.find((i: any) => i.key === "global_site_settings");
  if (!baselineRecord || !baselineRecord.value) {
    throw new Error("global_site_settings not found in baseline backup!");
  }

  const baselineValue = baselineRecord.value;
  console.log("Loaded baseline settings with keys:", Object.keys(baselineValue));

  const sql = postgres(DATABASE_URL, { ssl: "prefer" });

  try {
    // 3. Get current value from database
    const rows = await sql`SELECT * FROM dyrected_internal WHERE key = 'global_site_settings'`;
    let currentValue: any = {};
    if (rows.length > 0 && rows[0].value) {
      currentValue = rows[0].value;
      if (typeof currentValue === "string") {
        try {
          currentValue = JSON.parse(currentValue);
        } catch {
          currentValue = {};
        }
      }
    }

    console.log("Current database keys:", Object.keys(currentValue));

    // 4. Merge: baseline fields + keep any current passCampaignConfig or other current fields
    const mergedValue: Record<string, any> = {
      ...baselineValue,
      weddingDateText: "Saturday, November 21, 2026",
      ...currentValue,
    };

    // Ensure all baseline fields are present even if currentValue had empty keys
    for (const [k, v] of Object.entries(baselineValue)) {
      if (mergedValue[k] === undefined || mergedValue[k] === null) {
        mergedValue[k] = v;
      }
    }

    console.log("Merged keys count:", Object.keys(mergedValue).length);
    console.log("Merged keys:", Object.keys(mergedValue));

    // 5. Update the database
    await sql`
      INSERT INTO dyrected_internal (key, value)
      VALUES ('global_site_settings', ${mergedValue})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;

    console.log("Successfully restored global_site_settings in database.");

    // 6. Verify restored record
    const verifyRows = await sql`SELECT * FROM dyrected_internal WHERE key = 'global_site_settings'`;
    const finalValue = verifyRows[0]?.value;
    console.log("Verification - final stored keys:", Object.keys(finalValue || {}));
    console.log("Couple:", finalValue.partnerOneName, "&", finalValue.partnerTwoName);
    console.log("Story photos count:", finalValue.storyPhotos?.length);
    console.log("FAQs count:", finalValue.faqs?.length);
    console.log("Has passCampaignConfig:", Boolean(finalValue.passCampaignConfig));
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Restoration failed:", err);
  process.exit(1);
});
