import { defineConfig } from "@dyrected/core";
import { SqliteAdapter } from "@dyrected/db-sqlite";
import { PostgresAdapter } from "@dyrected/db-postgres";
import { CloudinaryStorageAdapter } from "@dyrected/storage-cloudinary";
import { sendEmail } from "./dyrected/mailer.ts";
import fs from "node:fs";
import path from "node:path";

// Dynamically load .env.local into process.env for hot-reloading support in dev mode
try {
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
} catch (e) {
  // Silent fail
}

// Collections
import { admins } from "./dyrected/collections/admins.ts";
import { media } from "./dyrected/collections/media.ts";
import { wishlistItems } from "./dyrected/collections/wishlist-items.ts";
import { reservations } from "./dyrected/collections/reservations.ts";
import { rsvpGroups } from "./dyrected/collections/rsvp-groups.ts";
import { rsvpRecords } from "./dyrected/collections/rsvp-records.ts";
import { events } from "./dyrected/collections/events.ts";
import { checkIns } from "./dyrected/collections/check-ins.ts";

// Globals
import { siteSettings } from "./dyrected/globals/site-settings.ts";
import { asoebiSettings } from "./dyrected/globals/asoebi-settings.ts";

const dbAdapter = process.env.DATABASE_URL
  ? new PostgresAdapter({ url: process.env.DATABASE_URL })
  : new SqliteAdapter({ filename: process.env.DYRECTED_DATABASE_FILE || "./data/sweetunion.db" });

export default defineConfig({
  db: dbAdapter,
  storage: new CloudinaryStorageAdapter({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "mock_name",
    apiKey: process.env.CLOUDINARY_API_KEY || "mock_key",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "mock_secret",
  }),
  email: {
    from: process.env.EMAIL_FROM || `TheSweetUnion <${process.env.GMAIL_USER}>`,
    send: ({ to, subject, html }) => sendEmail({ to, subject, html }),
  },
  collections: [admins, media, wishlistItems, reservations, rsvpGroups, rsvpRecords, events, checkIns],
  globals: [siteSettings, asoebiSettings],
  admin: { branding: { logoText: "TheSweetUnion" } },
});
