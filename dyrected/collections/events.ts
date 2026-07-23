import {
  defineCollection,
  defineNumberField,
  defineTextField,
  defineDateTimeField,
  defineTextareaField,
  defineRelationshipField,
  defineBooleanField,
} from "@dyrected/core";

export const events = defineCollection({
  slug: "events",
  labels: { singular: "Event", plural: "Events" },
  admin: {
    icon: "Ticket",
    useAsTitle: "name",
    defaultColumns: ["order", "name", "date", "venueName", "dressCode", "collectsRsvp"],
    group: "RSVP",
  },
  fields: [
    defineNumberField({
      name: "order",
      label: "Display Order",
      defaultValue: 0,
      admin: { description: "Lower numbers appear first. e.g. 1 = first, 2 = second." },
    }),
    defineTextField({ name: "name", label: "Event Name", required: true }),
    defineDateTimeField({ name: "date", label: "Date & Time", required: true }),
    defineTextField({ name: "venueName", label: "Venue Name", required: true }),
    defineTextareaField({ name: "venueAddress", label: "Venue Address", required: true }),
    defineTextField({ name: "dressCode", label: "Dress Code", defaultValue: "Strictly Formal" }),
    defineRelationshipField({ name: "photo", label: "Event Photo", relationTo: "media" }),
    defineBooleanField({ name: "collectsRsvp", label: "Collect RSVPs", defaultValue: true }),
  ],
  access: {
    read: "true",
    create: "user != null",
    update: "user != null",
    delete: "user != null",
  },
});
