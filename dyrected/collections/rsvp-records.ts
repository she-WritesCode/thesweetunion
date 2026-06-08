import type { CollectionConfig } from "@dyrected/core";
import { enforceRsvpCapacity } from "../hooks/rsvp-hooks.ts";
import { adminOnly } from "../access/admin.ts";

export const rsvpRecords: CollectionConfig = {
  slug: "rsvp_records",
  labels: { singular: "Guest Response", plural: "Guest Responses" },
  admin: {
    useAsTitle: "leadName",
    defaultColumns: ["leadName", "leadEmail", "leadPhone", "group", "attending", "spouseName", "selectedEvents", "submittedAt"],
    group: "RSVP",
  },
  fields: [
    { name: "group", type: "relationship", label: "RSVP Group", relationTo: "rsvp_groups", required: true },
    { name: "leadName", type: "text", label: "Full Name", required: true },
    { name: "leadEmail", type: "email", label: "Email", required: true, unique: true },
    { name: "leadPhone", type: "text", label: "Phone Number" },
    { name: "hasSpouse", type: "boolean", label: "Attending with Spouse", defaultValue: false },
    {
      name: "spouseName",
      type: "text",
      label: "Spouse Name",
      admin: {
        condition: (data) => data.hasSpouse === true,
        description: "Required if attending with spouse",
      },
    },
    { name: "attending", type: "boolean", label: "Attending", required: true },
    {
      name: "selectedEvents",
      type: "relationship",
      label: "Events Attending",
      relationTo: "events",
      hasMany: true,
    },
    {
      name: "dietaryNotes",
      type: "textarea",
      label: "Dietary Notes",
      admin: { placeholder: "Any dietary requirements?" },
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
