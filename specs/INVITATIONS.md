# Invitations — Implementation Spec

**Version:** 1.1  
**Status:** Ready for Development  
**Extends:** PRD.md Section 3.3 (RSVP), Section 5 (Admin Dashboard)  
**Audience:** Frontend & Backend Developers

---

## 1. Overview

The Invitation system allows the event planner to send branded access cards with QR codes to guests via WhatsApp and/or email. Instead of a separate collection, invitations are generated using Dyrected's **Live Preview** on the RSVP record — the admin sees a preview of the access card directly in the RSVP detail view, then sends it with one click.

**Flow:**
```
Admin Opens RSVP Record → Live Preview Shows Access Card → Click "Send WhatsApp" → Guest Receives Card
```

---

## 2. User Stories

| # | Story | Priority |
|---|-------|----------|
| INV-1 | As a planner, I want to see a live preview of the access card on each RSVP record, so I know what the guest will receive. | Must |
| INV-2 | As a planner, I want the QR code on the card to encode the guest's `rsvp_record_id`, so scanning it instantly identifies the guest. | Must |
| INV-3 | As a planner, I want a "Send WhatsApp" button on each RSVP record to send the invitation to one guest. | Must |
| INV-4 | As a planner, I want to send invitations to ALL confirmed guests in bulk from the RSVP list view. | Must |
| INV-5 | As a planner, I want to send invitations to SELECTED guests (by group or individual) in bulk. | Must |
| INV-6 | As a planner, I want to send invitations via WhatsApp (primary) and Email (fallback). | Must |
| INV-7 | As a planner, I want the access card to show: guest name, event name, date, venue, table number, and a "Welcome" message. | Must |
| INV-8 | As a planner, I want to see which guests have had their invitations sent (status indicator on RSVP list). | Must |

---

## 3. Data Models

### 3.1 No New Collection

Invitations are not stored as a separate collection. Instead:

- The **access card image** is generated on-the-fly from RSVP record data using Live Preview
- The **QR code** encodes the `rsvp_record_id` directly
- **Send status** is tracked via a new field on RSVPRecord

### 3.2 Updated RSVPRecord

```
RSVPRecord {
  // ... existing fields
  seatAssignment: UUID (FK → SeatAssignment)  // link to seating
  invitationSent: boolean                      // NEW: has invitation been sent?
  invitationSentAt: timestamp                  // NEW: when was it sent?
  invitationSentVia: 'whatsapp' | 'email'      // NEW: how was it sent?
}
```

---

## 4. Access Card — Live Preview

### 4.1 How It Works

The access card is rendered using Dyrected's **Live Preview** feature on the RSVP record detail view. This means:

- No separate "generate" step — the card is always visible in the admin
- The card is composed from RSVP record data (guest name, table, event details)
- The QR code is generated from the `rsvp_record_id`

### 4.2 Live Preview Component

**File:** `components/admin/AccessCardPreview.vue`

**Props:** Receives RSVP record data + seat assignment + event settings

**Renders:**
```
┌─────────────────────────────────────┐
│                                     │
│        [Couple's Names]             │
│       #TheSweetUnion                │
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │   [Guest Name]                │  │
│  │                               │  │
│  │   Table: [Table Number]       │  │
│  │                               │  │
│  │   [QR Code]                   │  │
│  │   (rsvp_record_id encoded)    │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  White Wedding Ceremony             │
│  [Date] • [Time]                    │
│  [Venue Name]                       │
│  [Address]                          │
│                                     │
│  Welcome to our celebration!        │
│                                     │
│  #TheSweetUnion                     │
│                                     │
└─────────────────────────────────────┘
```

### 4.3 Image Generation

When the admin clicks "Send WhatsApp", the system:

1. Renders the Live Preview component to an image (using `html2canvas` or server-side rendering)
2. Uploads the image to Cloudinary
3. Sends the image via WhatsApp API

---

## 5. WhatsApp Send — Single Guest

### 5.1 Custom Field Button

On each RSVP record in the admin, a custom field renders a "Send WhatsApp" button:

**File:** `components/admin/SendWhatsAppButton.vue`

**Behavior:**
1. Admin clicks "Send WhatsApp"
2. System generates access card image from Live Preview
3. System sends image via WhatsApp API to guest's phone number
4. Updates RSVPRecord: `invitationSent = true`, `invitationSentAt = now`, `invitationSentVia = 'whatsapp'`
5. Button changes to "Sent ✓" (disabled)

### 5.2 WhatsApp API Link

```typescript
// dyrected/services/whatsapp.ts
function getWhatsAppLink(phone: string, imageUrl: string, guestName: string): string {
  // Format phone (Nigerian: +234...)
  const formattedPhone = phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`;
  
  // WhatsApp API URL with pre-filled message
  const message = encodeURIComponent(
    `Hi ${guestName}! 🎉 You're invited to Uche & Adun's wedding.\n\n` +
    `Your access card is attached. Please show this at the entrance.\n\n` +
    `#TheSweetUnion`
  );
  
  return `https://wa.me/${formattedPhone}?text=${message}`;
}
```

**Note:** For image sending, use WhatsApp Business API or Twilio WhatsApp (not the wa.me link, which only supports text). The `wa.me` link is for text-only fallback.

---

## 6. Bulk Send — List View

### 6.1 List View Actions

On the RSVP Records list view in the admin, add bulk actions:

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 RSVP Records                                    [Export] │
├─────────────────────────────────────────────────────────────┤
│ ☐ Select All    ▼ Actions: [Send WhatsApp ▼] [Send Email]  │
├─────────────────────────────────────────────────────────────┤
│ ☐ Ade Okafor    Church Friends  Attending  Table 3  🟢     │
│ ☐ Funmi Okafor  Church Friends  Attending  Table 3  🟢     │
│ ☐ Tunde Bank    Church Friends  Attending  Table 5  🟢     │
│ ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Bulk Send Flow

```
1. Admin selects guests (or "Select All")
2. Admin clicks "Send WhatsApp" or "Send Email"
3. System iterates over selected guests:
   a. Generate access card image from Live Preview
   b. Send via WhatsApp/Email
   c. Update invitationSent flag
4. Progress bar: "Sending 1/47..."
5. Summary: "45 sent, 2 failed (invalid phone)"
```

---

## 7. Email Send

Reuse existing `dyrected/mailer.ts` with a new template:

```typescript
// In dyrected/emails.ts
export function invitationEmail(guestName: string, cardImageUrl: string, tableLabel: string) {
  return `
    <div style="...">
      <h2>You're invited, ${guestName}! 🎉</h2>
      <p>Your access card for the wedding is attached below.</p>
      <img src="${cardImageUrl}" alt="Access Card" style="max-width: 400px;" />
      <p><strong>Your Table:</strong> ${tableLabel}</p>
      <p>Please show this card (or the QR code) at the entrance.</p>
      <p>#TheSweetUnion</p>
    </div>
  `;
}
```

---

## 8. Admin Integration

### 8.1 RSVP Record Detail View

Add to the RSVP record detail view in Dyrected admin:

```typescript
// In dyrected/collections/rsvp-records.ts
fields: [
  // ... existing fields
  {
    name: "accessCardPreview",
    type: "json",
    admin: {
      component: "AccessCardPreview",  // Live preview of the access card
      description: "Preview of the access card that will be sent to this guest",
    },
  },
  {
    name: "sendWhatsApp",
    type: "json",
    admin: {
      component: "SendWhatsAppButton",  // Custom button to send via WhatsApp
      description: "Send access card to guest via WhatsApp",
    },
  },
]
```

### 8.2 RSVP List View

Add bulk actions to the RSVP list view:

```typescript
// Custom admin page or plugin
admin: {
  listActions: [
    { label: "Send WhatsApp", component: "BulkSendWhatsApp" },
    { label: "Send Email", component: "BulkSendEmail" },
  ],
}
```

---

## 9. API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/invitations/send-single/:rsvpId` | Send invitation to one guest |
| POST | `/api/invitations/send-bulk` | Send invitations to multiple guests |
| POST | `/api/invitations/generate-image/:rsvpId` | Generate access card image only |

---

## 10. Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `qrcode` | QR code generation (server-side) | ^1.5.3 |
| `html2canvas` | Client-side image rendering (for Live Preview) | ^1.4.1 |
| `sharp` | Server-side image composition (alternative) | ^0.33.0 |
| `@whatsapp/business-api` or `twilio` | WhatsApp messaging | Latest |

---

## 11. Edge Cases

| Scenario | Handling |
|----------|----------|
| Guest RSVPs after seating | Invitation available immediately (Live Preview works) |
| Guest edits RSVP (name change) | Regenerate access card with new name |
| Guest declines after invitation sent | No check-in allowed (gate at scanner) |
| WhatsApp send fails | Fall back to email |
| Email send fails | Mark as failed, allow retry from RSVP detail |
| Guest lost invitation | Resend from RSVP detail view |

---

## 12. Success Metrics

| Metric | Target |
|--------|--------|
| Access card preview load time | < 1 second |
| Single send time | < 3 seconds |
| Bulk send (120 guests) | < 5 minutes |
| WhatsApp delivery rate | > 95% |
| Email delivery rate | > 98% |

---

_This spec extends PRD.md._
