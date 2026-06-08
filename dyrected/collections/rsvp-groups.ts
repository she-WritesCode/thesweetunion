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
      admin: {
        tab: "General",
      },
    },
    {
      name: "slug",
      type: "text",
      label: "URL Slug",
      // required: true,
      unique: true,
      hooks: {
        beforeChange: [({ value }) => value?.toLowerCase()],
      },
      admin: {
        tab: "General",
        hidden: true,
        hooks: {
          onChange: ({ value, siblingData }) => {
            const titleSlug = ((siblingData?.title as string) || "").toLowerCase().replace(/\s/g, "-");
            if (titleSlug.includes(value)) return titleSlug;
            return value;
          },
        },
      },
    },

    {
      name: "maxCapacity",
      type: "number",
      label: "Max Capacity",
      required: true,
      admin: { width: "50%", tab: "General" },
    },
    { name: "isActive", type: "boolean", label: "Active", defaultValue: true, admin: { width: "50%", tab: "General" } },
    {
      name: "confirmedCount",
      type: "number",
      label: "Confirmed Count",
      defaultValue: 0,
      admin: { readOnly: true, width: "50%", tab: "Reponses" },
    },
    {
      name: "declinedCount",
      type: "number",
      label: "Declined Count",
      defaultValue: 0,
      admin: { readOnly: true, width: "50%", tab: "Reponses" },
    },
    {
      name: "guests",
      type: "join",
      label: "Guest Responses",
      collection: "rsvp_records",
      on: "group",
      admin: { tab: "Reponses" },
    },
    {
      name: "description",
      type: "textarea",
      label: "Description",
      admin: { description: "Internal notes for the couple", tab: "General" },
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
