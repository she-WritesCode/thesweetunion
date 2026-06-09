# Seating Arrangement — Implementation Spec

**Version:** 1.0  
**Status:** ⏸️ On Hold — Pending brainstorming session  
**Extends:** PRD.md Section 3.3 (RSVP), Section 5 (Admin Dashboard)  
**Audience:** Frontend & Backend Developers

---

> **⚠️ NOT APPROVED:** This feature has not been approved for implementation. It is on hold pending a brainstorming session to revisit the approach. Do not implement until status changes to "Ready for Development".

---

## 1. Overview

This spec covers the seating arrangement feature that allows the event planner to assign confirmed guests to physical tables at the venue. After RSVP closes, the planner uses a visual drag-and-drop interface to arrange guests, ensuring groups sit together and capacity is never exceeded.

**Flow:**
```
RSVP Closes → Seating Arrangement → Lock Seating → Send Invitations
```

**Related Specs:**
- [`specs/INVITATIONS.md`](./INVITATIONS.md) — Send access cards via WhatsApp/Email (uses Live Preview on RSVP records)
- [`specs/CHECK-IN.md`](./CHECK-IN.md) — Scan QR codes at event entry

---

## 2. User Stories

| # | Story | Priority |
|---|-------|----------|
| SA-1 | As a planner, I want to see all confirmed guests in an "Unseated" sidebar grouped by RSVP group, so I can seat friends together. | Must |
| SA-2 | As a planner, I want to create tables with a label, shape (round/rectangular), and capacity, so I can match the venue floor plan. | Must |
| SA-3 | As a planner, I want to drag guests/groups from the sidebar onto tables, so I can visually arrange seating. | Must |
| SA-4 | As a planner, I want the system to enforce table capacity, so I never over-seat a table. | Must |
| SA-5 | As a planner, I want parties (lead + spouse) to stay together at the same table, never split across tables. | Must |
| SA-6 | As a planner, I want to pre-assign special tables (Sweetheart, Parents, VIP) that lock from auto-assign. | Must |
| SA-7 | As a planner, I want an "Auto-seat remaining" button that fills tables optimising group togetherness. | Should |
| SA-8 | As a planner, I want to export seating as CSV (for venue), PDF place cards (for printing), and JSON (backup). | Must |
| SA-9 | As a planner, I want to see a visual floor plan with tables as circles/rects, colour-coded by occupancy. | Should |
| SA-10 | As a planner, I want to reassign or remove a seated guest with one click. | Must |
| SA-11 | As a planner, I want a buffer seats option per table (e.g., seat 8 at a 10-capacity table). | Should |

---

## 3. Data Models

### 3.1 Table (New Collection)

```
Table {
  id:            UUID
  label:         string        // "Table 1", "Sweetheart Table", "Family A"
  shape:         'round' | 'rectangular' | 'square'
  capacity:      integer       // max seats (e.g., 8, 10, 12)
  x:             number        // canvas X position (pixels from left)
  y:             number        // canvas Y position (pixels from top)
  rotation:      number        // degrees (default: 0, for rectangular tables)
  category:      'standard' | 'family' | 'vip' | 'accessible' | 'sweetheart' | 'head'
  notes:         string        // internal: "near dance floor", "wheelchair access"
  assignedCount: integer       // computed: sum of partySize for all assignments (default: 0)
  createdAt:     timestamp
  updatedAt:     timestamp
}
```

### 3.2 SeatAssignment (New Collection)

```
SeatAssignment {
  id:            UUID
  table:         UUID (FK → Table)
  rsvpRecord:    UUID (FK → RSVPRecord)    // the lead guest
  seatNumber:    integer       // 1..capacity (position at table)
  guestName:     string        // denormalized: "Lead Name" or "Lead + Spouse Name"
  partySize:     integer       // 1 or 2 (from RSVPRecord.has_spouse)
  groupId:       UUID          // denormalized from RSVPRecord.group
  groupName:     string        // denormalized from RSVPGroup.name
  dietaryNotes:  string        // denormalized from RSVPRecord.dietary_notes
  assignedAt:    timestamp
  assignedBy:    string        // admin user identifier
}
```

### 3.3 Updated RSVPRecord

```
RSVPRecord {
  // ... existing fields
  seatAssignment: UUID (FK → SeatAssignment)  // NEW: link to seating
}
```

### 3.4 Updated RSVPGroup

```
RSVPGroup {
  // ... existing fields
  seatingComplete: boolean     // NEW: all members seated?
}
```

### 3.5 Updated SiteSettings

```
SiteSettings {
  // ... existing fields
  seatingEnabled: boolean   // NEW: show seating manager in admin
}
```

---

## 4. Admin UI — Seating Manager

**Route:** `/admin/seating` (custom admin page)

**Layout:** Two-pane view

### 4.1 Left Pane — Unseated Guests

```
┌─────────────────────────────────────────────┐
│ 🔍 Search guests...                         │
│ ▼ Filter: [All Groups ▼] [Unseated]         │
├─────────────────────────────────────────────┤
│ 📁 Church Friends (8 unseated)             │
│   ├─ Ade + Funmi (2) 🟢                    │
│   ├─ Tunde (1) 🟢                          │
│   └─ Bola + Chidi (2) 🟢                   │
│ 📁 Work Colleagues (4 unseated)            │
│   ├─ Sarah (1) 🟢                          │
│   └─ Mike + Lisa (2) 🟢                    │
│ 🟢 = ready to seat  🟡 = partial            │
└─────────────────────────────────────────────┘
```

- Guests are grouped by RSVP group
- Each guest shows party size (1 or 2)
- Drag handle on each guest/group
- "Select All" and "Auto-seat Selected" buttons

### 4.2 Right Pane — Visual Table Canvas

- Zoomable/pannable SVG or Canvas grid
- Tables rendered as circles (round) or rectangles with seat markers
- Colour coding: 🟢 empty seats, 🟡 partial, 🔴 full
- Hover table → tooltip: "Table 3 · 6/8 seated · Church Friends (4), Family (2)"
- Click table → shows seated guests list with edit/remove options
- Drag guest from left → drop on table → assigns to next available seat(s)

### 4.3 Table Toolbar

- **Add Table** — modal: label, shape, capacity, category, position
- **Duplicate Table** — copy with incremented label
- **Auto-Layout** — arrange tables in grid/circle around dance floor
- **Export** — PDF (place cards), CSV (venue), JSON (backup)
- **Lock Seating** — freeze all assignments (prevent changes)

---

## 5. Auto-Seat Algorithm

```
function autoSeatRemaining():
  1. Sort unseated guests by group size (largest first)
  2. For each group:
     a. Find tables with enough remaining capacity
     b. Prefer tables already containing members of same group
     c. If no same-group table, find any table with capacity
     d. Assign party to table
  3. Repeat until all seated or no tables have capacity
  4. Return proposed assignments for review before commit
```

---

## 6. Seating Lock Rules

- Seating can only be opened after RSVP cutoff (configurable)
- Once locked, no assignments can be changed
- Locking generates invitation QR codes automatically
- Unlocking requires confirmation and re-generates QR codes

---

## 7. Custom Admin Page

### 7.1 Seating Manager

**File:** `pages/admin/seating.vue`

**Components:**
- `SeatingCanvas.vue` — SVG/Canvas table renderer with drag-drop
- `UnseatedGuests.vue` — Grouped guest list sidebar
- `TableEditor.vue` — Modal for adding/editing tables
- `SeatAssignments.vue` — Table detail view (seated guests)

**State Management:**
- Tables fetched via `useDyrectedCollection('tables')`
- Assignments fetched via `useDyrectedCollection('seat_assignments')`
- Unseated guests computed: RSVP records with `attending=true` AND no `seatAssignment`

---

## 8. API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/seating/assign` | Assign guest to table (with validation) |
| DELETE | `/api/seating/unassign/:id` | Remove assignment |
| POST | `/api/seating/auto-assign` | Auto-seat remaining guests |
| POST | `/api/seating/lock` | Lock all assignments |
| GET | `/api/seating/export/:format` | Export as CSV/PDF/JSON |

---

## 9. Hooks & Data Integrity

### 9.1 SeatAssignment — beforeChange

```typescript
export const validateSeatAssignment: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation === "create") {
    // 1. Check party integrity (lead + spouse must be together)
    const rsvp = await req.db.findByID({ collection: "rsvp_records", id: data.rsvpRecord });
    if (!rsvp.attending) throw new Error("Guest has not RSVP'd as attending");
    if (rsvp.seatAssignment) throw new Error("Guest is already seated");

    // 2. Check table capacity
    const table = await req.db.findByID({ collection: "tables", id: data.table });
    const currentAssignments = await req.db.find({
      collection: "seat_assignments",
      where: { table: { equals: data.table } }
    });
    const totalSeats = currentAssignments.docs.reduce((sum, a) => sum + a.partySize, 0) + data.partySize;
    if (totalSeats > table.capacity) {
      throw new Error(`Table "${table.label}" would exceed capacity (${totalSeats}/${table.capacity})`);
    }

    // 3. Check seat number availability
    const seatTaken = currentAssignments.docs.some(a => a.seatNumber === data.seatNumber);
    if (seatTaken) throw new Error(`Seat ${data.seatNumber} at "${table.label}" is already taken`);

    // 4. Denormalize fields
    data.guestName = rsvp.has_spouse ? `${rsvp.lead_name} + ${rsvp.spouse_name}` : rsvp.lead_name;
    data.partySize = rsvp.has_spouse ? 2 : 1;
    data.groupId = rsvp.group;
    data.dietaryNotes = rsvp.dietary_notes;
    const group = await req.db.findByID({ collection: "rsvp_groups", id: rsvp.group });
    data.groupName = group.name;

    // 5. Update RSVP record
    await req.db.update({
      collection: "rsvp_records",
      id: data.rsvpRecord,
      data: { seatAssignment: data.id || "pending" }
    });

    // 6. Increment table assignedCount
    await req.db.update({
      collection: "tables",
      id: data.table,
      data: { assignedCount: { $increment: data.partySize } }
    });
  }
  return data;
};
```

### 9.2 SeatAssignment — afterDelete

```typescript
export const releaseSeat: CollectionAfterDeleteHook = async ({ doc, req }) => {
  // 1. Decrement table assignedCount
  await req.db.update({
    collection: "tables",
    id: doc.table.id || doc.table,
    data: { assignedCount: { $decrement: doc.partySize } }
  });

  // 2. Clear RSVP record link
  await req.db.update({
    collection: "rsvp_records",
    id: doc.rsvpRecord.id || doc.rsvpRecord,
    data: { seatAssignment: null, checkedIn: false, checkedInAt: null }
  });
};
```

---

## 10. Collections Summary

### 10.1 New Collections

| Collection | Slug | Purpose |
|------------|------|---------|
| Table | `tables` | Physical tables at the venue |
| Seat Assignment | `seat_assignments` | Guest-to-table links |

### 10.2 Updated Collections

| Collection | New Fields |
|------------|------------|
| RSVPRecord | `seatAssignment` |
| RSVPGroup | `seatingComplete` |
| SiteSettings | `seatingEnabled` |

### 10.3 Related Collections (Other Specs)

| Collection | Spec | Purpose |
|------------|------|---------|
| CheckIn | [`specs/CHECK-IN.md`](./CHECK-IN.md) | QR scan/check-in records |
| RSVPRecord (invitation fields) | [`specs/INVITATIONS.md`](./INVITATIONS.md) | `invitationSent`, `invitationSentAt`, `invitationSentVia` |

---

## 11. Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `@dnd-kit/core` | Drag-and-drop (already in admin) | ^6.3.1 |
| `@dnd-kit/sortable` | Sortable lists (already in admin) | ^10.0.0 |

---

## 12. Workflow — End to End

```
1. RSVP CUTOFF
   └─> Admin clicks "Open Seating Manager"

2. DEFINE TABLES
   └─> Add tables matching venue floor plan (capacity, shape, position)

3. PRE-ASSIGN SPECIAL TABLES
   └─> Sweetheart, parents, VIP, accessible

4. AUTO-ASSIGN OR MANUAL DRAG-DROP
   └─> Seat remaining guests by group

5. REVIEW & ADJUST
   └─> Check group togetherness, capacity, special needs

6. LOCK SEATING
   └─> Freeze assignments

7. SEND INVITATIONS (see specs/INVITATIONS.md)
   └─> Use Live Preview on RSVP records to preview cards
   └─> Send via WhatsApp/Email (single or bulk)

8. EVENT DAY (see specs/CHECK-IN.md)
   └─> Staff scans QR codes at entrance
   └─> Guest info + table displayed on screen
   └─> Live check-in counter
```

---

## 13. Edge Cases

| Scenario | Handling |
|----------|----------|
| Guest RSVPs after seating opened | Appear in unseated pool with 🔔 badge |
| Guest declines after seating | Auto-remove from table, decrement assignedCount |
| Guest edits RSVP (add spouse) | Warning: "This guest is seated. Update seating?" |
| Table deleted with assignments | Require reassignment confirmation |
| Multiple events (ceremony + reception) | Different seating per event, or same seating |

---

## 14. Success Metrics

| Metric | Target |
|--------|--------|
| Seating completed in | < 30 minutes for 120 guests |
| Data integrity violations | 0 (no over-seating, no split parties) |

---

_This spec extends PRD.md. Implementation should follow the milestones in Section 10 of the PRD, with Seating as Phase 5.5 (after email notifications, before admin dashboard polish)._

_Related specs: [`specs/INVITATIONS.md`](./INVITATIONS.md), [`specs/CHECK-IN.md`](./CHECK-IN.md)_
