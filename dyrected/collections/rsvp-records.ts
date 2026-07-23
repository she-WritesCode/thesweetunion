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
} from "@dyrected/core";
import { enforceRsvpCapacity } from "../hooks/rsvp-hooks.ts";

export const rsvpRecords = defineCollection({
  slug: "rsvp_records",
  labels: { singular: "Guest Response", plural: "Guest Responses" },
  admin: {
    icon: "ReceiptText",
    useAsTitle: "leadName",
    defaultColumns: [
      "leadName",
      "leadEmail",
      "leadPhone",
      "group",
      "attending",
      "spouseName",
      "selectedEvents",
      "checkedIn",
      "invitationSent",
      "submittedAt",
    ],
    group: "RSVP",
  },
  fields: [
    // ── Response tab ─────────────────────────────────────────────────────────
    ...defineTab({
      label: "Response",
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
        defineBooleanField({
          name: "wantsAsoebi",
          label: "Wants Asoebi",
          defaultValue: false,
          admin: { width: "50%" },
        }),
        defineSelectField({
          name: "asoebiYards",
          label: "Asoebi Yards",
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
        defineJsonField({
          name: "asoebiReminder",
          label: "Asoebi Reminder",
          admin: {
            component: "rsvp_records.asoebiReminder",
            condition: (data: any) => data.attending === true && data.wantsAsoebi === true,
          },
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
          },
        }),
        defineBooleanField({
          name: "invitationSent",
          label: "Invitation Sent",
          defaultValue: false,
          admin: { readOnly: true, width: "33%" },
        }),
        defineDateField({
          name: "invitationSentAt",
          label: "Invitation Sent At",
          admin: { readOnly: true, width: "33%" },
        }),
        defineSelectField({
          name: "invitationSentVia",
          label: "Sent Via",
          options: [
            { label: "WhatsApp", value: "whatsapp" },
            { label: "Email", value: "email" },
          ],
          admin: { readOnly: true, width: "33%" },
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
          admin: { readOnly: true, width: "50%" },
        }),
        defineRelationshipField({
          name: "checkIn",
          label: "Check-in Record",
          relationTo: "check_ins",
          admin: { readOnly: true, width: "50%" },
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
