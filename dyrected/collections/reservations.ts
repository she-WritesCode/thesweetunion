import {
  defineCollection,
  defineTab,
  defineView,
  defineAction,
  defineRelationshipField,
  defineTextField,
  defineSelectField,
  defineNumberField,
  defineDateField,
  defineDateTimeField,
  defineJsonField,
  defineTextareaField,
} from "@dyrected/core";
import { reserveItem, releaseReservation } from "../hooks/reservation-hooks.ts";
import { generalFields } from "./utils.ts";

export const GIFT_STATUS_OPTIONS = [
  { label: "Pending / Pledged ⏳", value: "pending" },
  { label: "Gift Received / Paid ✅", value: "received" },
  { label: "Delivered at Wedding 🎁", value: "delivered" },
  { label: "Cancelled / Released ✕", value: "cancelled" },
];

export const reservations = defineCollection({
  slug: "reservations",
  labels: { singular: "Reservation", plural: "Reservations" },
  admin: {
    icon: "Gift",
    useAsTitle: "guestName",
    components: {
      beforeListTable: ["WishlistListSummary"],
    },
    defaultColumns: ["guestName", "item", "giftStatus", "amountReceived", "intent", "paymentTiming", "reminderAt", "reservedAt"],
    group: "Wishlist",
    features: { duplicate: false, delete: false },
  },
  audit: true,
  detail: false,
  // Operational view carrying the "Manage Gift" and "Send Reminder" row actions
  defaultView: "all_reservations",
  views: [
    defineView({
      slug: "all_reservations",
      label: "All Reservations",
      icon: "Gift",
      layout: "table",
      columns: [
        "guestName",
        "item",
        "giftStatus",
        "amountReceived",
        "intent",
        "paymentTiming",
        "reminderAt",
        "reminderChannel",
        "reminderSentAt",
        "reservedAt",
      ],
      sort: { field: "reservedAt", direction: "desc" },
      features: { duplicate: false, delete: false },
      actions: [
        defineAction({
          name: "manageGift",
          label: "Manage Gift",
          submitLabel: "Done",
          icon: "Gift",
          type: "row",
          fields: [
            defineJsonField({
              name: "manageGiftDialog",
              label: "Manage Gift",
              admin: {
                component: "reservations.manageGift",
                description: "Update fulfillment status, record amount received, add notes, or send a thank you.",
              },
            }),
          ],
          handler: async () => ({ success: true }),
        }),
        defineAction({
          name: "sendReminder",
          label: "Send Reminder",
          submitLabel: "Done",
          icon: "MessageSquare",
          type: "row",
          fields: [
            defineJsonField({
              name: "sendReminderDialog",
              label: "Send Reminder",
              admin: {
                component: "reservations.sendReminder",
                description: "Choose WhatsApp or Email, review and edit the message, then send.",
              },
            }),
          ],
          // The actual send happens inside the custom "reservations.sendReminder"
          // component (it calls /api/reminders/send/[id] directly and stamps
          // reminderSentAt itself) before the admin clicks "Done" — this handler
          // is only here because @dyrected/core requires one, it has nothing left to do.
          handler: async () => ({ success: true }),
        }),
      ],
    }),
  ],
  fields: [
    ...defineTab({
      label: "Details",
      fields: [
        defineRelationshipField({
          name: "item",
          label: "Wishlist Item",
          relationTo: "wishlist_items",
          required: true,
          admin: { width: "50%" },
        }),
        defineTextField({
          name: "guestName",
          label: "Guest Name",
          required: true,
          admin: { width: "50%" },
        }),
        defineSelectField({
          name: "intent",
          label: "Intent",
          required: true,
          options: [
            { label: "Reserve Gift", value: "reserve" },
            { label: "Contribute Now", value: "contribute" },
            { label: "Remind Me Later", value: "reminder" },
          ],
          admin: { width: "50%" },
        }),
        defineSelectField({
          name: "paymentTiming",
          label: "Payment Timing",
          required: true,
          options: [
            { label: "Pay Now", value: "now" },
            { label: "Pay Later", value: "later" },
          ],
          admin: { width: "50%" },
        }),
        defineNumberField({
          name: "contributionAmount",
          label: "Contribution Amount",
          admin: {
            description: "Required for crowdfund items or partial payments (min ₦5,000)",
            width: "50%",
            format: {
              type: "currency",
              currency: "NGN",
            },
          },
        }),
        defineNumberField({
          name: "quantity",
          label: "Quantity Reserved",
          defaultValue: 1,
          admin: {
            description: "Number of items reserved by this guest",
            width: "50%",
          },
        }),
        defineDateField({
          name: "reminderAt",
          label: "Reminder Date",
          admin: {
            width: "50%",
          },
        }),
        defineSelectField({
          name: "reminderChannel",
          label: "Reminder Channel",
          options: [
            { label: "WhatsApp", value: "whatsapp" },
            { label: "Email", value: "email" },
          ],
          admin: { width: "50%" },
        }),
        defineTextField({
          name: "reminderContact",
          label: "Reminder Contact",
          admin: {
            width: "50%",
            description: "Only collected when the guest asks to be reminded later.",
          },
        }),
        defineDateTimeField({
          name: "reminderSentAt",
          label: "Reminder Sent At",
          admin: {
            readOnly: true,
            width: "50%",
            description: "Set automatically once the reminder has gone out.",
          },
        }),
        defineSelectField({
          name: "paymentOption",
          label: "Payment Option",
          options: [
            { label: "Bank Transfer", value: "bank_transfer" },
            { label: "Buy Item Directly", value: "purchase_link" },
            { label: "Bring to Wedding", value: "bring_to_wedding" },
          ],
          admin: { width: "50%" },
        }),
        defineDateTimeField({
          name: "reservedAt",
          label: "Reserved At",
          admin: {
            readOnly: true,
            width: "50%",
          },
        }),
        defineSelectField({
          name: "giftStatus",
          label: "Gift Status",
          defaultValue: "pending",
          options: GIFT_STATUS_OPTIONS,
          admin: { width: "50%" },
        }),
        defineNumberField({
          name: "amountReceived",
          label: "Amount Received",
          admin: {
            description: "Confirmed amount received in Naira (for monetary gifts, crowdfund, or bank transfers).",
            width: "50%",
            format: {
              type: "currency",
              currency: "NGN",
            },
          },
        }),
        defineDateTimeField({
          name: "giftReceivedAt",
          label: "Gift Received At",
          admin: {
            width: "50%",
            description: "Date and time the gift or payment was confirmed.",
          },
        }),
        defineTextareaField({
          name: "giftNotes",
          label: "Gift Notes",
          admin: {
            placeholder: "e.g. Bank transfer verified, or received physical gift at venue...",
            description: "Fulfillment notes, bank reference, or wedding day check-in details.",
          },
        }),
        ...generalFields,
      ],
    }),
  ],
  access: {
    read: "true",
    create: ({ user, req }: any) => {
      if (user != null) return true;
      const apiKeyHeader = req?.headers?.get?.("x-api-key") || req?.headers?.["x-api-key"];
      const authHeader = req?.headers?.get?.("authorization") || req?.headers?.authorization;
      if (apiKeyHeader || (authHeader && authHeader.includes("Bearer "))) return true;
      return false;
    },
    // A plain "user != null" string here rejects our own trusted server routes
    // (server/api/reminders/run.get.ts, server/api/reminders/send/[id].post.ts)
    // when they stamp reminderSentAt — those authenticate with the app's own
    // apiKey, not a logged-in Dyrected user, so `user` is null in that request
    // context. Mirror the same api-key/bearer allowance already used for `create`.
    update: ({ user, req }: any) => {
      if (user != null) return true;
      const apiKeyHeader = req?.headers?.get?.("x-api-key") || req?.headers?.["x-api-key"];
      const authHeader = req?.headers?.get?.("authorization") || req?.headers?.authorization;
      if (apiKeyHeader || (authHeader && authHeader.includes("Bearer "))) return true;
      return false;
    },
    delete: "user != null",
  },
  hooks: {
    beforeChange: [reserveItem as any],
    afterDelete: [releaseReservation as any],
  },
});
