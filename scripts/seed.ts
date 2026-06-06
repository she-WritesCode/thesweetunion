import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { scrypt, randomBytes } from "node:crypto";
import { SqliteAdapter } from "@dyrected/db-sqlite";
import { PostgresAdapter } from "@dyrected/db-postgres";

// Load environment variables from .env.local
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

// Password hashing utility matching @dyrected/core
const scryptAsync = promisify(scrypt);
const SALT_LEN = 16;
const KEY_LEN = 64;

async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LEN).toString("hex");
  const derivedKey = (await scryptAsync(plain, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

// Import collection configs to register schema sync
import { admins } from "../dyrected/collections/admins.ts";
import { media } from "../dyrected/collections/media.ts";
import { wishlistItems } from "../dyrected/collections/wishlist-items.ts";
import { reservations } from "../dyrected/collections/reservations.ts";
import { rsvpGroups } from "../dyrected/collections/rsvp-groups.ts";
import { rsvpRecords } from "../dyrected/collections/rsvp-records.ts";
import { events } from "../dyrected/collections/events.ts";
import { siteSettings } from "../dyrected/globals/site-settings.ts";

const collections = [admins, media, wishlistItems, reservations, rsvpGroups, rsvpRecords, events];

async function seed() {
  console.log("Initializing database adapter...");
  const db = process.env.DATABASE_URL
    ? new PostgresAdapter({ url: process.env.DATABASE_URL })
    : new SqliteAdapter({ filename: process.env.DYRECTED_DATABASE_FILE || "./data/sweetunion.db" });

  console.log("Synchronizing schema...");
  await db.sync(collections);

  console.log("Clearing existing tables (except media)...");
  // Execute direct SQL truncates/deletes or delete records
  // For SQLite or Postgres, we can run queries using adapter.execute if Postgres, or clean up individually.
  // To keep it adapter-agnostic, we can fetch all records and delete them, or run execute for known tables.
  const isPostgres = !!process.env.DATABASE_URL;

  const tablesToClear = ["reservations", "rsvp_records", "rsvp_groups", "wishlist_items", "events", "admins"];
  for (const table of tablesToClear) {
    const tableName = `collection_${table}`;
    try {
      if (isPostgres) {
        await (db as any).execute(`TRUNCATE TABLE "${tableName}" CASCADE`);
      } else {
        await (db as any).execute(`DELETE FROM "${tableName}"`);
      }
      console.log(`Cleaned up table: ${tableName}`);
    } catch (e) {
      console.warn(`Failed to clear table ${tableName} via SQL direct truncate/delete:`, (e as Error).message);
      console.log(`Attempting collection-based clean up for ${table}...`);
      try {
        const existing = await db.find({ collection: table, limit: 1000 });
        for (const doc of existing.docs) {
          await db.delete({ collection: table, id: doc.id });
        }
      } catch (err) {
        console.error(`Failed to clean collection ${table}:`, (err as Error).message);
      }
    }
  }

  // 1. Seed Admin User
  console.log("Seeding default admin...");
  const adminPassword = process.env.ADMIN_PASSWORD || "TheSweetUnion@2026";
  const hashed = await hashPassword(adminPassword);
  const adminUser = await db.create({
    collection: "admins",
    data: {
      name: "The Couple",
      email: "obadofinadun@gmail.com",
      password: hashed,
      role: "admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
  console.log(`Created Admin: ${adminUser.email} (Password: ${adminPassword})`);

  // 2. Seed Events
  console.log("Seeding wedding events...");
  const whiteWedding = await db.create({
    collection: "events",
    data: {
      name: "White Wedding Ceremony",
      date: "2026-10-24T10:00:00.000Z",
      venueName: "To Be Announced",
      venueAddress: "To Be Announced",
      dressCode: "Strictly Formal (Muted Mauve & Soft Peach)",
      collectsRsvp: true,
      schedule: [
        { time: "09:30 AM", title: "Guest Arrival", description: "Soft prelude music and guest seating." },
        { time: "10:00 AM", title: "Processional & Vows", description: "The exchange of vows and rings." },
        { time: "11:30 AM", title: "Recessional & Photos", description: "Group photographs with family and friends." },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  const reception = await db.create({
    collection: "events",
    data: {
      name: "Wedding Reception",
      date: "2026-10-24T14:00:00.000Z",
      venueName: "To Be Announced",
      venueAddress: "To Be Announced",
      dressCode: "Elegant & Vibrant",
      collectsRsvp: true,
      schedule: [
        { time: "02:00 PM", title: "Cocktail Hour", description: "Welcome drinks and light finger foods." },
        { time: "03:00 PM", title: "Grand Entrance", description: "Welcoming the newlyweds!" },
        { time: "03:30 PM", title: "Dinner & Toasts", description: "A curated three-course dinner." },
        { time: "05:00 PM", title: "Dance Floor Opens", description: "Celebrating the sweet union!" },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
  console.log("Events seeded successfully.");

  // 3. Seed RSVP Groups
  console.log("Seeding RSVP Groups...");
  const groupsData = [
    {
      name: "Family & Close Friends",
      slug: "family-friends",
      maxCapacity: 50,
      description: "Immediate family members and closest friends of the couple.",
    },
    {
      name: "Church Community",
      slug: "church-community",
      maxCapacity: 40,
      description: "Members from the local congregation.",
    },
    {
      name: "Work Colleagues",
      slug: "colleagues",
      maxCapacity: 20,
      description: "Professional colleagues and teammates.",
    },
    { name: "General Invitees", slug: "general", maxCapacity: 100, description: "Acquaintances and general guests." },
  ];

  for (const group of groupsData) {
    const createdGroup = await db.create({
      collection: "rsvp_groups",
      data: {
        ...group,
        confirmedCount: 0,
        declinedCount: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    console.log(`Created RSVP Group: ${createdGroup.name} (Slug: ${createdGroup.slug})`);
  }

  // 4. Seed Wishlist Items
  console.log("Seeding Wishlist Items...");
  const wishlistData = [
    {
      name: "KitchenAid Stand Mixer",
      description: "For all our baking adventures, in Empire Red or Brushed Nickel.",
      price: 450,
      maxQuantity: 1,
      category: "kitchen",
      isCashFund: false,
      isHidden: false,
    },
    {
      name: "Le Creuset Enameled Cast Iron Dutch Oven",
      description: "A kitchen staple that will last us a lifetime.",
      price: 380,
      maxQuantity: 1,
      category: "kitchen",
      isCashFund: false,
      isHidden: false,
    },
    {
      name: "Dyson V15 Detect Vacuum",
      description: "To help us keep our new home spotless.",
      price: 750,
      maxQuantity: 1,
      category: "home",
      isCashFund: false,
      isHidden: false,
    },
    {
      name: "12-Piece Ceramic Dinnerware Set",
      description: "Elegant and minimal dinner plates, salad plates, and bowls.",
      price: 220,
      maxQuantity: 2,
      category: "home",
      isCashFund: false,
      isHidden: false,
    },
    {
      name: "Honeymoon Resort Stay",
      description: "Contribute to our beautiful accommodation during our honeymoon.",
      price: 150,
      maxQuantity: 10,
      category: "travel",
      isCashFund: true,
      isHidden: false,
    },
    {
      name: "Newlywed Nest Egg Fund",
      description: "Help us build our savings as we embark on this new chapter together.",
      price: 100,
      maxQuantity: 50,
      category: "cash-fund",
      isCashFund: true,
      isHidden: false,
    },
  ];

  for (const item of wishlistData) {
    const createdItem = await db.create({
      collection: "wishlist_items",
      data: {
        ...item,
        reservedCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    console.log(`Created Wishlist Item: ${createdItem.name}`);
  }

  // 5. Seed Site Settings Global
  console.log("Seeding Site Settings Global...");
  await db.updateGlobal({
    slug: "site_settings",
    data: {
      partnerOneName: "Adun",
      partnerTwoName: "Uche",
      weddingDate: "2026-10-22",
      weddingTime: "10:00 AM",
      weddingDateText: "October 22 & 24, 2026",
      weddingLocation: "Lagos, Nigeria",
      hashtag: "#TheSweetUnion",
      venueName: "The Alabaster Garden",
      venueAddress: "12 Botanical Avenue, Lekki Phase 1, Lagos",
      heroSubtitle: "Together with their families, invite you to celebrate their wedding",
      storyFormat: "timeline",
      storySubtitle: "Our Journey",
      storyTitle: "The Friendship that Grew",
      storyDescription:
        "We took our time, built a friendship that couldn't be broken, and ended up exactly where we belonged. Here is our story over the years.",
      storyPhotos: [
        { label: "September 2018", title: "First Meeting", description: "Met during Teen Church Exco team bonding." },
        {
          label: "December 2021",
          title: "The Turning Point",
          description: "Realized we were more than just best friends.",
        },
        { label: "August 2025", title: "The Proposal", description: "A simple, perfect yes by the waterfront." },
      ],
      faqs: [
        {
          question: "What is the dress code?",
          answer:
            "For the White Wedding on Oct 22, it is strictly formal with muted mauve and peach accents. For the Reception on Oct 24, dress to impress in elegant and vibrant attire.",
        },
        {
          question: "Can I bring a plus-one?",
          answer:
            "Due to capacity limits, guest invites are strictly limited to those addressed on the invitation (spouse/partner only). General plus-ones are not permitted.",
        },
        {
          question: "How do I reserve a gift?",
          answer:
            "Browse our Wishlist page and select any item to reserve. You can also contribute to our Cash Funds directly via bank transfer details shown in the reservation modal.",
        },
      ],
      rsvpCutoffDate: "2026-09-22",
      rsvpCutoffTime: "23:59",
      bankName: "Guaranty Trust Bank (GTB)",
      accountNumber: "0123456789",
      accountName: "Adun & Uche Wedding Account",
      adminEmail: "obadofinadun@gmail.com,busolaokemoney@gmail.com",
    },
  });
  console.log("Site Settings Global seeded successfully.");

  console.log("\nDatabase seeding completed successfully! 🎉");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Database seeding failed:", err);
  process.exit(1);
});
