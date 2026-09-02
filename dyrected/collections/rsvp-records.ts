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
} from "@dyrected/core";
import { enforceRsvpCapacity } from "../hooks/rsvp-hooks.ts";

export const ASOEBI_PAYMENT_STATUS_OPTIONS = [
  { label: "Pending Payment ⏳", value: "pending" },
  { label: "Payment Received ✓", value: "received" },
  { label: "Partial Payment 💳", value: "partial" },
  { label: "Gift / Waived 🎁", value: "waived" },
];

export const ASOEBI_ORDER_STATUS_OPTIONS = [
  { label: "Unfulfilled / Processing 📦", value: "unfulfilled" },
  { label: "Ready for Pickup / Delivery 🛍️", value: "ready" },
  { label: "Delivered / Handed Over ✅", value: "delivered" },
];

export const ASOEBI_YARDS_OPTIONS = [
  { label: "2 Yards (₦20,000)", value: "2" },
  { label: "3 Yards (₦30,000)", value: "3" },
  { label: "4 Yards (₦40,000)", value: "4" },
  { label: "5 Yards (₦50,000)", value: "5" },
  { label: "6 Yards (₦60,000)", value: "6" },
];

export const INVITATION_SENT_VIA_OPTIONS = [
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Email", value: "email" },
];

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
  detail: false,
  // ── 📊 Operational Views (Dyrected 2.9.0 Workspaces) ──────────────────────
  defaultView: "all_responses",
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
      features: {
        duplicate: false,
      },
      components: {
        afterViewHeader: ["RsvpListSummary"],
      },
    }),
    defineView({
      slug: "asoebi_logistics",
      label: "Aso Ebi Orders",
      icon: "Package",
      layout: "table",
      filter: {
        OR: [{ wantsAsoebi: { equals: true } }, { wantsAsoOke: { equals: true } }],
      },
      columns: [
        "leadName",
        "leadPhone",
        "asoebiYards",
        "asoOkeMaleQty",
        "asoOkeFemaleQty",
        "asoebiPaymentStatus",
        "asoebiAmountPaid",
        "asoebiOrderStatus",
        "asoebiPaymentNotes",
      ],
      metrics: [
        {
          label: "Total Yards",
          color: "amber",
          unit: "Yds",
          aggregate: {
            sum: "asoebiYards",
            cast: "number",
            where: { wantsAsoebi: { equals: true } },
          },
          subMetrics: [
            {
              label: "Fulfilled",
              aggregate: {
                sum: "asoebiYards",
                cast: "number",
                where: {
                  AND: [
                    { wantsAsoebi: { equals: true } },
                    { asoebiOrderStatus: { equals: "delivered" } },
                  ],
                },
              },
            },
            {
              label: "Pending",
              aggregates: {
                total: {
                  sum: "asoebiYards",
                  cast: "number",
                  where: { wantsAsoebi: { equals: true } },
                },
                fulfilled: {
                  sum: "asoebiYards",
                  cast: "number",
                  where: {
                    AND: [
                      { wantsAsoebi: { equals: true } },
                      { asoebiOrderStatus: { equals: "delivered" } },
                    ],
                  },
                },
              },
              expression: "aggregates.total - aggregates.fulfilled",
            },
          ],
        },
        {
          label: "Total Male Aso Oke",
          color: "indigo",
          unit: "Caps",
          aggregate: {
            sum: "asoOkeMaleQty",
            cast: "number",
            where: { wantsAsoOke: { equals: true } },
          },
          subMetrics: [
            {
              label: "Fulfilled",
              aggregate: {
                sum: "asoOkeMaleQty",
                cast: "number",
                where: {
                  AND: [
                    { wantsAsoOke: { equals: true } },
                    { asoebiOrderStatus: { equals: "delivered" } },
                  ],
                },
              },
            },
            {
              label: "Pending",
              aggregates: {
                total: {
                  sum: "asoOkeMaleQty",
                  cast: "number",
                  where: { wantsAsoOke: { equals: true } },
                },
                fulfilled: {
                  sum: "asoOkeMaleQty",
                  cast: "number",
                  where: {
                    AND: [
                      { wantsAsoOke: { equals: true } },
                      { asoebiOrderStatus: { equals: "delivered" } },
                    ],
                  },
                },
              },
              expression: "aggregates.total - aggregates.fulfilled",
            },
          ],
        },
        {
          label: "Total Female Aso Oke",
          color: "purple",
          unit: "Gele",
          aggregate: {
            sum: "asoOkeFemaleQty",
            cast: "number",
            where: { wantsAsoOke: { equals: true } },
          },
          subMetrics: [
            {
              label: "Fulfilled",
              aggregate: {
                sum: "asoOkeFemaleQty",
                cast: "number",
                where: {
                  AND: [
                    { wantsAsoOke: { equals: true } },
                    { asoebiOrderStatus: { equals: "delivered" } },
                  ],
                },
              },
            },
            {
              label: "Pending",
              aggregates: {
                total: {
                  sum: "asoOkeFemaleQty",
                  cast: "number",
                  where: { wantsAsoOke: { equals: true } },
                },
                fulfilled: {
                  sum: "asoOkeFemaleQty",
                  cast: "number",
                  where: {
                    AND: [
                      { wantsAsoOke: { equals: true } },
                      { asoebiOrderStatus: { equals: "delivered" } },
                    ],
                  },
                },
              },
              expression: "aggregates.total - aggregates.fulfilled",
            },
          ],
        },
        {
          label: "Total Expected Revenue",
          color: "emerald",
          format: "currency",
          currency: "NGN",
          aggregates: {
            totalYards: {
              sum: "asoebiYards",
              cast: "number",
              where: { wantsAsoebi: { equals: true } },
            },
            maleQty: {
              sum: "asoOkeMaleQty",
              cast: "number",
              where: { wantsAsoOke: { equals: true } },
            },
            femaleQty: {
              sum: "asoOkeFemaleQty",
              cast: "number",
              where: { wantsAsoOke: { equals: true } },
            },
          },
          expression:
            "(aggregates.totalYards * 10000) + (aggregates.maleQty * 8000) + (aggregates.femaleQty * 8000)",
          subMetrics: [
            {
              label: "Total Paid",
              aggregate: {
                sum: "asoebiAmountPaid",
                cast: "number",
              },
              format: "currency",
              currency: "NGN",
            },
            {
              label: "Total Due",
              aggregates: {
                totalYards: {
                  sum: "asoebiYards",
                  cast: "number",
                  where: { wantsAsoebi: { equals: true } },
                },
                maleQty: {
                  sum: "asoOkeMaleQty",
                  cast: "number",
                  where: { wantsAsoOke: { equals: true } },
                },
                femaleQty: {
                  sum: "asoOkeFemaleQty",
                  cast: "number",
                  where: { wantsAsoOke: { equals: true } },
                },
                amountPaid: {
                  sum: "asoebiAmountPaid",
                  cast: "number",
                },
              },
              expression:
                "((aggregates.totalYards * 10000) + (aggregates.maleQty * 8000) + (aggregates.femaleQty * 8000)) - aggregates.amountPaid",
              format: "currency",
              currency: "NGN",
            },
          ],
        },
      ],
      actions: [
        defineAction({
          name: "updatePaymentStatus",
          label: "Update Payment",
          icon: "CreditCard",
          type: "row",
          fields: [
            defineSelectField({
              name: "asoebiPaymentStatus",
              label: "Payment Status",
              required: true,
              options: ASOEBI_PAYMENT_STATUS_OPTIONS,
            }),
            defineNumberField({
              name: "asoebiAmountPaid",
              label: "Amount Paid (₦)",
              admin: {
                placeholder: "e.g. 20000",
                description: "Amount received so far in Naira (helpful for partial payments).",
              },
            }),
            defineTextareaField({
              name: "asoebiPaymentNotes",
              label: "Payment Notes",
              admin: {
                placeholder: "e.g. Received ₦40,000 via bank transfer on July 30th...",
              },
            }),
          ],
        }),
        defineAction({
          name: "updateFulfillmentStatus",
          label: "Update Fulfilment",
          icon: "PackageCheck",
          type: "row",
          fields: [
            defineSelectField({
              name: "asoebiOrderStatus",
              label: "Fulfilment Status",
              required: true,
              options: ASOEBI_ORDER_STATUS_OPTIONS,
            }),
            defineTextareaField({
              name: "asoebiPaymentNotes",
              label: "Fulfilment & Delivery Notes",
              admin: {
                placeholder: "e.g. Package ready for pickup / Handed over to guest...",
              },
            }),
          ],
        }),
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
        view: false,
        delete: false,
        duplicate: false,
      },
    }),
    defineView({
      slug: "invitation_dispatch",
      label: "Pass Dispatch",
      icon: "Send",
      layout: "cards",
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
          options: ASOEBI_YARDS_OPTIONS,
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
          options: ASOEBI_PAYMENT_STATUS_OPTIONS,
          admin: {
            width: "50%",
            description: "Track whether the guest has completed payment for their order.",
            condition: (data: any) => data.wantsAsoebi === true || data.wantsAsoOke === true,
          },
        }),
        defineNumberField({
          name: "asoebiAmountPaid",
          label: "Amount Paid (₦)",
          admin: {
            width: "50%",
            placeholder: "e.g. 20000",
            description: "Amount received so far in Naira (helpful for partial payments).",
            condition: (data: any) => data.wantsAsoebi === true || data.wantsAsoOke === true,
          },
        }),
        defineSelectField({
          name: "asoebiOrderStatus",
          label: "Fulfillment Status",
          defaultValue: "unfulfilled",
          options: ASOEBI_ORDER_STATUS_OPTIONS,
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
          options: INVITATION_SENT_VIA_OPTIONS,
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
