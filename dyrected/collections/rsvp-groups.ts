import {
  defineCollection,
  defineTab,
  defineTextField,
  defineNumberField,
  defineBooleanField,
  defineJoinField,
  defineTextareaField,
} from "@dyrected/core";
import { generateGroupSlug } from "../hooks/group-hooks.ts";
import { adminOnly } from "../access/admin.ts";
import { publicRead } from "../access/public.ts";

export const rsvpGroups = defineCollection({
  slug: "rsvp_groups",
  labels: { singular: "Invitation Group", plural: "Invitation Groups" },
  admin: {
    icon: "ListMusic",
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "maxCapacity", "confirmedCount", "declinedCount", "isActive"],
    group: "RSVP",
  },
  fields: [
    defineTextField({
      name: "rsvpLink",
      label: "RSVP Link",
      admin: {
        readOnly: true,
        description: "Share this link with the guest group so they can RSVP.",
        component: "rsvp_groups.rsvpLink",
      },
    }),
    ...defineTab({
      label: "General",
      fields: [
        defineTextField({
          name: "name",
          label: "Group Name",
          required: true,
        }),
        defineTextField({
          name: "slug",
          label: "URL Slug",
          unique: true,
          hooks: {
            beforeChange: [({ value }) => value?.toLowerCase()],
          },
          admin: {
            hidden: true,
            hooks: {
              onChange: ({ value, siblingData }) => {
                const titleSlug = ((siblingData?.title as string) || "").toLowerCase().replace(/\s/g, "-");
                if (titleSlug.includes(value)) return titleSlug;
                return value;
              },
            },
          },
        }),
        defineNumberField({
          name: "maxCapacity",
          label: "Max Capacity",
          required: true,
          admin: { width: "50%" },
        }),
        defineBooleanField({
          name: "isActive",
          label: "Active",
          defaultValue: true,
          admin: { width: "50%" },
        }),
        defineTextareaField({
          name: "description",
          label: "Description",
          admin: { description: "Internal notes for the couple" },
        }),
      ],
    }),

    ...defineTab({
      label: "Reponses",
      fields: [
        defineNumberField({
          name: "confirmedCount",
          label: "Confirmed Count",
          defaultValue: 0,
          admin: { component: "rsvp_groups.confirmedCount", readOnly: true, width: "50%" },
        }),
        defineNumberField({
          name: "declinedCount",
          label: "Declined Count",
          defaultValue: 0,
          admin: { component: "rsvp_groups.confirmedCount", readOnly: true, width: "50%" },
        }),
        defineJoinField({
          name: "guests",
          label: "Guest Responses",
          collection: "rsvp_records",
          on: "group",
        }),
      ],
    }),
  ],
  access: {
    read: "true",
    create: "user != null",
    update: "true",
    delete: "user != null",
  },
  hooks: {
    beforeChange: [generateGroupSlug as any],
  },
});
