import type { CollectionConfig } from "@dyrected/core";
import { publicRead } from "../access/public.ts";
import { adminOnly } from "../access/admin.ts";

export const events: CollectionConfig = {
  slug: "events",
  labels: { singular: "Event", plural: "Events" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "date", "venueName"],
    group: "Wedding Details",
  },
  fields: [
    { name: "name", type: "text", label: "Event Name", required: true },
    { name: "date", type: "datetime", label: "Date & Time", required: true },
    { name: "venueName", type: "text", label: "Venue Name", required: true },
    { name: "venueAddress", type: "textarea", label: "Venue Address", required: true },
    { name: "dressCode", type: "text", label: "Dress Code", defaultValue: "Strictly Formal" },
    { name: "photo", type: "relationship", label: "Event Photo", relationTo: "media" },
    { name: "collectsRsvp", type: "boolean", label: "Collect RSVPs", defaultValue: true },
    {
      name: "schedule",
      type: "array",
      label: "Event Schedule",
      fields: [
        { name: "time", type: "text", label: "Time", required: true },
        { name: "title", type: "text", label: "Title", required: true },
        { name: "description", type: "textarea", label: "Description" },
      ],
    },
  ],
  access: {
    read: "true",
    create: "user != null",
    update: "user != null",
    delete: "user != null",
  },
};
