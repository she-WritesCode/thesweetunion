import { defineConfig } from "@dyrected/core";
import { SqliteAdapter } from "@dyrected/db-sqlite";
import { CloudinaryStorageAdapter } from "@dyrected/storage-cloudinary";

// Collections
import { admins } from "./dyrected/collections/admins.ts";
import { media } from "./dyrected/collections/media.ts";
import { wishlistItems } from "./dyrected/collections/wishlist-items.ts";
import { reservations } from "./dyrected/collections/reservations.ts";
import { rsvpGroups } from "./dyrected/collections/rsvp-groups.ts";
import { rsvpRecords } from "./dyrected/collections/rsvp-records.ts";

// Globals
import { siteSettings } from "./dyrected/globals/site-settings.ts";

export default defineConfig({
  db: new SqliteAdapter({
    filename: process.env.DYRECTED_DATABASE_FILE || "./data/sweetunion.db",
  }),
  storage: new CloudinaryStorageAdapter({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "mock_name",
    apiKey: process.env.CLOUDINARY_API_KEY || "mock_key",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "mock_secret",
  }),
  email: {
    from: process.env.EMAIL_FROM || "TheSweetUnion <noreply@thesweetunion.com>",
    send: async ({ to, subject, html }) => {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY || "re_mock");
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "TheSweetUnion <noreply@thesweetunion.com>",
        to,
        subject,
        html,
      });
    },
  },
  collections: [admins, media, wishlistItems, reservations, rsvpGroups, rsvpRecords],
  globals: [siteSettings],
});
