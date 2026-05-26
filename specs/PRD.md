# Product Requirements Document

# Wedding Website — Wishlist & Group RSVP Platform

**Version:** 1.1  
**Status:** Ready for Development  
**Audience:** Frontend & Backend Developers, Designer

---

## 1. Overview

### 1.1 Purpose

A custom wedding website for a couple that allows guests to:

- Learn about the couple and the event (Home)
- Browse and reserve gift items from a wishlist (without duplication)
- RSVP as part of a named group, subject to a per-group attendance cap

The site must be elegant, mobile-first, and easy for non-technical guests to use.

### 1.2 Goals

| Goal                         | Success Metric                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| Prevent gift double-claiming | Zero instances of a gift item being reserved by more than the allowed number of people |
| Enforce RSVP group caps      | No group exceeds its configured guest limit                                            |
| Seamless guest experience    | Guest can RSVP or reserve a gift in under 3 minutes                                    |
| Admin visibility             | Couple can see all RSVPs and wishlist status in real time                              |

### 1.3 Out of Scope (v1)

- Payment processing
- Photo gallery uploads by guests
- Live chat or messaging
- Multi-language support

---

## 2. User Roles

| Role               | Description                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Guest**          | Any person with access to the site URL. No account needed.                                                           |
| **Admin (Couple)** | The couple (or a trusted delegate). Accesses a protected dashboard to manage groups, wishlist items, and view RSVPs. |

---

## 3. Pages & Features

### 3.1 Home Page

**Purpose:** Welcome guests and give them essential event information.

**Content Sections:**

1. **Hero Section** — Couple's names, wedding date, and a high-quality photo. Optional countdown timer to the wedding day.
2. **Our Story** — Narrative text, with photos in a timeline format.
3. **Event Details** — Date, time, venue name, address, and an embedded map (Google Maps iframe).
4. **Schedule** — Timeline of the day (ceremony, cocktail hour, reception).
5. **Wishlist Teaser** — A photo of the couple with a short warm note explaining they'd appreciate any gift but have a list of preferred items. Includes a CTA button linking to the Wishlist page.
6. **RSVP Prompt** — An image alongside short text emphasising how important it is to RSVP. Includes a CTA button linking to the RSVP page.
7. **FAQs** — Common questions about the event (dress code, parking, accommodation, etc.).
8. **Navigation** — Persistent nav bar with links to Home, Wishlist, and RSVP pages.

**Design Notes:**

- The couple should be able to easily swap their names, photos, venue details, and date through a config file or admin panel (see Section 6).
- Mobile-first; the hero photo must look good on phone screens.

**Our Story — Content Direction:**
The couple have known each other for a long time before falling in love. The "Our Story" section should reflect that — no pressure, no grand gestures, just warmth and honesty. The preferred tone is low-key, real, and lightly playful. Two format options are recommended (developer/designer can propose layout):

- **"The Long Game" timeline** — A short vertical or horizontal timeline of friendship milestones leading up to the romance. Not a biography; just the moments that matter, told simply. Example entries: first time they met, a funny or memorable moment, when things shifted, when they finally admitted it, the wedding.

- **"Confessions" alternating voices** — Short, honest lines in alternating His/Hers (or Name/Name) voices. No performance, just real. Example: _"I used to call him for advice about other guys. Looking back, that's hilarious."_ / _"I told myself we were just close friends. My friends didn't believe me. They were right."_

The couple may choose one format or a blend of both. Copy to be supplied by the couple in their own words, guided by these formats. Keep it under 200 words — brevity is part of the charm. The wedding hashtag **#TheSweetUnion** may be woven in as a subtle section closer.

---

### 3.2 Wishlist Page

#### 3.2.1 Overview

Guests browse a curated list of gift items added by the couple. Each item can be reserved by one or more guests (up to a per-item limit). Once fully reserved, the item is visually marked as unavailable.

#### 3.2.2 Wishlist Item Data Model

```
WishlistItem {
  id:            UUID (primary key)
  name:          string        // e.g. "KitchenAid Stand Mixer"
  description:   string        // optional short description
  image_url:     string        // product photo URL or uploaded image
  link:          string        // optional external purchase link
  price:         number        // approximate price (display only)
  max_quantity:  integer       // how many people can reserve this item
  reserved_count: integer      // current number of reservations (default: 0)
  category:      string        // optional grouping (e.g. "Kitchen", "Travel")
  is_hidden:     boolean       // admin can hide items without deleting
  created_at:    timestamp
}
```

#### 3.2.3 Reservation Data Model

```
WishlistReservation {
  id:            UUID
  item_id:       UUID (FK → WishlistItem)
  guest_name:    string
  guest_email:   string
  message:       string (optional) // e.g. "From Aunty Bisi with love!"
  reserved_at:   timestamp
}
```

#### 3.2.4 Guest Flow

1. Guest visits the Wishlist page.
2. Items are displayed as cards in a grid (image, name, price, availability indicator).
3. Filtering: guests can filter by category or price range.
4. Guest clicks **"Reserve This Gift"** on an available item.
5. A modal appears with:
   - Item name and image (recap)
   - **Your Name** (required)
   - **Your Email** (required, used to send confirmation)
   - **Message to couple** (optional)
   - Confirm button
6. On confirm:
   - System checks `reserved_count < max_quantity` **atomically** (race-condition safe).
   - If available: `reserved_count` is incremented, reservation is saved, confirmation email is sent to guest.
   - If no longer available (edge case): modal shows "Sorry, this gift was just taken. Please choose another."
7. A confirmation page/message shows: "Thank you! You've reserved [Item Name]. The couple will be thrilled."

#### 3.2.5 Availability Display Logic

| State                               | Visual Treatment                                                        |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `reserved_count = 0`                | Green badge: "Available"                                                |
| `0 < reserved_count < max_quantity` | Yellow badge: "Reserved by [N] people · [X] spots left"                 |
| `reserved_count = max_quantity`     | Red badge: "Fully Reserved" — button disabled, card slightly greyed out |

> **Note:** Items with `max_quantity > 1` are suitable for group gifts (e.g. "Contribute to Honeymoon Fund — up to 10 contributors welcome"). The display "Reserved by 2 people" gives social proof without revealing who reserved it.

#### 3.2.6 Purchase Links

Each wishlist item has an optional `purchase_link` field. Behaviour:

- **If a link is provided:** A secondary **"View Item"** button appears on the card (opens in new tab). This is shown alongside the "Reserve This Gift" button so guests can see what they're committing to before reserving.
- **If no link is provided:** Only the "Reserve This Gift" button is shown. This covers cash gifts, experiences, or items the couple will purchase themselves once they know someone is covering it.

The `link` field in the data model may also carry a note (e.g. "Pay via bank transfer — details will be shared after you reserve") — the admin can add this as part of the item description.

#### 3.2.6 Guest Cancellation

A guest who reserved a gift can cancel their reservation using their confirmation email. The email contains a unique cancellation link. On cancellation:

- The reservation record is deleted.
- `reserved_count` is decremented.
- The item becomes available again.

---

### 3.3 RSVP Page

#### 3.3.1 Overview

Each RSVP group has its own **unique registration link** generated by the admin (e.g. `thesweetunion.com/rsvp/church-friends/abc123`). Guests are invited via personalised invitation cards (sent on WhatsApp and/or email) that contain their group's specific link. When a guest opens their link, the group is pre-selected and they proceed directly to the form — they never see a list of groups, and they cannot access another group's link.

Groups are an internal crowd management tool. From the guest's perspective, they simply received a link on their invitation. Group names only appear in the admin dashboard. The group will also inform **seating placement** — the admin can filter and export by group when arranging tables.

#### 3.3.2 Group Data Model

```
RSVPGroup {
  id:            UUID
  name:          string        // e.g. "Church Friends" (internal label only)
  slug:          string        // unique URL segment e.g. "church-friends"
  token:         string        // unique random token for the link e.g. "abc123"
  description:   string        // internal notes for the couple
  max_capacity:  integer       // total number of people allowed from this group
  confirmed_count: integer     // total attending guests confirmed (default: 0)
  declined_count:  integer     // total guests who declined (default: 0)
  is_active:     boolean       // couple can deactivate a group link
  created_at:    timestamp
}
```

Full RSVP link format: `[domain]/rsvp/[slug]/[token]`

- The `slug` is human-readable but the `token` is what authenticates the link.
- If someone guesses the slug without the token, they get a 404.
- Admin generates and copies these links from the dashboard to paste into invitation cards.

#### 3.3.3 RSVP Record Data Model

```
RSVPRecord {
  id:              UUID
  group_id:        UUID (FK → RSVPGroup)
  lead_name:       string        // person filling the form
  lead_email:      string        // unique per group — system prevents duplicate email per group AND across groups
  lead_phone:      string (optional)
  party_members:   JSON array    // list of names in the party (including lead)
  party_size:      integer       // count of party_members (only counted if attending = true)
  attending:       boolean       // true = Yes, false = No (decline)
  dietary_notes:   string (optional)
  message:         string (optional)
  submitted_at:    timestamp
}
```

> **Duplicate email rule:** A guest's email address may only be used for one RSVP submission across the entire site — regardless of group. If the same email is submitted again (same or different group), the system shows: _"It looks like you've already RSVP'd. Check your confirmation email to make any changes."_ This prevents a guest from accidentally (or intentionally) RSVPing multiple times.

#### 3.3.4 Guest RSVP Flow

**Step 1 — Arrive via Invitation Link**

- Guest taps their unique link from their invitation card (WhatsApp or email).
- System validates the `slug` + `token`. If invalid or deactivated: shows a friendly error — _"This link is no longer active. Please contact the couple directly."_
- If the group is full (`confirmed_count = max_capacity`): shows — _"This group's spots are all filled. Please reach out to the couple."_
- If the guest's email was already used to RSVP: shows — _"It looks like you've already RSVP'd. Check your confirmation email to make any changes."_
- If valid and open: guest proceeds directly to the form. Group name is **not** shown to the guest.

**Step 2 — Fill in the Form**

- Your Full Name (required)
- Your Email (required)
- Your Phone Number (optional)
- Are you attending? → Yes / No toggle
  - If **No**: a short optional message field appears. Form skips party details. Submission is recorded as a decline and tracked in the admin dashboard.
  - If **Yes**: continue to Step 3.

**Step 3 — Add Party Members**

- Guest enters the number of people in their party (including themselves). Must be ≥ 1.
- System checks: `(confirmed_count + party_size) ≤ max_capacity`.
  - If exceeds limit: inline error — _"Sorry, there are only [N] spots left. Please reduce your party size or contact the couple."_
- Guest enters the name of each party member (fields generated dynamically).
- Dietary notes: single optional text field for the whole party.
- Optional message to the couple.

**Step 4 — Review & Submit**

- Summary card: Lead name, party list, attending status.
- Guest clicks **Submit RSVP**.
- System atomically increments `confirmed_count` by `party_size` (attending only).
- Confirmation email sent to guest with summary and a unique **Edit My RSVP** link.

**Step 5 — Confirmation**

- Attending: _"You're on the list! We can't wait to celebrate with you. 🎉"_
- Declining: _"Thank you for letting us know. We'll miss you!"_
- Email sent either way with a summary and the edit link.

#### 3.3.5 RSVP Editing

Guests can edit their RSVP up until a cutoff date (configurable by the couple in admin). Using the edit link:

- Changes to `party_size` must recheck group capacity.
- If changing from Yes → No: `confirmed_count` is decremented by original `party_size`.
- If changing from No → Yes: capacity check applies.

#### 3.3.6 RSVP Cutoff

The couple sets a cutoff date/time. After the cutoff:

- The RSVP page shows a "RSVP has closed" message.
- Edit links in emails are disabled.
- The admin can still manually adjust records.

---

## 4. Email Notifications

All emails are sent from a configured transactional email provider (SendGrid, Mailgun, Resend, etc.).

| Trigger                    | Recipient      | Content                                                 |
| -------------------------- | -------------- | ------------------------------------------------------- |
| Gift reserved              | Guest          | Item name, image, cancellation link                     |
| Gift reservation cancelled | Guest          | Confirmation of cancellation                            |
| RSVP submitted             | Guest          | Group, party list, venue details, edit link             |
| RSVP updated               | Guest          | Updated summary                                         |
| New RSVP                   | Admin (couple) | Guest name, group, party size (optional digest instead) |
| New reservation            | Admin (couple) | Item reserved, guest name (optional digest)             |

Email templates should be branded with the couple's names and wedding colors/fonts (configurable).

---

## 5. Admin Dashboard

Access: Protected route (e.g. `/admin`) behind a single shared username + password (one account for the couple). Not visible to regular guests.

### 5.1 Dashboard Overview

- Total RSVPs confirmed (attending guest count)
- Total RSVPs declined
- Wishlist progress: X of Y items reserved
- RSVP cutoff date display
- Quick links to each group's unique RSVP URL (for copying into invitations)

### 5.2 RSVP Management

**Group Manager**

- Create, edit, delete RSVP groups
- Fields: Name (internal), Max Capacity, Active/Inactive toggle
- On creation: system auto-generates a unique RSVP link. Admin can copy it with one click.
- See real-time confirmed count, declined count, and remaining capacity per group
- "Lock Group" button manually deactivates a group link regardless of remaining capacity
- Seating view: filter all RSVPs by group, showing party members — useful for table planning

**RSVP Records Table**

- Columns: Group (internal), Lead Name, Email, Phone, Party Members, Party Size, Attending (Yes/No), Message, Submitted At
- Filterable by group, attending status
- Export to CSV (full export, or filtered by group)
- Manual override: admin can delete or edit any RSVP record

### 5.3 Wishlist Management

**Item Manager**

- Add new items (name, description, image, purchase link, price, max_quantity, category)
- Purchase link is optional — leave blank for cash/bank transfer gifts
- Edit existing items
- Hide/unhide items (does not delete reservations)
- Delete items (with confirmation warning if reservations exist)

**Reservation Table**

- Columns: Item, Guest Name, Email, Message, Reserved At
- Export to CSV
- Admin can manually remove a reservation

### 5.4 Site Content Management (Optional for v1)

A simple config section where the couple can update:

- Wedding date
- Venue name and address
- Couple's names
- Hero image upload
- RSVP cutoff date

If a full CMS is out of scope, these can live in a config file (`config.json` or `.env`).

---

## 6. Technical Requirements

### 6.1 Stack Recommendations (Flexible — Developer's Choice)

| Layer        | Recommendation                              | Alternatives                       |
| ------------ | ------------------------------------------- | ---------------------------------- |
| Frontend     | Next.js (React)                             | Nuxt, SvelteKit, plain HTML        |
| Backend/API  | Next.js API routes or Node/Express          | Django, Laravel, Go                |
| Database     | PostgreSQL                                  | MySQL, SQLite (dev only)           |
| ORM          | Prisma                                      | Drizzle, Sequelize                 |
| Auth (Admin) | NextAuth.js / simple JWT                    | Clerk, Auth0                       |
| Email        | Resend or SendGrid                          | Mailgun, Nodemailer                |
| File Storage | Cloudinary (wishlist images)                | S3, Uploadcare                     |
| Hosting      | Vercel (Next.js)                            | Netlify, Railway, Render           |
| Domain       | Custom domain required (couple to purchase) | Namecheap, Google Domains, Porkbun |

### 6.2 Critical: Concurrency Safety

Both the wishlist reservation and RSVP submission are subject to race conditions (two guests submitting at the same millisecond). The developer **must** use database-level atomic operations:

**For Wishlist:**

```sql
-- Atomic increment with guard
UPDATE wishlist_items
SET reserved_count = reserved_count + 1
WHERE id = $item_id
  AND reserved_count < max_quantity
RETURNING *;
-- If 0 rows returned → item was just fully claimed; reject the request.
```

**For RSVP:**

```sql
-- Atomic increment with guard
UPDATE rsvp_groups
SET confirmed_count = confirmed_count + $party_size
WHERE id = $group_id
  AND (confirmed_count + $party_size) <= max_capacity
RETURNING *;
-- If 0 rows returned → group capacity exceeded; reject with user-friendly error.
```

Do **not** rely on application-level read-then-write checks. Use database transactions or `SELECT FOR UPDATE`.

### 6.3 Security Requirements

- Admin routes protected by authentication middleware. No guest-accessible admin endpoints.
- RSVP group codes (if used): hashed or compared server-side. Never exposed in client-side code.
- Rate limiting on form submissions (max 5 submissions per IP per 10 minutes) to prevent spam.
- Email addresses stored; treat as PII. Do not expose guest emails in any public-facing response.
- Cancellation/edit links use signed tokens (e.g. JWT with expiry or UUID stored in DB). They cannot be guessed or enumerated.
- HTTPS enforced on all routes.
- Environment variables for all secrets (DB connection, email API keys, admin credentials). Never hardcoded.

### 6.4 Performance

- Target Lighthouse score ≥ 90 on mobile.
- Wishlist page should load in < 2 seconds on 4G.
- Images served in WebP with lazy loading.
- RSVP and wishlist pages may be statically generated with revalidation (ISR) or server-rendered — avoid full client-side fetching for initial load.

### 6.5 Mobile Requirements

- All pages fully usable on screens ≥ 320px wide.
- Touch targets (buttons, inputs) minimum 44×44px.
- Modals scrollable on small screens.
- RSVP form works without horizontal scrolling.

---

## 7. Data & Privacy

- Guest data (names, emails, phone numbers) used only for the wedding. Not sold or shared.
- A brief privacy notice on the RSVP/Wishlist page: "Your info is used only to manage your RSVP and gift reservation."
- Admin should have the ability to export and delete all guest data (for GDPR-lite compliance).
- Retain data until at least 3 months post-wedding, then the couple can delete everything.

---

## 8. Design & Branding Requirements

### 8.1 Identity & Hashtag

Wedding hashtag: **#TheSweetUnion**. This phrase should inform every design decision — warmth, intimacy, and a sense of something that was quietly building for a long time before it arrived. The site should feel rich and grounded, not flashy or over-produced. Think warm Sunday afternoon, homemade cake, people who've known each other for years finally celebrating something they all saw coming.

### 8.2 Colour Palette

| Role                        | Name            | Hex       |
| --------------------------- | --------------- | --------- |
| Primary accent              | Amber gold      | `#C8852A` |
| Strong accent / CTA buttons | Deep terracotta | `#8B3A2A` |
| Supporting warmth           | Burnt sienna    | `#A0522D` |
| Page background             | Warm cream      | `#FAF3E0` |
| Card surfaces               | Off-white linen | `#F0E6D3` |
| Body text                   | Deep espresso   | `#2C1A0E` |

Avoid pure black (`#000000`) and pure white (`#FFFFFF`) — everything should feel warm, never clinical.

### 8.3 Typography

| Role                          | Font                                         | Style                                 |
| ----------------------------- | -------------------------------------------- | ------------------------------------- |
| Couple's names / hero display | Cormorant Upright or Playfair Display Italic | Elegant flowing script-adjacent serif |
| Section headings              | Lora or DM Serif Display                     | Bold warm serif                       |
| Body / UI text                | Crimson Pro                                  | Clean, readable, warm                 |

All fonts available on Google Fonts. Use font weights intentionally — don't bold everything. Let the display font do the heavy lifting in hero sections.

### 8.4 Texture & Atmosphere

- Apply a subtle linen or paper grain texture overlay on background sections — opacity 5–10%, enough to feel tactile without distraction.
- Delicate botanical line-art accents (thin ink-style illustrations of florals or leaves) may be used as section dividers or card decorations. Not clipart — think a single sprig, a loose wreath, a simple branch. These should be SVG or high-res PNG with transparent backgrounds.
- Rounded corners on cards and modals (8–12px border radius). Nothing sharp or corporate.
- Soft warm shadows on cards: `box-shadow: 0 4px 24px rgba(44, 26, 14, 0.08)`.

### 8.5 Motion & Interactions

- Smooth page transitions (fade or soft slide).
- Cards lift slightly on hover (`transform: translateY(-3px)`, gentle shadow increase).
- Modals fade in with a subtle scale-up (`opacity 0→1`, `scale 0.97→1`, 200ms ease).
- No aggressive animations — the mood is calm and warm, not energetic.

### 8.6 General Rules

- No stock photos of random couples — all images supplied by the actual couple.
- Consistent spacing using an 8px base grid.
- The hashtag **#TheSweetUnion** appears in the hero section and footer — styled in the display font, understated.
- Mobile-first. Every component designed for 375px screen width first, then scaled up.

---

## 9. Content Requirements (Couple-Supplied)

Before development begins, the couple must provide:

| Item                                                                            | Required By |
| ------------------------------------------------------------------------------- | ----------- |
| Wedding date & time                                                             | Week 1      |
| Venue name, address, Google Maps link                                           | Week 1      |
| Couple's names (as they should appear)                                          | Week 1      |
| Hero photo(s)                                                                   | Week 1      |
| Our Story copy (guided by "Long Game" or "Confessions" format, under 200 words) | Week 2      |
| Event schedule (ceremony time, reception time, etc.)                            | Week 2      |
| RSVP group names, capacity limits, and seating notes                            | Week 2      |
| Custom domain name (to be purchased by couple)                                  | Week 1      |
| Wishlist items (name, description, price, image, link, max quantity)            | Week 2–3    |
| RSVP cutoff date                                                                | Week 2      |
| Admin email address (for notifications)                                         | Week 1      |

---

## 10. Milestones & Suggested Build Order

| Phase       | Deliverable                                            | Suggested Timeline |
| ----------- | ------------------------------------------------------ | ------------------ |
| **Phase 1** | Project setup, DB schema, admin auth                   | Days 1–3           |
| **Phase 2** | Home page (static content)                             | Days 4–6           |
| **Phase 3** | Wishlist page + reservation API + concurrency handling | Days 7–12          |
| **Phase 4** | RSVP page + group RSVP API + capacity enforcement      | Days 13–18         |
| **Phase 5** | Email notifications (all triggers)                     | Days 19–21         |
| **Phase 6** | Admin dashboard (RSVP & wishlist management)           | Days 22–28         |
| **Phase 7** | Mobile QA, performance audit, security review          | Days 29–31         |
| **Phase 8** | Staging deploy, couple reviews & approves content      | Days 32–35         |
| **Phase 9** | Production deploy, DNS setup, smoke testing            | Day 36             |

---

## 11. Resolved Decisions

All open questions from v1.0 have been answered by the couple. Recorded here for developer reference.

| #   | Question                               | Decision                                                                                                                                                          |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Will RSVP groups use access codes?     | No codes. Each group gets a unique registration link instead. Links are embedded in personalised invitation cards sent via WhatsApp and email.                    |
| 2   | Should RSVP groups be listed publicly? | No. Groups are internal only. Guests arrive via their unique link and never see a group name or list. Groups are used for seating placement and crowd management. |
| 3   | Decline RSVP handling                  | Declines are fully tracked. Admin can see who declined, with their optional message.                                                                              |
| 4   | Wishlist reservation visibility        | Show "Reserved by [N] people" on each item card.                                                                                                                  |
| 5   | Wishlist external links                | Items optionally link to a purchase page (opens in new tab). Items without a link (cash gifts, bank transfer, etc.) show only the reserve button.                 |
| 6   | Multiple RSVPs from same email         | Blocked site-wide. One email = one RSVP, regardless of group. Guest is shown a friendly message pointing them to their confirmation email.                        |
| 7   | Custom domain                          | Yes. The couple will purchase a custom domain. Developer to handle DNS setup and SSL configuration as part of Phase 9.                                            |
| 8   | Admin accounts                         | One shared admin account for the couple. No separate logins needed.                                                                                               |

---

_This PRD is a living document. Updates should be versioned and communicated to the development team before implementation of the affected section begins._
