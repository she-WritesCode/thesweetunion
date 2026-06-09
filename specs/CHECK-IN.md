# Check-in (QR Scanning) — Implementation Spec

**Version:** 1.1  
**Status:** Ready for Development  
**Extends:** PRD.md Section 3.3 (RSVP), Section 5 (Admin Dashboard)  
**Audience:** Frontend & Backend Developers

---

## 1. Overview

The Check-in system allows event staff to scan QR codes at the entrance, instantly identify guests, record their arrival, and display their seating information. The QR code encodes the guest's `rsvp_record_id`, which is looked up to display guest details and table assignment.

**Flow:**
```
Guest Shows QR Code → Staff Scans → System Looks Up RSVP → Display Guest Info + Table → Record Check-in → Welcome!
```

---

## 2. User Stories

| # | Story | Priority |
|---|-------|----------|
| CK-1 | As staff, I want to scan a guest's QR code at the entrance using the admin dashboard. | Must |
| CK-2 | As staff, I want to instantly see the guest's name, table number, and party details after scanning. | Must |
| CK-3 | As staff, I want the system to record the check-in time automatically (via `createdAt`). | Must |
| CK-4 | As staff, I want to see a "Welcome [Guest Name], you're at Table [X]!" message on screen after scan. | Must |
| CK-5 | As staff, I want to see a live check-in counter (X of Y guests checked in). | Should |
| CK-6 | As staff, I want to handle walk-ins (guests without QR codes) via manual search. | Should |
| CK-7 | As staff, I want to see if a QR code has already been scanned (duplicate scan warning). | Must |

---

## 3. Data Models

### 3.1 CheckIn (New Collection)

```
CheckIn {
  id:            UUID
  rsvpRecord:    UUID (FK → RSVPRecord)
  event:         UUID (FK → Events)          // which event (ceremony, reception)
  guestName:     string                      // denormalized
  tableLabel:    string                      // denormalized
  partySize:     integer                     // denormalized
  scannedBy:     string                      // staff identifier (optional)
  notes:         string                      // staff notes (e.g., "arrived late")
  createdAt:     timestamp                   // auto-generated check-in time
}
```

### 3.2 Updated RSVPRecord

```
RSVPRecord {
  // ... existing fields
  seatAssignment: UUID (FK → SeatAssignment)  // link to seating
  invitation:     UUID (FK → Invitation)      // link to invitation
  checkIn:        UUID (FK → CheckIn)         // NEW: link to check-in record
  checkedIn:      boolean                     // NEW: quick check-in flag
}
```

---

## 4. Scanner UI

**Route:** `/admin/check-in` (custom admin page)

**Layout:**

```
┌─────────────────────────────────────────────┐
│ 📱 QR Scanner                               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │   [Camera View / Scanner Input]     │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Or enter code manually: [________] [Scan]  │
│                                             │
├─────────────────────────────────────────────┤
│ 📊 Live Stats                              │
│ Checked in: 47 / 120 guests               │
│ ████████████░░░░░░░░░░░ 39%               │
├─────────────────────────────────────────────┤
│ ✅ Last Check-in                           │
│ Guest: Adeola Okafor + Funmi Okafor        │
│ Table: Table 3                             │
│ Time: 14:32                                │
│ Status: Welcome! 🎉                        │
└─────────────────────────────────────────────┘
```

---

## 5. Scanner Implementation

**Camera or Manual Fallback:**

| Mode | How It Works |
|------|-------------|
| **Camera** | Use `getUserMedia` + `html5-qrcode` library — scans QR from phone screen or printed card |
| **Manual** | Staff types/pastes the QR code value (rsvp_record_id) into input field |

Staff toggles between camera and manual input. Camera is default; manual is fallback if camera fails or guest has no QR.

---

## 6. Check-in Flow

```
1. Staff opens /admin/check-in
2. Camera activates (or manual input available)
3. Guest shows QR code (on phone or printed card)
4. Camera scans QR → extracts rsvp_record_id
5. System looks up RSVP record:
   a. Found: display guest info + table assignment
   b. Not found: "Invalid QR code"
   c. Already checked in: "Guest already checked in at [createdAt]"
6. System creates CheckIn record:
   - rsvpRecord: id
   - event: id (selected by staff)
   - scannedBy: staff identifier (optional)
7. System updates RSVPRecord:
   - checkIn: new CheckIn record id
   - checkedIn: true
8. Display: "Welcome [Guest Name]! You're at Table [X]"
```

---

## 7. Duplicate Scan Handling

- If same QR scanned again: show warning "Already checked in at [createdAt]"
- No override feature — staff directs guest to the couple if there's an issue

---

## 8. Walk-in Handling

- Staff clicks "Manual Check-in"
- Search by name or phone
- If found: show guest info, create check-in record
- If not found: "Guest not found. Please contact the couple."

---

## 9. Custom Admin Page

### 9.1 Check-in Scanner

**File:** `pages/admin/check-in.vue`

**Components:**
- `QRScanner.vue` — Camera/manual input scanner
- `ScanResult.vue` — Guest info display after scan
- `CheckInStats.vue` — Live counter

**Libraries:**
- `html5-qrcode` — Browser-based QR scanning

---

## 10. API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/check-in/scan` | Record QR scan, return guest info |
| GET | `/api/check-in/stats` | Live check-in counter |
| GET | `/api/check-in/manifest` | List all guests with check-in status |

---

## 11. Hooks & Data Integrity

### 11.1 CheckIn — beforeChange

```typescript
export const validateCheckIn: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation === "create") {
    const rsvp = await req.db.findByID({ collection: "rsvp_records", id: data.rsvpRecord });
    if (!rsvp) throw new Error("Guest not found");

    // Check duplicate check-in
    if (rsvp.checkedIn && rsvp.checkIn) {
      const existingCheckIn = await req.db.findByID({ collection: "check_ins", id: rsvp.checkIn });
      throw new Error(`Guest already checked in at ${existingCheckIn.createdAt}`);
    }

    // Denormalize
    data.guestName = rsvp.has_spouse ? `${rsvp.lead_name} + ${rsvp.spouse_name}` : rsvp.lead_name;
    data.partySize = rsvp.has_spouse ? 2 : 1;

    // Get table label from seat assignment
    if (rsvp.seatAssignment) {
      const assignment = await req.db.findByID({ collection: "seat_assignments", id: rsvp.seatAssignment });
      const table = await req.db.findByID({ collection: "tables", id: assignment.table });
      data.tableLabel = table.label;
    }

    // Update RSVP record
    await req.db.update({
      collection: "rsvp_records",
      id: data.rsvpRecord,
      data: { checkIn: data.id || "pending", checkedIn: true }
    });
  }
  return data;
};
```

### 11.2 CheckIn — afterDelete

```typescript
export const clearCheckIn: CollectionAfterDeleteHook = async ({ doc, req }) => {
  // Clear RSVP record check-in
  await req.db.update({
    collection: "rsvp_records",
    id: doc.rsvpRecord.id || doc.rsvpRecord,
    data: { checkIn: null, checkedIn: false }
  });
};
```

---

## 12. Collections Summary

### 12.1 New Collections

| Collection | Slug | Purpose |
|------------|------|---------|
| CheckIn | `check_ins` | QR code scan/check-in records |

### 12.2 Updated Collections

| Collection | New Fields |
|------------|------------|
| RSVPRecord | `checkIn`, `checkedIn` |

---

## 13. Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `html5-qrcode` | Browser QR scanner | ^2.3.8 |

---

## 14. Edge Cases

| Scenario | Handling |
|----------|----------|
| Guest shows QR on phone with cracked screen | Staff enters code manually |
| Guest has no phone (printed card) | Scan printed QR code |
| Guest lost invitation | Manual search by name |
| Multiple events (ceremony + reception) | Select event before scan |
| Staff scans same code twice | Warning: "Already checked in at [createdAt]" |
| Guest arrives after event started | Normal check-in, add note if needed |

---

## 15. Success Metrics

| Metric | Target |
|--------|--------|
| Check-in scan time | < 2 seconds per guest |
| Duplicate scan detection | 100% accuracy |
| Camera scan success rate | > 90% (lighting dependent) |
| Live counter update speed | < 500ms |

---

_This spec extends PRD.md._
