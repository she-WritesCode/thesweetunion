<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

@specs/PRD.md

---

# Codebase Architecture Reference

## Stack

- **Framework:** Nuxt 3 (NOT Next.js — ignore all Next.js conventions)
- **CMS/Backend:** Dyrected v2.5.25 (`@dyrected/core`, `@dyrected/nuxt`)
- **Database:** SQLite in dev (`./data/sweetunion.db`), PostgreSQL in prod (via `DATABASE_URL`)
- **Email:** Nodemailer + Gmail SMTP (`dyrected/mailer.ts`)
- **Storage:** Cloudinary (`@dyrected/storage-cloudinary`)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`)

## Key File Locations

| What | Where |
|------|-------|
| CMS config | `dyrected.config.ts` |
| Collections | `dyrected/collections/*.ts` |
| Hooks | `dyrected/hooks/*.ts` |
| Access control | `dyrected/access/*.ts` |
| Globals | `dyrected/globals/*.ts` |
| Email templates | `dyrected/emails.ts` |
| Mailer | `dyrected/mailer.ts` |
| API routes | `server/api/**/*.{get,post,patch,delete}.ts` |
| Admin page | `pages/admin.vue` (wraps `<DyrectedAdmin>`) |
| Custom admin components | `components/admin/*.vue` |
| Site config | `config/site.ts` |

## Existing Collections (slugs)

| Slug | Purpose |
|------|---------|
| `admins` | Auth — one shared admin account |
| `media` | Cloudinary-backed image uploads |
| `events` | Wedding events (Ceremony, Reception) |
| `wishlist_items` | Gift registry items |
| `reservations` | Wishlist reservations |
| `rsvp_groups` | Invitation groups (internal, not shown to guests) |
| `rsvp_records` | Guest RSVP submissions |
| `check_ins` | QR code check-in records |

## Collection Pattern

```typescript
// dyrected/collections/example.ts
import type { CollectionConfig } from "@dyrected/core";

export const example: CollectionConfig = {
  slug: "example_items",
  labels: { singular: "Example", plural: "Examples" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "createdAt"],
    group: "GroupName",
  },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "createdAt", type: "date", admin: { readOnly: true } },
  ],
  access: {
    read: "true",          // public read
    create: "true",        // public create
    update: "user != null", // admin only
    delete: "user != null",
  },
  hooks: {
    beforeChange: [myHook],
  },
};
```

Register every new collection in `dyrected.config.ts` (import + add to `collections: []`).

## Hook Pattern

Hooks are simple data-transform functions. Complex validation (lookups, API calls) goes in API routes, not hooks.

```typescript
// dyrected/hooks/my-hooks.ts
import type { CollectionBeforeChangeHook } from "@dyrected/core";

export const myHook: CollectionBeforeChangeHook = ({ data, operation }) => {
  if (operation === "create") {
    data.createdAt = new Date().toISOString();
  }
  return data;
};
```

## API Route Pattern

```typescript
// server/api/something/action.post.ts
import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const config = useRuntimeConfig();

  const client = createClient({
    baseUrl: config.dyrectedUrl,       // server-side (private) URL
    apiKey: config.dyrectedApiKey,     // server-side private key
  });

  const records = await client.collection("slug").find({
    where: { field: { equals: value } },
    limit: 100,
  });

  // findByID does NOT exist in the SDK — fetch a single record like this:
  const res = await client.collection("slug").find({ where: { id: { equals: id } }, limit: 1 });
  const record = res.docs?.[0]; // undefined if not found

  const created = await client.collection("slug").create({ ...data });
  const updated = await client.collection("slug").update(id, { ...data });

  return { success: true };
});
```

For dynamic route params: use `getRouterParam(event, "paramName")` (file: `[paramName].post.ts`).

## Custom Admin Components

Components are Vue 3 files that render inside specific fields in DyrectedAdmin. They receive:
- `value` — current stored value
- `onChange` — call to update field value
- `context.siblingData` — all field values of the current record (does NOT include `id`)
- `context.user` — current logged-in user

The record `id` is not in `siblingData`. Read it from the URL hash — DyrectedAdmin uses hash routing, so `window.location.pathname` is always `/admin`:
```typescript
const recordId = computed(() => {
  const segments = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const id = segments.at(-1);
  return id && id !== "create" ? id : undefined;
});
```

Register them in `pages/admin.vue`:
```typescript
const adminComponents = {
  fields: {
    "collection_slug.fieldName": MyComponent,
  },
};
```

And reference in the collection field:
```typescript
{
  name: "myField",
  type: "json",  // use "json" for custom UI fields that don't need to store specific typed data
  admin: {
    component: "collection_slug.fieldName",
    description: "...",
  },
}
```

Use `type: "text"` with `readOnly: true` for virtual display fields (like links).
Use `type: "json"` for interactive custom UI panels (scanners, buttons, previews).

## Runtime Config

```typescript
// Server-side (private)
config.dyrectedApiKey     // private API key
config.dyrectedUrl        // internal Dyrected API URL

// Public (available in browser)
config.public.dyrectedUrl   // public Dyrected API URL
config.public.appUrl        // base URL of the app
config.public.dyrectedApiKey
```

## Admin — No Custom Pages

DyrectedAdmin handles all routing under `/admin/*` client-side. It is NOT possible to create a custom Nuxt page at `/admin/anything` — Nuxt's file router would conflict. All custom admin UI must be implemented as custom field components registered in `pages/admin.vue`.

## Email

```typescript
import { sendEmail } from "~~/dyrected/mailer";
import { myTemplate } from "~~/dyrected/emails";

sendEmail({
  to: "guest@email.com",
  subject: "Subject line",
  html: myTemplate({ name: "Guest" }),
}).catch(console.error);  // fire-and-forget pattern used throughout
```

## RSVPRecord — Key Fields

`leadName`, `leadEmail`, `leadPhone`, `hasSpouse`, `spouseName`, `attending`, `group` (→ rsvp_groups), `selectedEvents` (→ events[]), `editToken`, `submittedAt`, `checkedIn`, `checkIn` (→ check_ins), `invitationSent`, `invitationSentAt`, `invitationSentVia`
