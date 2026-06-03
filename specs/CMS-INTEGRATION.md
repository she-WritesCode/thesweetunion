# CMS Integration Plan — Dyrected CMS

**Version:** 1.0  
**Status:** Ready for Implementation  
**Prerequisite:** Read `PRD.md` and `docs.dyrected.com`

---

## 1. Overview

This document outlines the integration of **Dyrected CMS** as the backend for TheSweetUnion wedding website. Dyrected runs inside the existing Nuxt 3 app as a Nitro server API route — no separate server required.

### 1.1 Why Dyrected

- **In-app architecture** — mounts at `/api/dyrected` in the existing Nuxt 3 app
- **Auto-generated Admin UI** — the couple gets a dashboard at `/admin` for free
- **TypeScript config-as-code** — content model lives in `dyrected.config.ts`
- **Hooks** — custom logic for concurrency, email triggers, slug generation
- **Access control** — function-based per collection and field
- **Upload collections** — wishlist images with auto-resized thumbnails

### 1.2 Deployment Strategy

| Environment | Database                 | Storage    | Notes                                 |
| ----------- | ------------------------ | ---------- | ------------------------------------- |
| Development | SQLite                   | Local disk | Zero config, `npx @dyrected/cli init` |
| Production  | PostgreSQL (self-hosted) | Cloudinary | Free tier, image transforms, CDN      |

**Decisions:** Self-hosted with PostgreSQL. Cloudinary for image storage and transforms. Resend for email.

---

## 2. Installation & Setup

### 2.1 Initialize Dyrected

```bash
npx @dyrected/cli init
```

This auto-detects the Nuxt 3 project and:

- Installs `@dyrected/core`, `@dyrected/nuxt`, `@dyrected/db-sqlite` (dev)
- Creates `dyrected.config.ts` at project root
- Mounts API route at `server/api/dyrected/[...].ts`
- Mounts Admin UI at `pages/admin.vue`
- Generates `.env.example`

### 2.2 Dependencies to Add

```bash
npm install @dyrected/core @dyrected/nuxt @dyrected/sdk @dyrected/db-sqlite
npm install @dyrected/storage-cloudinary resend
# For production:
# npm install @dyrected/db-postgres
```

### 2.3 Environment Variables

```env
# .env.local
DATABASE_URL=postgresql://user:pass@localhost:5432/sweetunion  # production
DYRECTED_DATABASE_FILE=./data/sweetunion.db                    # dev (SQLite)

# Dyrected API
NUXT_PUBLIC_DYRECTED_URL=http://localhost:3000/api/dyrected
DYRECTED_API_KEY=sk_live_...
NUXT_PUBLIC_DYRECTED_API_KEY=pk_live_...

# Cloudinary (image storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Resend (email)
RESEND_API_KEY=re_...
EMAIL_FROM=TheSweetUnion <noreply@thesweetunion.com>

# App
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 3. Content Model — Collections

Each collection and global is defined in its own file under `dyrected/collections/` or `dyrected/globals/`. The root `dyrected.config.ts` imports and assembles them.

> [!IMPORTANT]
> SQLite table naming rules do not support hyphens (`-`). To prevent SQLite database query syntax crashes, all collection slugs must use underscores (`_`) instead of hyphens (e.g. `rsvp_groups` instead of `rsvp-groups`).

### Root Config (Assembly Only)

```typescript
// dyrected.config.ts
import { defineConfig } from "@dyrected/core";
import { SqliteAdapter } from "@dyrected/db-sqlite";
import { CloudinaryStorageAdapter } from "@dyrected/storage-cloudinary";
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
```

### Media Collection

```typescript
// dyrected/collections/media.ts
import type { CollectionConfig } from "@dyrected/core";
import { publicRead } from "../access/public.ts";
import { adminOnly } from "../access/admin.ts";

export const media: CollectionConfig = {
  slug: "media",
  upload: {
    allowedMimeTypes: ["image/*"],
    maxFileSize: 10_000_000, // 10MB
    imageSizes: [
      { name: "thumbnail", width: 300, height: 300, crop: "center" },
      { name: "card", width: 800, height: 450, crop: "center" },
      { name: "hero", width: 1920, fit: "contain" },
    ],
  },
  fields: [
    { name: "alt", type: "text", label: "Alt Text", required: true },
    { name: "caption", type: "textarea", label: "Caption" },
  ],
  access: {
    read: publicRead,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
};
```

### Site Settings Global

```typescript
// dyrected/globals/site-settings.ts
import type { GlobalConfig } from "@dyrected/core";
import { publicRead } from "../access/public.ts";
import { adminOnly } from "../access/admin.ts";

export const siteSettings: GlobalConfig = {
  slug: "site_settings",
  label: "Site Settings",
  fields: [
    // ─── Couple Tab ──────────────────────────────────────────────
    {
      name: "partnerOneName",
      type: "text",
      label: "Partner One Name",
      required: true,
      admin: { tab: "Couple" },
    },
    {
      name: "partnerTwoName",
      type: "text",
      label: "Partner Two Name",
      required: true,
      admin: { tab: "Couple" },
    },
    {
      name: "weddingDate",
      type: "date",
      label: "Wedding Date",
      required: true,
      admin: { tab: "Couple" },
    },
    {
      name: "weddingTime",
      type: "text",
      label: "Wedding Time",
      admin: { tab: "Couple", placeholder: "e.g. 3:00 PM" },
    },
    {
      name: "hashtag",
      type: "text",
      label: "Wedding Hashtag",
      defaultValue: "#TheSweetUnion",
      admin: { tab: "Couple" },
    },

    // ─── Venue Tab ───────────────────────────────────────────────
    {
      name: "venueName",
      type: "text",
      label: "Venue Name",
      required: true,
      admin: { tab: "Venue" },
    },
    {
      name: "venueAddress",
      type: "textarea",
      label: "Venue Address",
      required: true,
      admin: { tab: "Venue" },
    },
    {
      name: "venueMapUrl",
      type: "url",
      label: "Google Maps Link",
      admin: { tab: "Venue", placeholder: "https://maps.google.com/..." },
    },

    // ─── Hero Tab ────────────────────────────────────────────────
    {
      name: "heroImage",
      type: "relationship",
      label: "Hero Photo",
      relationTo: "media",
      admin: { tab: "Hero", description: "Main photo displayed in the hero section." },
    },
    {
      name: "heroSubtitle",
      type: "text",
      label: "Hero Subtitle",
      admin: { tab: "Hero", placeholder: "e.g. Together with their families" },
    },

    // ─── Our Story Tab ───────────────────────────────────────────
    {
      name: "storyFormat",
      type: "select",
      label: "Story Format",
      options: [
        { label: "Timeline", value: "timeline" },
        { label: "Confessions", value: "confessions" },
        { label: "Blend", value: "blend" },
      ],
      defaultValue: "timeline",
      admin: { tab: "Our Story" },
    },
    {
      name: "storyContent",
      type: "richText",
      label: "Story Content",
      admin: { tab: "Our Story" },
    },
    {
      name: "storyPhotos",
      type: "array",
      label: "Story Photos",
      admin: { tab: "Our Story" },
      fields: [
        { name: "photo", type: "relationship", label: "Photo", relationTo: "media" },
        { name: "caption", type: "text", label: "Caption" },
      ],
    },

    // ─── Schedule & FAQs Tab ─────────────────────────────────────
    {
      name: "schedule",
      type: "array",
      label: "Event Schedule",
      admin: { tab: "Schedule & FAQs" },
      fields: [
        { name: "time", type: "text", label: "Time", required: true },
        { name: "event", type: "text", label: "Event", required: true },
        { name: "description", type: "textarea", label: "Description" },
      ],
    },
    {
      name: "faqs",
      type: "array",
      label: "Frequently Asked Questions",
      admin: { tab: "Schedule & FAQs" },
      fields: [
        { name: "question", type: "text", label: "Question", required: true },
        { name: "answer", type: "textarea", label: "Answer", required: true },
      ],
    },

    // ─── RSVP Config Tab ─────────────────────────────────────────
    {
      name: "rsvpCutoffDate",
      type: "date",
      label: "RSVP Cutoff Date",
      required: true,
      admin: { tab: "RSVP Config" },
    },
    {
      name: "rsvpCutoffTime",
      type: "text",
      label: "RSVP Cutoff Time",
      defaultValue: "23:59",
      admin: { tab: "RSVP Config" },
    },

    // ─── Payments Tab ────────────────────────────────────────────
    {
      name: "bankName",
      type: "text",
      label: "Bank Name",
      admin: { tab: "Payments", description: "Bank details for cash fund contributions." },
    },
    {
      name: "accountNumber",
      type: "text",
      label: "Account Number",
      admin: { tab: "Payments" },
    },
    {
      name: "accountName",
      type: "text",
      label: "Account Name",
      admin: { tab: "Payments" },
    },

    // ─── Admin Tab ───────────────────────────────────────────────
    {
      name: "adminEmail",
      type: "email",
      label: "Admin Notification Email",
      required: true,
      admin: { tab: "Admin", description: "Email address to receive RSVP and reservation notifications." },
    },
  ],
  access: {
    read: publicRead,
    update: adminOnly,
  },
};
```

### Wishlist Items Collection

```typescript
// dyrected/collections/wishlist-items.ts
import type { CollectionConfig } from "@dyrected/core";

export const wishlistItems: CollectionConfig = {
  slug: "wishlist_items",
  labels: { singular: "Wishlist Item", plural: "Wishlist Items" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "price", "reservedCount", "maxQuantity", "category"],
    group: "Wishlist",
  },
  fields: [
    { name: "name", type: "text", label: "Item Name", required: true },
    { name: "description", type: "textarea", label: "Description" },
    { name: "image", type: "relationship", label: "Product Image", relationTo: "media" },
    { name: "link", type: "url", label: "Purchase Link", admin: { description: "External purchase link (optional)" } },
    { name: "price", type: "number", label: "Price", required: true },
    { name: "maxQuantity", type: "number", label: "Max Reservations", required: true, defaultValue: 1 },
    { name: "reservedCount", type: "number", label: "Reserved Count", defaultValue: 0, admin: { readOnly: true } },
    {
      name: "category",
      type: "select",
      label: "Category",
      options: [
        { label: "Kitchen", value: "kitchen" },
        { label: "Travel", value: "travel" },
        { label: "Home", value: "home" },
        { label: "Cash Fund", value: "cash-fund" },
        { label: "Other", value: "other" },
      ],
    },
    { name: "isCashFund", type: "boolean", label: "Cash Fund", defaultValue: false },
    { name: "isHidden", type: "boolean", label: "Hidden", defaultValue: false },
    { name: "createdAt", type: "date", label: "Created At", admin: { readOnly: true } },
  ],
  access: {
    read: "true",
    create: "user != null",
    update: "user != null",
    delete: "user != null",
  },
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === "create") {
          data.createdAt = new Date().toISOString();
        }
        return data;
      },
    ],
  },
};
```

---

## 4. Hooks & Concurrency Safety

Hooks are split into individual files under `dyrected/hooks/` and imported into their respective collections.

### 4.1 Wishlist Reservation — Atomic Guard

```typescript
// dyrected/hooks/reservation-hooks.ts
import type { CollectionBeforeChangeHook, CollectionAfterDeleteHook } from "@dyrected/core";

export const reserveItem: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation === "create") {
    data.reservedAt = new Date().toISOString();

    const itemId = typeof data.item === "object" ? data.item.id : data.item;
    const result = await req.db.update({
      collection: "wishlist_items",
      id: itemId,
      data: { reservedCount: { $increment: 1 } },
      where: { reservedCount: { $lt: "{maxQuantity}" } },
    });

    if (!result) {
      throw new Error("Sorry, this gift was just taken. Please choose another.");
    }
  }
  return data;
};

export const releaseReservation: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await req.db.update({
    collection: "wishlist_items",
    id: doc.item.id || doc.item,
    data: { reservedCount: { $decrement: 1 } },
  });
};
```

### 4.2 RSVP Capacity — Atomic Guard

```typescript
// dyrected/hooks/rsvp-hooks.ts
import type { CollectionBeforeChangeHook } from "@dyrected/core";

export const enforceRsvpCapacity: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== "create") return data;

  data.submittedAt = new Date().toISOString();
  if (!data.editToken) {
    data.editToken = crypto.randomUUID();
  }

  // Duplicate email check
  const existing = await req.db.find({
    collection: "rsvp_records",
    where: { leadEmail: { equals: data.leadEmail } },
    limit: 1,
  });
  if (existing.total > 0) {
    throw new Error("It looks like you've already RSVP'd. Check your confirmation email to make any changes.");
  }

  const groupId = typeof data.group === "object" ? data.group.id : data.group;

  if (data.attending) {
    const seats = data.hasSpouse ? 2 : 1;
    const result = await req.db.update({
      collection: "rsvp_groups",
      id: groupId,
      data: { confirmedCount: { $increment: seats } },
      where: {
        $and: [
          { confirmedCount: { $add: [seats, "{confirmedCount}"] } },
          { maxCapacity: { $gte: "{confirmedCount}" } },
        ],
      },
    });
    if (!result) {
      throw new Error("Sorry, there are no more spots available. Please contact the couple directly.");
    }
  } else {
    await req.db.update({
      collection: "rsvp_groups",
      id: groupId,
      data: { declinedCount: { $increment: 1 } },
    });
  }

  return data;
};
```

---

## 5. Access Control

### 5.1 Guest Access (Public Jexl Rules)

| Collection       | Read                 | Create  | Update  | Delete        |
| ---------------- | -------------------- | ------- | ------- | ------------- |
| `media`          | `true` (Public)      | Admins  | Admins  | Admins        |
| `site_settings`  | `true` (Public)      | —       | Admins  | —             |
| `wishlist_items` | `true` (Public)      | Admins  | Admins  | Admins        |
| `reservations`   | Admins               | `true`  | `false` | Admins        |
| `rsvp_groups`    | Admins               | Admins  | Admins  | Admins        |
| `rsvp_records`   | Admins               | `true`  | `false` | Admins        |

---

## 6. Email Notifications

### 6.1 Configuration

```typescript
// dyrected.config.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default defineConfig({
  email: {
    from: process.env.EMAIL_FROM || "TheSweetUnion <noreply@thesweetunion.com>",
    send: async ({ to, subject, html }) => {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "TheSweetUnion <noreply@thesweetunion.com>",
        to,
        subject,
        html,
      });
    },
  },
});
```

### 6.2 Cancellation / Edit Links

Each reservation gets a unique cancellation URL:

```
https://thesweetunion.com/rsvp/cancel?token={reservation_id}
```

Each RSVP record gets a unique edit URL:

```
https://thesweetunion.com/rsvp/edit?token={editToken}
```

---

## 7. Frontend Integration

In Nuxt 3, page data fetching is performed during Server-Side Rendering (SSR) using standard composables like `useAsyncData`.

### 7.1 Server-Side Data Fetching

```vue
<!-- pages/wishlist.vue -->
<script setup lang="ts">
import { createClient } from '@dyrected/sdk'

const config = useRuntimeConfig()
const client = createClient({
  baseUrl: config.public.dyrectedUrl,
  apiKey: config.public.dyrectedApiKey,
})

const { data: items } = await useAsyncData('wishlist-items', () => 
  client.collection('wishlist_items').find({
    where: { isHidden: { not_equals: true } },
    sort: 'createdAt',
    depth: 1,
  })
)
</script>

<template>
  <WishlistGrid :items="items?.docs || []" />
</template>
```

### 7.2 RSVP Form Submission

```vue
<!-- pages/rsvp.vue -->
<script setup lang="ts">
const route = useRoute()
const groupSlug = route.query.group as string

const handleSubmit = async (formData: RSVPFormData) => {
  try {
    const res = await $fetch("/api/rsvp/submit", {
      method: "POST",
      body: { ...formData, groupSlug },
    });
    // Handle success
  } catch (error) {
    // Handle error
  }
};
</script>
```

---

## 8. Admin Dashboard

### 8.1 Access URL

```
https://thesweetunion.com/admin
```

Mount the Dyrected Admin interface within your Nuxt pages directory:

```vue
<!-- pages/admin.vue -->
<script setup lang="ts">
definePageMeta({
  layout: false
})
useHead({
  bodyAttrs: {
    class: 'cms-admin-page'
  }
})
</script>

<template>
  <ClientOnly>
    <DyrectedAdmin api-path="/api/dyrected" />
  </ClientOnly>
</template>
```

---

## 9. File Structure After Integration

```
thesweetunion/
├── server/
│   ├── api/
│   │   ├── dyrected/
│   │   │   └── [...].ts          # Dyrected API routes handler
│   │   └── rsvp/
│   │       ├── submit.post.ts    # Guest RSVP submission
│   │       ├── edit.patch.ts     # Edit RSVP via link
│   │       └── cancel.delete.ts  # Cancel reservation
│   └── tsconfig.json
├── pages/
│   ├── admin.vue                 # Dyrected Admin UI
│   ├── rsvp.vue                  # RSVP form (reads group from URL)
│   ├── wishlist.vue              # Wishlist grid
│   └── index.vue                 # Home page (reads site_settings)
├── components/
│   ├── Accordion.vue
│   ├── Countdown.vue
│   └── ...
├── dyrected/                     # Dyrected schema definition config
│   ├── collections/
│   │   ├── admins.ts
│   │   ├── media.ts
│   │   ├── wishlist-items.ts
│   │   ├── reservations.ts
│   │   ├── rsvp-groups.ts
│   │   └── rsvp-records.ts
│   ├── globals/
│   │   └── site-settings.ts
│   ├── hooks/
│   │   ├── reservation-hooks.ts  # Wishlist concurrency + email
│   │   ├── rsvp-hooks.ts         # RSVP concurrency + email
│   │   └── group-hooks.ts        # RSVP group slug generation
│   └── access/
│       ├── public.ts
│       └── admin.ts
├── assets/
│   └── css/
│       └── globals.css
├── dyrected.config.ts            # Core Dyrected config and DB adapters
├── nuxt.config.ts                # Nuxt configuration
├── package.json
└── .env.local
```

---

## 10. Migration Steps

### Phase 1: Setup

1. Run `npx @dyrected/cli init`
2. Configure `.env.local` with database URL variables using the `NUXT_` prefix where appropriate.
3. Define all collection schemas in `dyrected.config.ts`
4. Start dev server — schema auto-syncs database definitions
5. Create admin account via `/admin`

### Phase 2: Content Population

1. Upload hero photo and story photos via Media uploads
2. Fill in Site Settings (names, date, venue, schedule, FAQs)
3. Add wishlist items with images
4. Create RSVP groups with capacities
5. Generate and test invitation links

### Phase 3: Frontend Integration

1. Replace static data configurations with Dyrected SDK fetches
2. Bind RSVP form steps with group validation endpoints
3. Hook up wishlist reservation flow
4. Add email notifications via collection hooks
5. Test concurrency safety with simultaneous mock form submissions

