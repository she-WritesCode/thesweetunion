import {
  defineCollection,
  defineTab,
  defineRelationshipField,
  defineTextField,
  defineSelectField,
  defineNumberField,
  defineDateField,
  defineDateTimeField,
  // ── Detail View Primitives ──
  displayGrid,
  displayField,
  displayDivider,
  displaySection,
} from "@dyrected/core";
import { reserveItem, releaseReservation } from "../hooks/reservation-hooks.ts";

export const reservations = defineCollection({
  slug: "reservations",
  labels: { singular: "Reservation", plural: "Reservations" },
  admin: {
    icon: "Gift",
    useAsTitle: "guestName",
    components: {
      beforeListTable: ["WishlistListSummary"],
    },
    defaultColumns: ["guestName", "item", "intent", "paymentTiming", "reminderAt", "reservedAt"],
    group: "Wishlist",
  },
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
      ],
    }),
  ],
  // ── 📱 High-Density Compact Detail View ──────────────────────────────────────
  detail: [
    // ── 1. Top Intent & Operational Status Strip (Compact 4-column grid) ─────
    displayGrid(4, [
      displayField("intent", {
        display: "badge",
        badgeColors: {
          reserve: "indigo",
          contribute: "purple",
          reminder: "amber",
        },
        label: "Guest Intent",
        editable: true,
      }),
      displayField("paymentTiming", {
        display: "badge",
        badgeColors: { now: "emerald", later: "amber" },
        label: "Payment Timing",
        editable: true,
      }),
      displayField("paymentOption", {
        display: "badge",
        badgeColors: {
          bank_transfer: "blue",
          purchase_link: "teal",
          bring_to_wedding: "purple",
        },
        label: "Payment Method",
        emptyText: "Not Specified",
        editable: true,
      }),
      displayField("item", {
        label: "Wishlist Item",
      }),
    ]),

    displayDivider({ spacing: "sm" }),

    // ── 2. Financial Contribution & Quantity Hub (3-column grid) ─────────────
    displayGrid(3, [
      displayField("contributionAmount", {
        display: "currency",
        currency: "NGN",
        label: "Contribution Amount",
        emptyText: "Full Gift Reservation",
        editable: true,
      }),
      displayField("quantity", {
        label: "Quantity Reserved",
        editable: true,
      }),
      displayField("reservedAt", {
        display: "relative",
        label: "Reservation Placed",
      }),
    ]),

    displayDivider({ spacing: "md" }),

    // ── 3. Scheduled Reminder & Guest Contact Subsystem (Card Section) ───────
    displaySection(
      "Reminder & Follow-up Details",
      [
        displayGrid(3, [
          displayField("reminderAt", {
            display: "date",
            label: "Reminder Date",
            emptyText: "No reminder scheduled",
            editable: true,
          }),
          displayField("reminderChannel", {
            display: "badge",
            badgeColors: { whatsapp: "emerald", email: "sky" },
            label: "Channel",
            emptyText: "None",
            editable: true,
          }),
          displayField("reminderContact", {
            label: "Reminder Contact",
            emptyText: "None",
            editable: true,
          }),
        ]),
      ],
      {
        span: 12,
        icon: "Bell",
      },
    ),
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
    update: "user != null",
    delete: "user != null",
  },
  hooks: {
    beforeChange: [reserveItem as any],
    afterDelete: [releaseReservation as any],
  },
});
