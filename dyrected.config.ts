import { defineConfig, definePage, defineWorkspace } from "@dyrected/core";
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
import { seatingSettings } from "./dyrected/globals/seating-settings.ts";

const dbAdapter = new PostgresAdapter({
  url: process.env.DATABASE_URL || "postgres://localhost:5432/sweetunion",
});

/** Sidebar rule: everyone except ushers (no role = admin). */
const NOT_USHER = "user.role != 'usher'";

export default defineConfig({
  db: dbAdapter,
  storage: new CloudinaryStorageAdapter({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "mock_name",
    apiKey: process.env.CLOUDINARY_API_KEY || "mock_key",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "mock_secret",
  }),
  email: {
    from: process.env.EMAIL_FROM || `TheSweetUnion <${process.env.GMAIL_USER}>`,
    send: ({ to, subject, html }: any) => sendEmail({ to, subject, html: html || "" }),
  },
  collections: [admins, media, wishlistItems, reservations, rsvpGroups, rsvpRecords, events, checkIns],
  globals: [siteSettings, asoebiSettings, seatingSettings],
  admin: {
    branding: { logoText: "TheSweetUnion" },
    navigation: [
      // ---- Role gating -------------------------------------------------------
      // Ushers (role "usher") only see Check-ins. Everything else is hidden from
      // their sidebar. Accounts with no role count as admin. This is a UI gate;
      // the check-in API routes and admin-only API routes enforce it server-side
      // (server/utils/require-admin.ts).
      defineWorkspace({ collection: "admins", group: "Collections", access: NOT_USHER }),
      defineWorkspace({ collection: "media", group: "Content", access: NOT_USHER }),
      defineWorkspace({ collection: "wishlist_items", group: "Wishlist", access: NOT_USHER }),
      defineWorkspace({ collection: "reservations", group: "Wishlist", access: NOT_USHER }),
      defineWorkspace({ collection: "rsvp_groups", group: "RSVP", access: NOT_USHER }),
      defineWorkspace({ collection: "rsvp_records", group: "RSVP", access: NOT_USHER }),
      defineWorkspace({ collection: "events", group: "RSVP", access: NOT_USHER }),
      defineWorkspace({ collection: "check_ins", group: "RSVP", access: "user != null" }),
      defineWorkspace({ global: "site_settings", group: "Configuration", access: NOT_USHER }),
      defineWorkspace({ global: "asoebi_settings", group: "Configuration", access: NOT_USHER }),
      defineWorkspace({ global: "seating_settings", group: "Configuration", access: NOT_USHER }),
      defineWorkspace({ trash: true, access: NOT_USHER }),
      definePage({
        slug: "asoebi-campaign",
        label: "Aso Ebi Campaign",
        icon: "Megaphone",
        group: "RSVP",
        collection: "rsvp_records",
        component: "AsoebiCampaignPage",
        access: NOT_USHER,
      }),
      definePage({
        slug: "pass-campaign",
        label: "Access Card Campaign",
        icon: "Send",
        group: "RSVP",
        collection: "rsvp_records",
        component: "PassCampaignPage",
        access: NOT_USHER,
      }),
      definePage({
        slug: "seating-planner",
        label: "Seating Planner",
        icon: "Armchair",
        group: "RSVP",
        collection: "rsvp_records",
        component: "SeatingPlannerPage",
        access: NOT_USHER,
      }),
    ],
  },
});
