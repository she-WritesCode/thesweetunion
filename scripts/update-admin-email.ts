/**
 * Script: Update admin email from `thekenekewoman@gmail.com` to `thekenkewoman@gmail.com`
 *
 * Usage:
 *   npx tsx scripts/update-admin-email.ts
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
  console.log("🚀 Starting Admin Email Update...\n");

  // 1. Mandatory Automated Pre-flight Backup
  await backupDatabase("pre-update-admin-email");

  console.log("\n🔍 Checking collection_admins table...");

  const oldEmail = "thekenekewoman@gmail.com";
  const newEmail = "thekenkewoman@gmail.com";

  // Check columns of collection_admins
  const adminRows = await sql.unsafe(`SELECT * FROM "collection_admins"`);
  console.log(`📋 Found ${adminRows.length} admin record(s).`);

  let updatedCount = 0;

  for (const row of adminRows) {
    let rowChanged = false;
    const data = parseData(row.data);

    console.log(`  Inspecting Admin ID ${row.id}:`, {
      emailField: row.email,
      dataEmail: data?.email,
      name: data?.name || row.name,
    });

    if (row.email && row.email.toLowerCase() === oldEmail.toLowerCase()) {
      row.email = newEmail;
      rowChanged = true;
    }

    if (data && data.email && data.email.toLowerCase() === oldEmail.toLowerCase()) {
      data.email = newEmail;
      rowChanged = true;
    }

    if (rowChanged) {
      if ("data" in row) {
        if ("email" in row) {
          await sql`UPDATE "collection_admins" SET email = ${newEmail}, data = ${sql.json(data)} WHERE id = ${row.id}`;
        } else {
          await sql`UPDATE "collection_admins" SET data = ${sql.json(data)} WHERE id = ${row.id}`;
        }
      } else if ("email" in row) {
        await sql`UPDATE "collection_admins" SET email = ${newEmail} WHERE id = ${row.id}`;
      }
      console.log(`  ✓ Updated Admin ${row.id} email to: ${newEmail}`);
      updatedCount++;
    }
  }

  // Also check other tables for any references just in case (e.g. globals, site settings)
  console.log("\n🔍 Checking for any other references across public tables...");
  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  for (const { tablename } of tables) {
    if (tablename === "collection_admins") continue;
    try {
      const rows = await sql.unsafe(`SELECT id, data FROM "${tablename}"`);
      for (const r of rows) {
        const rawStr = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
        if (rawStr && rawStr.includes(oldEmail)) {
          const replacedStr = rawStr.replaceAll(oldEmail, newEmail);
          const replacedJson = JSON.parse(replacedStr);
          await sql`UPDATE "${sql(tablename)}" SET data = ${sql.json(replacedJson)} WHERE id = ${r.id}`;
          console.log(`  ✓ Replaced email in table "${tablename}" row ID: ${r.id}`);
        }
      }
    } catch {
      // Ignore tables without id/data
    }
  }

  console.log("\n🎉 ── Update Summary ──────────────────────────────────");
  console.log(`  Admin records updated: ${updatedCount}`);
  console.log(`  New Email            : ${newEmail}`);
  console.log("────────────────────────────────────────────────────────\n");

  await sql.end();
}

main().catch((err) => {
  console.error("❌ Update failed:", err);
  process.exit(1);
});
