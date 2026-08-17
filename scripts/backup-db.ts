import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

/**
 * Loads .env.local into process.env if available
 */
export function loadEnv() {
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
}

/**
 * Creates a full database backup in JSON format.
 * Returns the path to the created backup file.
 */
export async function backupDatabase(tag: string = "manual"): Promise<string> {
  loadEnv();

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL not set. Check .env.local.");
  }

  const sql = postgres(DATABASE_URL, { ssl: "prefer" });

  try {
    const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
    const backupData: Record<string, any[]> = {};
    let totalRows = 0;

    for (const { tablename } of tables) {
      const rows = await sql.unsafe(`SELECT * FROM "${tablename}"`);
      backupData[tablename] = rows;
      totalRows += rows.length;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupsDir = path.resolve(process.cwd(), "backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const filename = `db-backup-${timestamp}-${tag}.json`;
    const filePath = path.join(backupsDir, filename);
    const latestPath = path.join(backupsDir, "latest.json");

    const payload = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        tag,
        databaseUrl: DATABASE_URL.replace(/:[^:@]+@/, ":***@"),
        totalTables: tables.length,
        totalRows,
        tables: Object.keys(backupData).map((name) => ({ name, count: backupData[name].length })),
        data: backupData,
      },
      null,
      2,
    );

    fs.writeFileSync(filePath, payload, "utf-8");
    fs.writeFileSync(latestPath, payload, "utf-8");

    console.log(`📦 Backup created successfully:`);
    console.log(`   File: ${filePath}`);
    console.log(`   Tables: ${tables.length} (${totalRows} total rows)`);

    return filePath;
  } finally {
    await sql.end();
  }
}

// If executed directly from CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const tag = process.argv[2] || "manual";
  backupDatabase(tag).catch((err) => {
    console.error("❌ Backup failed:", err);
    process.exit(1);
  });
}
