import {
  defineCollection,
  defineTab,
  defineTextField,
  defineEmailField,
  defineBooleanField,
  defineRelationshipField,
  defineSelectField,
  defineJsonField,
  defineTextareaField,
  defineDateField,
  defineNumberField,
  // ── Detail View Primitives ──
  displaySection,
  displayField,
} from "@dyrected/core";
import { enforceRsvpCapacity } from "../hooks/rsvp-hooks.ts";

export const rsvpRecords = defineCollection({
  slug: "rsvp_records",
  labels: { singular: "Guest Response", plural: "Guest Responses" },
  admin: {
    icon: "ReceiptText",
    useAsTitle: "leadName",
    components: {
      beforeListTable: ["RsvpListSummary"],
    },
    defaultColumns: [
      "leadName",
      "group",
      "attending",
      "wantsAsoebi",
      "asoebiPaymentStatus",
      "asoebiOrderStatus",
      "invitationSent",
      "submittedAt",
    ],
    group: "RSVP",
  },
  fields: [
    // ── RSVP Response tab ───────────────────────────────────────────────────
    ...defineTab({
      label: "RSVP Response",
      fields: [
        defineTextField({
          name: "rsvpEditLink",
          label: "RSVP Edit Link",
          admin: {
            readOnly: true,
            description: "Share this link with your guest so they can edit their RSVP.",
            component: "rsvp_groups.rsvpEditLink",
          },
        }),
        defineTextField({ name: "leadName", label: "Full Name", required: true }),
        defineEmailField({
          name: "leadEmail",
          label: "Email",
          required: true,
          unique: true,
          admin: { width: "50%" },
        }),
        defineTextField({
          name: "leadPhone",
          label: "WhatsApp Number",
          required: true,
          admin: { width: "50%" },
        }),
        defineBooleanField({
          name: "hasSpouse",
          label: "Attending with Spouse",
          defaultValue: false,
          admin: { width: "50%" },
        }),
        defineTextField({
          name: "spouseName",
          label: "Spouse Name",
          admin: {
            width: "50%",
            condition: (data) => data.hasSpouse === true,
            description: "Required if attending with spouse",
          },
        }),
        defineBooleanField({
          name: "attending",
          label: "Attending",
          required: true,
          admin: { width: "50%" },
        }),
        defineRelationshipField({
          name: "group",
          label: "Invitation Group",
          relationTo: "rsvp_groups",
          required: true,
          admin: { width: "50%" },
        }),
        defineRelationshipField({
          name: "selectedEvents",
          label: "Events Attending",
          relationTo: "events",
          hasMany: true,
        }),
        defineTextareaField({
          name: "message",
          label: "Message to Couple",
          admin: { placeholder: "Message to the couple (optional)" },
        }),
        defineDateField({
          name: "submittedAt",
          label: "Submitted At",
          admin: { readOnly: true },
        }),
        defineTextField({
          name: "editToken",
          label: "Edit Token",
          admin: { readOnly: true, hidden: true },
        }),
      ],
    }),

    // ── Aso Ebi & Aso Oke tab ───────────────────────────────────────────────
    ...defineTab({
      label: "Aso Ebi / Aso Oke",
      fields: [
        defineBooleanField({
          name: "wantsAsoebi",
          label: "Wants Asoebi Fabric",
          defaultValue: false,
          admin: { width: "50%" },
        }),
        defineSelectField({
          name: "asoebiYards",
          label: "Asoebi Fabric Yards",
          options: [
            { label: "2 Yards (₦20,000)", value: "2" },
            { label: "3 Yards (₦30,000)", value: "3" },
            { label: "4 Yards (₦40,000)", value: "4" },
            { label: "5 Yards (₦50,000)", value: "5" },
            { label: "6 Yards (₦60,000)", value: "6" },
          ],
          admin: {
            width: "50%",
            condition: (data: any) => data.wantsAsoebi === true,
          },
        }),
        defineBooleanField({
          name: "wantsAsoOke",
          label: "Wants Aso Oke Headwear",
          defaultValue: false,
          admin: { width: "50%" },
        }),
        defineNumberField({
          name: "asoOkeMaleQty",
          label: "Male Aso Oke (Fila/Cap) Quantity",
          defaultValue: 0,
          admin: {
            width: "50%",
            condition: (data: any) => data.wantsAsoOke === true,
          },
        }),
        defineNumberField({
          name: "asoOkeFemaleQty",
          label: "Female Aso Oke (Gele) Quantity",
          defaultValue: 0,
          admin: {
            width: "50%",
            condition: (data: any) => data.wantsAsoOke === true,
          },
        }),
        defineTextareaField({
          name: "asoebiDetails",
          label: "Asoebi & Aso Oke Breakdown Summary",
          admin: {
            description: "Full breakdown of requested fabric and Aso Oke items",
            condition: (data: any) => data.wantsAsoebi === true || data.wantsAsoOke === true,
          },
        }),
        defineSelectField({
          name: "asoebiPaymentStatus",
          label: "Payment Status",
          defaultValue: "pending",
          options: [
            { label: "Pending Payment ⏳", value: "pending" },
            { label: "Payment Received ✓", value: "received" },
            { label: "Partial Payment 💳", value: "partial" },
            { label: "Gift / Waived 🎁", value: "waived" },
          ],
          admin: {
            width: "50%",
            description: "Track whether the guest has completed payment for their order.",
            condition: (data: any) => data.wantsAsoebi === true || data.wantsAsoOke === true,
          },
        }),
        defineSelectField({
          name: "asoebiOrderStatus",
          label: "Fulfillment Status",
          defaultValue: "unfulfilled",
          options: [
            { label: "Unfulfilled / Processing 📦", value: "unfulfilled" },
            { label: "Ready for Pickup / Delivery 🛍️", value: "ready" },
            { label: "Delivered / Handed Over ✅", value: "delivered" },
          ],
          admin: {
            width: "50%",
            description: "Track physical packaging and delivery of fabric & headwear items.",
            condition: (data: any) => data.wantsAsoebi === true || data.wantsAsoOke === true,
          },
        }),
        defineTextareaField({
          name: "asoebiPaymentNotes",
          label: "Payment & Delivery Notes",
          admin: {
            placeholder: "e.g. Received ₦40,000 via bank transfer on July 30th. Handed over at bridal shower.",
            description: "Private notes for admin to track bank transfer receipts or delivery arrangements.",
            condition: (data: any) => data.wantsAsoebi === true || data.wantsAsoOke === true,
          },
        }),
        defineJsonField({
          name: "asoebiReminder",
          label: "Asoebi WhatsApp Reminder",
          admin: {
            component: "rsvp_records.asoebiReminder",
            description:
              "Generate and send a personalized WhatsApp payment reminder for Aso Ebi fabric & headwear orders.",
            condition: (data: any) => data.wantsAsoebi === true || data.wantsAsoOke === true,
          },
        }),
      ],
    }),

    // ── Invitation tab ────────────────────────────────────────────────────────
    ...defineTab({
      label: "Invitation",
      fields: [
        defineJsonField({
          name: "accessCardPreview",
          label: "Access Card Preview",
          admin: {
            component: "rsvp_records.accessCardPreview",
            description: "Live preview of the access card that will be sent to this guest.",
            condition: (data: any) => data.attending === true,
          },
        }),
        defineBooleanField({
          name: "invitationSent",
          label: "Invitation Sent",
          defaultValue: false,
          admin: {
            readOnly: true,
            width: "33%",
            condition: (data: any) => data.attending === true,
          },
        }),
        defineDateField({
          name: "invitationSentAt",
          label: "Invitation Sent At",
          admin: {
            readOnly: true,
            width: "33%",
            condition: (data: any) => data.attending === true,
          },
        }),
        defineSelectField({
          name: "invitationSentVia",
          label: "Sent Via",
          options: [
            { label: "WhatsApp", value: "whatsapp" },
            { label: "Email", value: "email" },
          ],
          admin: {
            readOnly: true,
            width: "33%",
            condition: (data: any) => data.attending === true,
          },
        }),
      ],
    }),

    // ── Check-in tab ──────────────────────────────────────────────────────────
    ...defineTab({
      label: "Check-in",
      fields: [
        defineBooleanField({
          name: "checkedIn",
          label: "Checked In",
          defaultValue: false,
          admin: {
            readOnly: true,
            width: "50%",
            condition: (data: any) => data.attending === true,
          },
        }),
        defineRelationshipField({
          name: "checkIn",
          label: "Check-in Record",
          relationTo: "check_ins",
          admin: {
            readOnly: true,
            width: "50%",
            condition: (data: any) => data.attending === true,
          },
        }),
      ],
    }),
  ],
  // ── 📱 Mobile-First Detail View Layout ────────────────────────────────────────
  detail: [
    // ── 1. GUEST & ATTENDANCE AT-A-GLANCE ─────────────────────────────────────
    displaySection("Guest Overview", [
      displayField("leadName", { span: 12 }),
      displayField("spouseName", {
        span: 12,
        label: "Attending With Spouse",
        emptyText: "Attending Solo",
      }),
      displayField("attending", {
        span: 6,
        display: "badge",
        badgeColors: { true: "emerald", false: "rose" },
        label: "RSVP",
      }),
      displayField("checkedIn", {
        span: 6,
        display: "badge",
        badgeColors: { true: "emerald", false: "slate" },
        label: "Check-in",
      }),
      displayField("leadPhone", {
        span: 6,
        display: "phone",
        label: "WhatsApp / Phone",
      }),
      displayField("leadEmail", {
        span: 6,
        display: "email",
        label: "Email Address",
      }),
      displayField("group", {
        span: 12,
        label: "Invitation Group",
      }),
    ], {
      icon: "UserCheck",
    }),

    // ── 2. DIGITAL INVITATION & ACCESS PASS (ACTION HUB) ─────────────────────
    displaySection("Invitation & Access Card", [
      displayField("accessCardPreview", { span: 12 }),
      displayField("invitationSent", {
        span: 4,
        display: "badge",
        badgeColors: { true: "emerald", false: "amber" },
        label: "Pass Sent",
      }),
      displayField("invitationSentVia", {
        span: 4,
        display: "badge",
        label: "Channel",
      }),
      displayField("invitationSentAt", {
        span: 4,
        display: "relative",
        label: "Dispatched",
      }),
    ], {
      icon: "QrCode",
      description: "Preview access pass and send directly to guest via WhatsApp or Email",
    }),

    // ── 3. ASO EBI & ASO OKE ORDERS ──────────────────────────────────────────
    displaySection("Aso Ebi & Headwear Order", [
      displayField("asoebiPaymentStatus", {
        span: 6,
        display: "badge",
        badgeColors: {
          received: "emerald",
          pending: "amber",
          partial: "blue",
          waived: "purple",
        },
        label: "Payment",
      }),
      displayField("asoebiOrderStatus", {
        span: 6,
        display: "badge",
        badgeColors: {
          delivered: "emerald",
          ready: "blue",
          unfulfilled: "amber",
        },
        label: "Fulfillment",
      }),
      displayField("asoebiYards", {
        span: 4,
        label: "Fabric Yards",
        emptyText: "None",
      }),
      displayField("asoOkeMaleQty", {
        span: 4,
        label: "Male Fila",
      }),
      displayField("asoOkeFemaleQty", {
        span: 4,
        label: "Female Gele",
      }),
      displayField("asoebiDetails", {
        span: 12,
        label: "Order Summary",
      }),
      displayField("asoebiPaymentNotes", {
        span: 12,
        label: "Private Notes",
        hideIfEmpty: true,
      }),
      displayField("asoebiReminder", {
        span: 12,
        label: "Send WhatsApp Payment Reminder",
      }),
    ], {
      icon: "Shirt",
      collapsible: true,
    }),

    // ── 4. EVENT SCHEDULE & GUEST TOOLS ──────────────────────────────────────
    displaySection("Events & Guest Notes", [
      displayField("selectedEvents", {
        span: 12,
        label: "Events Attending",
      }),
      displayField("message", {
        span: 12,
        label: "Message to the Couple",
        hideIfEmpty: true,
      }),
      displayField("rsvpEditLink", {
        span: 12,
        label: "Guest RSVP Edit Link",
      }),
      displayField("submittedAt", {
        span: 12,
        display: "relative",
        label: "Response Submitted",
      }),
    ], {
      icon: "CalendarHeart",
      collapsible: true,
    }),
  ],

  access: {
    read: true,
    create: true,
    update: true,
    delete: "user != null",
  },
  hooks: {
    beforeChange: [enforceRsvpCapacity as any],
  },
});
