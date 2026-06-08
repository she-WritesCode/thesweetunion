import type { CollectionConfig } from "@dyrected/core";
import { generateGroupSlug } from "../hooks/group-hooks.ts";
import { adminOnly } from "../access/admin.ts";
import { publicRead } from "../access/public.ts";

export const rsvpGroups: CollectionConfig = {
  slug: "rsvp_groups",
  labels: { singular: "Invitation Group", plural: "Invitation Groups" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "maxCapacity", "confirmedCount", "declinedCount", "isActive"],
    group: "RSVP",
  },
  fields: [
    {
      name: "rsvpLink",
      type: "text",
      label: "RSVP Link",
      admin: {
        readOnly: true,
        description: "Share this link with the guest group so they can RSVP.",
        component: "rsvp_groups.rsvpLink",
      },
    },
    {
      name: "name",
      type: "text",
      label: "Group Name",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      label: "URL Slug",
      required: true,
      unique: true,
      hooks: {
        beforeChange: [({ value }) => value?.toLowerCase()],
      },
      admin: {
        hooks: {
          onChange: ({ value, siblingData }) => {
            const titleSlug = ((siblingData?.title as string) || "").toLowerCase().replace(/\s/g, "-");
            if (titleSlug.includes(value)) return titleSlug;
            return value;
          },
        },
      },
    },

    { name: "maxCapacity", type: "number", label: "Max Capacity", required: true },
    { name: "confirmedCount", type: "number", label: "Confirmed Count", defaultValue: 0, admin: { readOnly: true } },
    { name: "declinedCount", type: "number", label: "Declined Count", defaultValue: 0, admin: { readOnly: true } },
    { name: "isActive", type: "boolean", label: "Active", defaultValue: true },
    { name: "createdAt", type: "date", label: "Created At", admin: { readOnly: true } },
    {
      name: "description",
      type: "textarea",
      label: "Internal Notes",
      admin: { description: "Internal notes for the couple" },
    },
  ],
  access: {
    read: "true",
    create: "user != null",
    update: "true",
    delete: "user != null",
  },
  hooks: {
    beforeChange: [generateGroupSlug],
  },
};
