import type { CollectionConfig } from "@dyrected/core";
import { reserveItem, releaseReservation } from "../hooks/reservation-hooks.ts";

export const reservations: CollectionConfig = {
  slug: "reservations",
  labels: { singular: "Reservation", plural: "Reservations" },
  admin: {
    useAsTitle: "guestName",
    defaultColumns: ["guestName", "item", "reservedAt"],
    group: "Wishlist",
  },
  fields: [
    { name: "item", type: "relationship", label: "Wishlist Item", relationTo: "wishlist_items", required: true },
    { name: "guestName", type: "text", label: "Guest Name", required: true },
    { name: "guestEmail", type: "email", label: "Guest Email", required: true },
    { name: "message", type: "textarea", label: "Message", admin: { placeholder: "Message to the couple (optional)" } },
    { name: "reservedAt", type: "date", label: "Reserved At", admin: { readOnly: true } },
  ],
  access: {
    read: ({ user }) => !!user,
    create: () => true,
    update: () => false,
    delete: ({ user }) => !!user,
  },
  hooks: {
    beforeChange: [reserveItem],
    afterDelete: [releaseReservation],
  },
};
