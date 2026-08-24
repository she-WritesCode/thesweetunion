import {
  defineCollection,
  defineView,
  defineAction,
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
  displayGrid,
  displayField,
  displayDivider,
  displaySection,
  displayCustomComponent,
} from "@dyrected/core";
import { enforceRsvpCapacity } from "../hooks/rsvp-hooks.ts";

// const asoEbiOrderCondition = "doc.wantsAsoebi === true || doc.wantsAsoOke === true";
// const invitationCondition = "doc.attending === true";

const asoEbiOrderCondition = "true";
const invitationCondition = "true";

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
  // ── 📊 Operational Views (Dyrected 2.9.0 Workspaces) ──────────────────────
  views: [
    defineView({
      slug: "all_responses",
      label: "All RSVPs",
      icon: "Users",
      layout: "table",
      columns: [
        "leadName",
        "group",
        "attending",
        "hasSpouse",
        "spouseName",
        "wantsAsoebi",
        "asoebiPaymentStatus",
        "invitationSent",
        "checkedIn",
        "submittedAt",
      ],
      sort: { field: "submittedAt", direction: "desc" },
    }),
    defineView({
      slug: "asoebi_logistics",
      label: "Aso Ebi Orders",
      icon: "Package",
      layout: "table",
      filter: {
        or: [{ wantsAsoebi: { equals: true } }, { wantsAsoOke: { equals: true } }],
      },
      columns: [
        "leadName",
        "leadPhone",
        "asoebiYards",
        "asoOkeMaleQty",
        "asoOkeFemaleQty",
        "asoebiPaymentStatus",
        "asoebiOrderStatus",
        "asoebiPaymentNotes",
      ],
      actions: [
        defineAction({
          name: "sendAsoebiReminder",
          label: "Send WhatsApp Reminder",
          icon: "MessageSquare",
          type: "row",
          fields: [
            defineJsonField({
              name: "asoebiReminder",
              label: "WhatsApp Reminder Message",
              admin: {
                component: "rsvp_records.asoebiReminder",
                description: "Review and send the personalized WhatsApp reminder for this guest.",
              },
            }),
          ],
        }),
      ],
      features: {
        edit: false,
        delete: false,
        duplicate: false,
      },
    }),
    defineView({
      slug: "invitation_dispatch",
      label: "Pass Dispatch",
      icon: "Send",
      layout: "table",
      filter: { attending: { equals: true } },
      columns: [
        "leadName",
        "leadPhone",
        "hasSpouse",
        "spouseName",
        "group",
        "invitationSent",
        "invitationSentVia",
        "invitationSentAt",
      ],
      sort: { field: "invitationSent", direction: "asc" },
    }),
  ],
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
            component: "rsvp_records.rsvpEditLink",
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
  // ── 📱 High-Density Compact Detail View ──────────────────────────────────────
  detail: [
    // ── 1. Top Status & Contact Strip (Compact 4-column grid) ─────────────────
    displayGrid(4, [
      displayField("attending", {
        display: "badge",
        badgeColors: { true: "emerald", false: "rose" },
        label: "RSVP Status",
      }),
      displayField("checkedIn", {
        display: "badge",
        badgeColors: { true: "emerald", false: "slate" },
        label: "Door Check-in",
      }),
      displayField("leadPhone", {
        display: "phone",
        label: "WhatsApp / Phone",
      }),
      displayField("leadEmail", {
        display: "email",
        label: "Email Address",
      }),
    ]),

    // ── 2. Headcount, Companion & Guest RSVP Edit Link (Compact 3-column grid) ─────
    displayGrid(3, [
      displayField("hasSpouse", {
        display: "badge",
        badgeColors: { true: "purple", false: "slate" },
        label: "Attending With Spouse",
        emptyText: "Attending Solo",
      }),
      displayField("spouseName", {
        label: "Spouse / Plus-One Name",
        emptyText: "None (Attending Solo)",
      }),
      displayField("group", {
        label: "Invitation Group",
      }),
    ]),

    displayCustomComponent("RsvpEditLinkField"),

    displayDivider({ spacing: "md" }),

    // ── 3. Aso Ebi & Headwear Order (Financials & Logistics Desk) ────────────
    displaySection(
      "Aso Ebi & Headwear Logistics",
      [
        displayGrid(4, [
          displayField("asoebiPaymentStatus", {
            display: "badge",
            badgeColors: { received: "emerald", pending: "amber", partial: "blue", waived: "purple" },
            label: "Payment (Bank Transfer)",
            editable: true,
          }),
          displayField("asoebiOrderStatus", {
            display: "badge",
            badgeColors: { delivered: "emerald", ready: "blue", unfulfilled: "amber" },
            label: "Fulfillment / Delivery",
            editable: true,
          }),
          displayField("asoebiYards", {
            display: "badge",
            label: "Fabric Yards",
            emptyText: "None",
            editable: true,
          }),
          displayField("asoOkeMaleQty", {
            label: "Male Fila / Caps",
            emptyText: "0",
            editable: true,
          }),
          displayField("asoOkeFemaleQty", {
            label: "Female Gele",
            emptyText: "0",
            editable: true,
          }),
          displayField("asoebiDetails", {
            label: "Asoebi Order Summary",
            hideIfEmpty: true,
            editable: true,
            span: 2,
          }),
          displayField("asoebiPaymentNotes", {
            label: "Payment & Delivery Notes (Pickup / Dispatch Rider)",
            hideIfEmpty: false,
            editable: true,
            span: 2,
          }),
        ]),
        displayCustomComponent("SendAsoebiReminderButton", { visible: asoEbiOrderCondition }),
      ],
      {
        span: 12,
        visible: asoEbiOrderCondition,
        icon: "Package",
        description: "Manage bank transfer verification, fabric & headwear prep, and pickup/rider distribution.",
      },
    ),

    displayDivider({ spacing: "md", visible: asoEbiOrderCondition }),

    // ── 4. Digital Invitation & Access Pass (Dispatch Action Hub) ─────────────
    displaySection(
      "Digital Invitation & Joint Access Pass",
      [
        displayCustomComponent("AccessCardPreview", { visible: invitationCondition }),
        displayCustomComponent("SendWhatsAppButton", { visible: invitationCondition }),
        displayGrid(3, [
          displayField("invitationSent", {
            display: "badge",
            badgeColors: { true: "emerald", false: "amber" },
            label: "Pass Dispatched",
          }),
          displayField("invitationSentVia", {
            display: "badge",
            label: "Delivery Channel",
          }),
          displayField("invitationSentAt", {
            display: "relative",
            label: "Dispatched Date",
          }),
        ]),
      ],
      {
        span: 12,
        icon: "Send",
        visible: invitationCondition,
        description:
          "Live preview of the 1 joint access pass (Lead + Spouse) and direct WhatsApp / Email dispatch triggers.",
      },
    ),

    displayDivider({ spacing: "md", visible: invitationCondition }),

    // ── 5. Event Schedule & Well Wishes Message ──────────────────────────────
    displaySection(
      "Event Details & Guest Notes",
      [
        displayGrid(2, [
          displayField("selectedEvents", {
            label: "Events Attending",
          }),
          displayField("submittedAt", {
            display: "relative",
            label: "RSVP Submitted",
          }),
          displayField("message", {
            label: "Message to the Couple",
            hideIfEmpty: true,
            span: 2,
          }),
        ]),
      ],
      { span: 12, icon: "Calendar" },
    ),
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
