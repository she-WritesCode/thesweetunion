import type { CollectionConfig } from "@dyrected/core";
import { publicRead } from "../access/public.ts";
import { adminOnly } from "../access/admin.ts";

export const events: CollectionConfig = {
  slug: "events",
  labels: { singular: "Event", plural: "Events" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["order", "name", "date", "venueName", "dressCode", "collectsRsvp"],
    group: "RSVP",
  },
  fields: [
    {
      name: "order",
      type: "number",
      label: "Display Order",
      defaultValue: 0,
      admin: { description: "Lower numbers appear first. e.g. 1 = first, 2 = second." },
    },
    { name: "name", type: "text", label: "Event Name", required: true },
    { name: "date", type: "datetime", label: "Date & Time", required: true },
    { name: "venueName", type: "text", label: "Venue Name", required: true },
    { name: "venueAddress", type: "textarea", label: "Venue Address", required: true },
    { name: "dressCode", type: "text", label: "Dress Code", defaultValue: "Strictly Formal" },
    { name: "photo", type: "relationship", label: "Event Photo", relationTo: "media" },
    { name: "collectsRsvp", type: "boolean", label: "Collect RSVPs", defaultValue: true },
  ],
  access: {
    read: "true",
    create: "user != null",
    update: "user != null",
    delete: "user != null",
  },
};
