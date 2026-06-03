# CMS Integration Plan — Dyrected CMS

**Version:** 1.0  
**Status:** Ready for Implementation  
**Prerequisite:** Read `PRD.md` and `docs.dyrected.com`

---

## 1. Overview

This document outlines the integration of **Dyrected CMS** as the backend for TheSweetUnion wedding website. Dyrected runs inside the existing Next.js app as a route handler — no separate server required.

### 1.1 Why Dyrected

- **In-app architecture** — mounts at `/dyrected` in the existing Next.js app
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

This auto-detects the Next.js App Router project and:

- Installs `@dyrected/core`, `@dyrected/next`, `@dyrected/db-sqlite` (dev)
- Creates `dyrected.config.ts` at project root
- Mounts API route at `app/dyrected/[...route]/route.ts`
- Mounts Admin UI at `app/admin/page.tsx`
- Generates `instrumentation.ts` for dev URL logging
- Generates `.env.example`

### 2.2 Dependencies to Add

```bash
pnpm add @dyrected/core @dyrected/next @dyrected/sdk @dyrected/db-sqlite
pnpm add @dyrected/storage-cloudinary resend
# For production:
# pnpm add @dyrected/db-postgres
```

### 2.3 Environment Variables

```env
# .env.local
DATABASE_URL=postgresql://user:pass@localhost:5432/sweetunion  # production
DYRECTED_DATABASE_FILE=./data/sweetunion.db                    # dev (SQLite)

# Dyrected API
NEXT_PUBLIC_DYRECTED_URL=http://localhost:3000/dyrected
DYRECTED_API_KEY=sk_live_...
NEXT_PUBLIC_DYRECTED_API_KEY=pk_live_...

# Cloudinary (image storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Resend (email)
RESEND_API_KEY=re_...
EMAIL_FROM=TheSweetUnion <noreply@thesweetunion.com>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 3. Content Model — Collections

Each collection and global is defined in its own file under `dyrected/collections/` or `dyrected/globals/`. The root `dyrected.config.ts` imports and assembles them.

### Root Config (Assembly Only)

```typescript
// dyrected.config.ts
import { defineConfig } from "@dyrected/core";
import { PostgresAdapter } from "@dyrected/db-postgres";
import { CloudinaryStorageAdapter } from "@dyrected/storage-cloudinary";

// Collections
import { admins } from "./dyrected/collections/__admins";
import { media } from "./dyrected/collections/media";
import { wishlistItems } from "./dyrected/collections/wishlist-items";
import { reservations } from "./dyrected/collections/reservations";
import { rsvpGroups } from "./dyrected/collections/rsvp-groups";
import { rsvpRecords } from "./dyrected/collections/rsvp-records";

// Globals
import { siteSettings } from "./dyrected/globals/site-settings";

export default defineConfig({
  db: new PostgresAdapter({ url: process.env.DATABASE_URL! }),
  storage: new CloudinaryStorageAdapter({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
  }),
  email: {
    from: process.env.EMAIL_FROM || "TheSweetUnion <noreply@thesweetunion.com>",
    send: async ({ to, subject, html }) => {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({ from: process.env.EMAIL_FROM!, to, subject, html });
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
import { publicRead } from "../access/public";
import { adminOnly } from "../access/admin";

export const media: CollectionConfig = {
  slug: "media",
  upload: {
    // Cloudinary adapter configured in defineConfig({ storage: ... })
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
import { publicRead } from "../access/public";
import { adminOnly } from "../access/admin";

export const siteSettings: GlobalConfig = {
  slug: "site-settings",
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
import { adminOnly } from "../access/admin";

export const wishlistItems: CollectionConfig = {
  slug: "wishlist-items",
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
    read: ({ user }) => (user ? true : { isHidden: { not_equals: true } }),
    create: ({ user }) => !!user,
    update: ({ user }) => !!user,
    delete: ({ user }) => !!user,
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

### Reservations Collection

```typescript
// dyrected/collections/reservations.ts
import type { CollectionConfig } from "@dyrected/core";
import { reserveItem, releaseReservation } from "../hooks/reservation-hooks";
import { adminOnly } from "../access/admin";

export const reservations: CollectionConfig = {
  slug: "reservations",
  labels: { singular: "Reservation", plural: "Reservations" },
  admin: {
    useAsTitle: "guestName",
    defaultColumns: ["guestName", "item", "reservedAt"],
    group: "Wishlist",
  },
  fields: [
    { name: "item", type: "relationship", label: "Wishlist Item", relationTo: "wishlist-items", required: true },
    { name: "guestName", type: "text", label: "Guest Name", required: true },
    { name: "guestEmail", type: "email", label: "Guest Email", required: true },
    { name: "message", type: "textarea", label: "Message", admin: { placeholder: "Message to the couple (optional)" } },
    { name: "reservedAt", type: "date", label: "Reserved At", admin: { readOnly: true } },
  ],
  access: {
    read: ({ user }) => !!user,
    create: () => true,
    update: () => false,
    delete: ({ user }) => !!user,
  },
  hooks: {
    beforeChange: [reserveItem],
    afterDelete: [releaseReservation],
  },
};
```

### RSVP Groups Collection

```typescript
// dyrected/collections/rsvp-groups.ts
import type { CollectionConfig } from "@dyrected/core";
import { generateGroupSlug } from "../hooks/group-hooks";
import { adminOnly } from "../access/admin";

export const rsvpGroups: CollectionConfig = {
  slug: "rsvp-groups",
  labels: { singular: "RSVP Group", plural: "RSVP Groups" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "maxCapacity", "confirmedCount", "isActive"],
    group: "RSVP",
  },
  fields: [
    { name: "name", type: "text", label: "Group Name", required: true },
    { name: "slug", type: "text", label: "URL Slug", required: true, unique: true },
    {
      name: "description",
      type: "textarea",
      label: "Internal Notes",
      admin: { description: "Internal notes for the couple" },
    },
    { name: "maxCapacity", type: "number", label: "Max Capacity", required: true },
    { name: "confirmedCount", type: "number", label: "Confirmed Count", defaultValue: 0, admin: { readOnly: true } },
    { name: "declinedCount", type: "number", label: "Declined Count", defaultValue: 0, admin: { readOnly: true } },
    { name: "isActive", type: "boolean", label: "Active", defaultValue: true },
    { name: "createdAt", type: "date", label: "Created At", admin: { readOnly: true } },
  ],
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [generateGroupSlug],
  },
};
```

### RSVP Records Collection

```typescript
// dyrected/collections/rsvp-records.ts
import type { CollectionConfig } from "@dyrected/core";
import { enforceRsvpCapacity } from "../hooks/rsvp-hooks";
import { adminOnly } from "../access/admin";

export const rsvpRecords: CollectionConfig = {
  slug: "rsvp-records",
  labels: { singular: "RSVP Record", plural: "RSVP Records" },
  admin: {
    useAsTitle: "leadName",
    defaultColumns: ["leadName", "leadEmail", "group", "attending", "hasSpouse", "submittedAt"],
    group: "RSVP",
  },
  fields: [
    { name: "group", type: "relationship", label: "RSVP Group", relationTo: "rsvp-groups", required: true },
    { name: "leadName", type: "text", label: "Full Name", required: true },
    { name: "leadEmail", type: "email", label: "Email", required: true, unique: true },
    { name: "leadPhone", type: "text", label: "Phone Number" },
    { name: "hasSpouse", type: "boolean", label: "Attending with Spouse", defaultValue: false },
    {
      name: "spouseName",
      type: "text",
      label: "Spouse Name",
      admin: {
        condition: (data) => data.hasSpouse === true,
        description: "Required if attending with spouse",
      },
    },
    { name: "attending", type: "boolean", label: "Attending", required: true },
    {
      name: "dietaryNotes",
      type: "textarea",
      label: "Dietary Notes",
      admin: { placeholder: "Any dietary requirements?" },
    },
    {
      name: "message",
      type: "textarea",
      label: "Message to Couple",
      admin: { placeholder: "Message to the couple (optional)" },
    },
    { name: "submittedAt", type: "date", label: "Submitted At", admin: { readOnly: true } },
    { name: "editToken", type: "text", label: "Edit Token", admin: { readOnly: true, hidden: true } },
  ],
  access: {
    read: adminOnly,
    create: () => true,
    update: () => false,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [enforceRsvpCapacity],
  },
};
```

### Admin Collection

```typescript
// dyrected/collections/__admins.ts
import type { CollectionConfig } from "@dyrected/core";

export const admins: CollectionConfig = {
  slug: "__admins",
  auth: true,
  fields: [
    { name: "name", type: "text", label: "Name" },
    { name: "role", type: "select", label: "Role", options: ["admin"], defaultValue: "admin" },
  ],
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
      collection: "wishlist-items",
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
    collection: "wishlist-items",
    id: doc.item.id || doc.item,
    data: { reservedCount: { $decrement: 1 } },
  });
};
```

Then import into `reservations` collection:

```typescript
// dyrected/collections/reservations.ts
import { reserveItem, releaseReservation } from "../hooks/reservation-hooks";

export const reservations: CollectionConfig = {
  // ...
  hooks: {
    beforeChange: [reserveItem],
    afterDelete: [releaseReservation],
  },
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
    collection: "rsvp-records",
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
      collection: "rsvp-groups",
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
      collection: "rsvp-groups",
      id: groupId,
      data: { declinedCount: { $increment: 1 } },
    });
  }

  return data;
};
```

### 4.3 RSVP Group — Auto-Generate Slug

```typescript
// dyrected/hooks/group-hooks.ts
import type { CollectionBeforeChangeHook } from "@dyrected/core";

export const generateGroupSlug: CollectionBeforeChangeHook = async ({ data, operation }) => {
  if (operation === "create") {
    data.createdAt = new Date().toISOString();
    if (!data.slug && data.name) {
      data.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
  }
  return data;
};
```

---

## 5. Access Control

### 5.1 Guest Access (Public)

| Collection       | Read               | Create | Update | Delete |
| ---------------- | ------------------ | ------ | ------ | ------ |
| `media`          | Yes                | No     | No     | No     |
| `site-settings`  | Yes                | —      | No     | —      |
| `wishlist-items` | Yes (visible only) | No     | No     | No     |
| `reservations`   | No                 | Yes    | No     | No     |
| `rsvp-groups`    | No                 | No     | No     | No     |
| `rsvp-records`   | No                 | Yes    | No     | No     |

### 5.2 Admin Access (Couple via `__admins`)

| Collection       | Read | Create | Update | Delete |
| ---------------- | ---- | ------ | ------ | ------ |
| `media`          | Yes  | Yes    | Yes    | Yes    |
| `site-settings`  | Yes  | —      | Yes    | —      |
| `wishlist-items` | Yes  | Yes    | Yes    | Yes    |
| `reservations`   | Yes  | No     | No     | Yes    |
| `rsvp-groups`    | Yes  | Yes    | Yes    | Yes    |
| `rsvp-records`   | Yes  | No     | Yes    | Yes    |

### 5.3 Implementation

Shared access helpers in `dyrected/access/`:

```typescript
// dyrected/access/public.ts
export const publicRead = () => true;

// dyrected/access/admin.ts
export const adminOnly = ({ user }: { user: any }) => !!user;
export const adminReadWrite = ({ user }: { user: any }) => !!user;
```

Then import into collections:

```typescript
import { publicRead } from "../access/public";
import { adminOnly } from "../access/admin";

export const media: CollectionConfig = {
  // ...
  access: {
    read: publicRead,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
};
```

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
  // ... collections
});
```

### 6.2 Email Triggers via Hooks

| Trigger                 | Collection     | Hook                   | Email Template                   |
| ----------------------- | -------------- | ---------------------- | -------------------------------- |
| Gift reserved           | `reservations` | `afterChange` (create) | Confirmation + cancellation link |
| Gift cancelled          | `reservations` | `afterDelete`          | Cancellation confirmation        |
| RSVP submitted          | `rsvp-records` | `afterChange` (create) | Summary + edit link              |
| RSVP updated            | `rsvp-records` | `afterChange` (update) | Updated summary                  |
| New RSVP (admin)        | `rsvp-records` | `afterChange` (create) | Admin digest                     |
| New reservation (admin) | `reservations` | `afterChange` (create) | Admin digest                     |

### 6.3 Cancellation Links

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

### 7.1 Server Component Data Fetching

```typescript
// app/wishlist/page.tsx
import { createClient } from '@dyrected/sdk'

const client = createClient({
  baseUrl: process.env.NEXT_PUBLIC_DYRECTED_URL!,
  apiKey: process.env.DYRECTED_API_KEY!,
})

export default async function WishlistPage() {
  const { docs: items } = await client.collection('wishlist-items').find({
    where: { isHidden: { not_equals: true } },
    sort: 'createdAt',
    depth: 1,
  })

  return <WishlistGrid items={items} />
}
```

### 7.2 RSVP Form Submission

```typescript
// Client component — app/rsvp/page.tsx
"use client";

export default function RSVPForm({ groupSlug }: { groupSlug: string }) {
  const handleSubmit = async (data: RSVPFormData) => {
    const res = await fetch("/api/rsvp/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, groupSlug }),
    });
    // Handle success/error
  };
  // ...
}
```

### 7.3 ISR Revalidation

When content changes in the admin, revalidate affected pages:

```typescript
// dyrected.config.ts hooks
hooks: {
  afterChange: [
    async ({ doc, operation }) => {
      if (doc.isHidden !== undefined) {
        revalidatePath('/wishlist')
      }
      if (doc.name && doc.slug) {
        revalidatePath('/')
      }
    },
  ],
},
```

---

## 8. Admin Dashboard

### 8.1 Access URL

```
https://thesweetunion.com/admin
```

The auto-generated Dyrected Admin UI provides:

- **Site Settings** — tabbed editor with sections:
  - Couple (names, date, time, hashtag)
  - Venue (name, address, map link)
  - Hero (photo, subtitle)
  - Our Story (format, content, photos)
  - Schedule & FAQs (event timeline, common questions)
  - RSVP Config (cutoff date/time)
  - Payments (bank details for cash funds)
  - Admin (notification email)
- **Wishlist Items** — add/edit/hide/delete gift items
- **Reservations** — view all gift reservations, export CSV
- **RSVP Groups** — create groups, copy invitation links, view capacity
- **RSVP Records** — view all RSVPs, filter by group/status, export CSV
- **Media** — upload and manage images

### 8.2 Custom Admin Routes (Optional)

Add a custom dashboard page for quick overview:

```typescript
// app/admin/dashboard/page.tsx
import { DyrectedAdmin } from '@dyrected/next/admin'

export default function AdminDashboard() {
  return <DyrectedAdmin apiPath="/dyrected" />
}
```

---

## 9. File Structure After Integration

Config files are split into individual files per collection/global. The root `dyrected.config.ts` is an assembly file only.

```
thesweetunion/
├── app/
│   ├── admin/
│   │   └── page.tsx              # Dyrected Admin UI
│   ├── dyrected/
│   │   └── [...route]/
│   │       └── route.ts          # Dyrected API routes
│   ├── api/
│   │   └── rsvp/
│   │       ├── submit/route.ts   # Guest RSVP submission
│   │       ├── edit/[token]/route.ts  # Edit RSVP via link
│   │       └── cancel/[token]/route.ts  # Cancel reservation
│   ├── rsvp/
│   │   └── page.tsx              # RSVP form (reads group from URL)
│   ├── wishlist/
│   │   └── page.tsx              # Wishlist grid
│   └── page.tsx                  # Home page (reads site-settings)
├── dyrected/                     # Dyrected config (split)
│   ├── collections/
│   │   ├── __admins.ts
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
│       ├── public.ts             # read: () => true helpers
│       └── admin.ts              # ({ user }) => !!user helpers
├── dyrected.config.ts            # Assembly file — imports only
├── instrumentation.ts            # Dev URL logging
├── src/
│   └── config/
│       └── site.ts               # Kept as fallback during migration
└── .env.local                    # Environment variables
```

---

## 10. Migration Steps

### Phase 1: Setup (Day 1)

1. Run `npx @dyrected/cli init`
2. Configure `.env.local` with database URL
3. Define all collections in `dyrected.config.ts`
4. Start dev server — schema auto-syncs
5. Create admin account via `/admin`

### Phase 2: Content Population (Day 2-3)

1. Upload hero photo and story photos via Media
2. Fill in Site Settings (names, date, venue, schedule, FAQs)
3. Add wishlist items with images
4. Create RSVP groups with capacities
5. Generate and test invitation links

### Phase 3: Frontend Integration (Day 4-6)

1. Replace static data with Dyrected SDK fetches
2. Build RSVP form with group validation
3. Build wishlist reservation flow
4. Add email notifications via hooks
5. Test concurrency with simultaneous submissions

### Phase 4: Polish (Day 7-8)

1. Add ISR revalidation hooks
2. Mobile QA on all forms
3. Performance audit (Lighthouse ≥ 90)
4. Security review (rate limiting, token validation)

---

## 11. Resolved Decisions

| #   | Question                                  | Decision                                                                    |
| --- | ----------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Dyrected Cloud vs self-hosted?            | **Self-hosted** — bring own Postgres, free under BSL                        |
| 2   | RSVP edit — Dyrected hooks or custom API? | **Custom API route** — complex conditional logic (seat delta, cutoff check) |
| 3   | Email provider?                           | **Resend** — simple, generous free tier                                     |
| 4   | Storage adapter?                          | **Cloudinary** — easy image transforms, free tier, CDN                      |
| 5   | Rate limiting?                            | **Next.js middleware + IP-based throttling**                                |
| 6   | Database for production?                  | **PostgreSQL** (self-hosted)                                                |
| 7   | Replace src/config/site.ts?               | **Keep as fallback** — migrate to Dyrected globals gradually                |
| 8   | Implementation scope?                     | **Same PR** — Dyrected setup + page refactoring together                    |

---

_This plan is a living document. Updates should be versioned before implementation begins._
