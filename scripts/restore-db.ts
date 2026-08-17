import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { loadEnv } from "./backup-db.ts";

/**
 * Restores the database from a backup JSON file.
 * Usage:
 *   npx tsx scripts/restore-db.ts [path-to-backup.json]
 */
export async function restoreDatabase(backupFilePath?: string) {
  loadEnv();

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL not set. Check .env.local.");
  }

  const targetFile = backupFilePath || path.resolve(process.cwd(), "backups/latest.json");
  if (!fs.existsSync(targetFile)) {
    throw new Error(`Backup file not found: ${targetFile}`);
  }

  console.log(`🔄 Reading backup file: ${targetFile}`);
  const backupJson = JSON.parse(fs.readFileSync(targetFile, "utf-8"));
  const { data: tableData, timestamp, tag } = backupJson;

  if (!tableData || typeof tableData !== "object") {
    throw new Error("Invalid backup file structure.");
  }

  console.log(`   Backup from: ${timestamp} (tag: ${tag || "none"})`);
  const sql = postgres(DATABASE_URL, { ssl: "prefer" });

  try {
    let restoredTables = 0;
    let restoredRows = 0;

    await sql.begin(async (trx: any) => {
      for (const [tableName, rows] of Object.entries(tableData)) {
        if (!Array.isArray(rows)) continue;

        console.log(`   Restoring ${tableName} (${rows.length} rows)...`);
        await trx.unsafe(`TRUNCATE TABLE "${tableName}" CASCADE`);

        for (const row of rows) {
          const keys = Object.keys(row);
          if (keys.length === 0) continue;

          const columns = keys.map((k) => `"${k}"`).join(", ");
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
          const values = keys.map((k) => {
            const val = row[k];
            // Format object values as JSON strings for JSON/JSONB columns
            if (val !== null && typeof val === "object") {
              return JSON.stringify(val);
            }
            return val;
          });

          await trx.unsafe(
            `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`,
            values,
          );
        }

        restoredTables++;
        restoredRows += rows.length;
      }
    });

    console.log(`\n✅ Database restored successfully!`);
    console.log(`   Restored: ${restoredTables} tables (${restoredRows} rows).`);
  } finally {
    await sql.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];
  restoreDatabase(filePath).catch((err) => {
    console.error("❌ Restore failed:", err);
    process.exit(1);
  });
}
