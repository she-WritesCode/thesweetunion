import type { CollectionConfig } from "@dyrected/core";
import { enforceRsvpCapacity } from "../hooks/rsvp-hooks.ts";
import { adminOnly } from "../access/admin.ts";

export const rsvpRecords: CollectionConfig = {
  slug: "rsvp_records",
  labels: { singular: "Guest Response", plural: "Guest Responses" },
  admin: {
    useAsTitle: "leadName",
    defaultColumns: [
      "leadName",
      "leadEmail",
      "leadPhone",
      "group",
      "attending",
      "spouseName",
      "selectedEvents",
      "submittedAt",
    ],
    group: "RSVP",
  },
  fields: [
    {
      name: "rsvpEditLink",
      type: "text",
      label: "RSVP Edit Link",
      admin: {
        readOnly: true,
        description: "Share this link with your guest so they can edit their RSVP.",
        component: "rsvp_groups.rsvpEditLink",
      },
    },
    { name: "leadName", type: "text", label: "Full Name", required: true },
    { name: "leadEmail", type: "email", label: "Email", required: true, unique: true, admin: { width: "50%" } },
    { name: "leadPhone", type: "text", label: "WhatsApp Number", required: true, admin: { width: "50%" } },
    {
      name: "hasSpouse",
      type: "boolean",
      label: "Attending with Spouse",
      defaultValue: false,
      admin: { width: "50%" },
    },
    {
      name: "spouseName",
      type: "text",
      label: "Spouse Name",
      admin: {
        width: "50%",
        condition: (data) => data.hasSpouse === true,
        description: "Required if attending with spouse",
      },
    },
    { name: "attending", type: "boolean", label: "Attending", required: true, admin: { width: "50%" } },
    {
      name: "group",
      type: "relationship",
      label: "Invitation Group",
      relationTo: "rsvp_groups",
      required: true,
      admin: { width: "50%" },
    },
    {
      name: "selectedEvents",
      type: "relationship",
      label: "Events Attending",
      relationTo: "events",
      hasMany: true,
    },
    {
      name: "message",
      type: "textarea",
      label: "Message to Couple",
      admin: { placeholder: "Message to the couple (optional)" },
    },
    { name: "submittedAt", type: "date", label: "Submitted At", admin: { readOnly: true } },
    { name: "editToken", type: "text", label: "Edit Token", admin: { readOnly: true, hidden: true } },
  ],
  access: {
    read: "true",
    create: "true",
    update: "true",
    delete: "user != null",
  },
  hooks: {
    beforeChange: [enforceRsvpCapacity],
  },
};
