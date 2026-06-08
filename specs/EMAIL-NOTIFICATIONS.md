# Email Notifications — Implementation Spec

**Status:** Partially implemented  
**Transport:** Nodemailer + Gmail (`dyrected/mailer.ts`)  
**Templates:** `dyrected/emails.ts`

| # | Email | Status |
|---|---|---|
| 1 | RSVP Submitted — Guest | ✅ Implemented |
| 2 | RSVP Edited — Guest | ✅ Implemented |
| 3 | RSVP Cancelled — Guest | ✅ Implemented |
| 4 | New RSVP — Admin | ✅ Implemented |
| 5 | Gift Reserved — Guest | ⏳ Pending wishlist reserve route |
| 6 | Gift Reservation Cancelled — Guest | ⏳ Pending wishlist cancel route |
| 7 | New Gift Reserved — Admin | ⏳ Pending wishlist reserve route |

---

## Triggers & Content

### 1. RSVP Submitted — Guest Confirmation

**Trigger:** Successful POST to `/api/rsvp/submit`  
**Recipient:** `leadEmail`  
**Subject:** `You're on the list, [leadName]! 🎉` / `We've noted your response, [leadName]`

**Body (attending = true):**
- Couple's names and wedding date
- List of events the guest selected (from `selectedEvents`)
- Spouse name if `hasSpouse = true`
- A unique **Edit My RSVP** link: `[domain]/rsvp?token=[editToken]`
- Note that their personal invitation card will follow closer to the date
- Couple's contact info for questions

**Body (attending = false):**
- Warm acknowledgement that they won't be able to make it
- Short message from the couple
- No edit link needed (declines can still be updated via the same token if they change their mind)

---

### 2. RSVP Edited — Guest Update Confirmation

**Trigger:** Successful PATCH to `/api/rsvp/edit`  
**Recipient:** `leadEmail`  
**Subject:** `Your RSVP has been updated, [leadName]`

**Body:**
- Summary of the updated details (attending status, events, spouse)
- The same **Edit My RSVP** link in case they need to change again
- Cutoff date reminder if one is configured

---

### 3. RSVP Cancelled — Guest Acknowledgement

**Trigger:** Successful DELETE to `/api/rsvp/cancel`  
**Recipient:** Guest email (stored before deletion)  
**Subject:** `Your RSVP has been cancelled`

**Body:**
- Confirmation that their spot has been released
- Invitation to re-RSVP using their original group link if they change their mind
- Couple's contact info

---

### 4. New RSVP — Admin Notification

**Trigger:** Successful POST to `/api/rsvp/submit`  
**Recipient:** All admin accounts in the `admins` Dyrected collection — query `admins` collection at send time and email every record found  
**Subject:** `New RSVP: [leadName] — [attending ? "Attending" : "Declined"]`

**Body:**
- Guest name, email, phone
- Group name
- Attending status
- Party size (solo or with spouse + spouse name)
- Events selected
- Message to couple (if provided)
- Link to admin dashboard record

**Frequency option:** Could be batched into a daily digest instead of per-submission — decision for the couple.

---

### 5. Gift Reserved — Guest Confirmation

**Trigger:** Successful reservation creation in `/api/wishlist/reserve` (to be built)  
**Recipient:** `guestEmail`  
**Subject:** `You've reserved [item name] for Uche & Adun! 🎁`

**Body:**
- Item name, image, and price
- Guest's name and message to couple (if provided)
- A unique **Cancel Reservation** link using a signed token
- Note that the couple will be in touch about collection/delivery

---

### 6. Gift Reservation Cancelled — Guest Acknowledgement

**Trigger:** Successful DELETE to `/api/wishlist/cancel`  
**Recipient:** Guest email  
**Subject:** `Your gift reservation has been cancelled`

**Body:**
- Item name that was released
- Confirmation the spot is now available for others
- Link back to the wishlist if they'd like to choose something else

---

### 7. New Gift Reserved — Admin Notification

**Trigger:** Successful reservation creation  
**Recipient:** All admin accounts in the `admins` Dyrected collection  
**Subject:** `New gift reserved: [item name] by [guestName]`

**Body:**
- Item name and remaining availability (`reservedCount / maxQuantity`)
- Guest name, email, and optional message
- Link to admin dashboard reservation record

---

## Implementation Notes

- All emails use the Resend adapter already wired in `dyrected.config.ts`
- Admin recipients are resolved at send time by querying the `admins` collection — no hardcoded env var needed; adding a new admin in the CMS automatically adds them to all future notifications
- The `editToken` (already generated on RSVP creation) is the edit link token — format: `[domain]/rsvp?token=[editToken]`
- Wishlist cancellation tokens need a `cancelToken` field added to the `reservations` collection (UUID, generated on create)
- Email templates should use the brand colours and fonts defined in the PRD (Section 8)
- All guest-facing emails must include a short privacy note: _"Your details are used only to manage your wedding RSVP. They will not be shared."_
