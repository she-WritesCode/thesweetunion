import type { CollectionConfig } from "@dyrected/core";
import { enforceRsvpCapacity } from "../hooks/rsvp-hooks.ts";

export const rsvpRecords: CollectionConfig = {
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
    {
      name: "rsvpEditLink",
      type: "text",
      label: "RSVP Edit Link",
      admin: {
        tab: "Response",
        readOnly: true,
        description: "Share this link with your guest so they can edit their RSVP.",
        component: "rsvp_groups.rsvpEditLink",
      },
    },
    { name: "leadName", type: "text", label: "Full Name", required: true, admin: { tab: "Response" } },
    {
      name: "leadEmail",
      type: "email",
      label: "Email",
      required: true,
      unique: true,
      admin: { tab: "Response", width: "50%" },
    },
    {
      name: "leadPhone",
      type: "text",
      label: "WhatsApp Number",
      required: true,
      admin: { tab: "Response", width: "50%" },
    },
    {
      name: "hasSpouse",
      type: "boolean",
      label: "Attending with Spouse",
      defaultValue: false,
      admin: { tab: "Response", width: "50%" },
    },
    {
      name: "spouseName",
      type: "text",
      label: "Spouse Name",
      admin: {
        tab: "Response",
        width: "50%",
        condition: (data) => data.hasSpouse === true,
        description: "Required if attending with spouse",
      },
    },
    {
      name: "attending",
      type: "boolean",
      label: "Attending",
      required: true,
      admin: { tab: "Response", width: "50%" },
    },
    {
      name: "group",
      type: "relationship",
      label: "Invitation Group",
      relationTo: "rsvp_groups",
      required: true,
      admin: { tab: "Response", width: "50%" },
    },
    {
      name: "selectedEvents",
      type: "relationship",
      label: "Events Attending",
      relationTo: "events",
      hasMany: true,
      admin: { tab: "Response" },
    },
    {
      name: "wantsAsoebi",
      type: "boolean",
      label: "Wants Asoebi",
      defaultValue: false,
      admin: { tab: "Response", width: "50%" },
    },
    {
      name: "asoebiYards",
      type: "select",
      label: "Asoebi Yards",
      options: [
        { label: "2 Yards (₦20,000)", value: "2" },
        { label: "3 Yards (₦30,000)", value: "3" },
        { label: "4 Yards (₦40,000)", value: "4" },
        { label: "5 Yards (₦50,000)", value: "5" },
        { label: "6 Yards (₦60,000)", value: "6" },
      ],
      admin: {
        tab: "Response",
        width: "50%",
        condition: (data: any) => data.wantsAsoebi === true,
      },
    },
    {
      name: "asoebiReminder",
      type: "json",
      label: "Asoebi Reminder",
      admin: {
        tab: "Response",
        component: "rsvp_records.asoebiReminder",
        condition: (data: any) => data.attending === true && data.wantsAsoebi === true,
      },
    },
    {
      name: "message",
      type: "textarea",
      label: "Message to Couple",
      admin: { tab: "Response", placeholder: "Message to the couple (optional)" },
    },
    {
      name: "submittedAt",
      type: "date",
      label: "Submitted At",
      admin: { tab: "Response", readOnly: true },
    },
    {
      name: "editToken",
      type: "text",
      label: "Edit Token",
      admin: { tab: "Response", readOnly: true, hidden: true },
    },

    // ── Invitation tab ────────────────────────────────────────────────────────
    {
      name: "accessCardPreview",
      type: "json",
      label: "Access Card Preview",
      admin: {
        tab: "Invitation",
        component: "rsvp_records.accessCardPreview",
        description: "Live preview of the access card that will be sent to this guest.",
      },
    },
    {
      name: "invitationSent",
      type: "boolean",
      label: "Invitation Sent",
      defaultValue: false,
      admin: { tab: "Invitation", readOnly: true, width: "33%" },
    },
    {
      name: "invitationSentAt",
      type: "date",
      label: "Invitation Sent At",
      admin: { tab: "Invitation", readOnly: true, width: "33%" },
    },
    {
      name: "invitationSentVia",
      type: "select",
      label: "Sent Via",
      options: [
        { label: "WhatsApp", value: "whatsapp" },
        { label: "Email", value: "email" },
      ],
      admin: { tab: "Invitation", readOnly: true, width: "33%" },
    },

    // ── Check-in tab ──────────────────────────────────────────────────────────
    {
      name: "checkedIn",
      type: "boolean",
      label: "Checked In",
      defaultValue: false,
      admin: { tab: "Check-in", readOnly: true, width: "50%" },
    },
    {
      name: "checkIn",
      type: "relationship",
      label: "Check-in Record",
      relationTo: "check_ins",
      admin: { tab: "Check-in", readOnly: true, width: "50%" },
    },
  ],
  access: {
    read: true,
    create: true,
    update: true,
    delete: "user != null",
  },
  hooks: {
    beforeChange: [enforceRsvpCapacity],
  },
};
