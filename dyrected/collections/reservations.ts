import type { CollectionConfig } from "@dyrected/core";
import { reserveItem, releaseReservation } from "../hooks/reservation-hooks.ts";

export const reservations: CollectionConfig = {
  slug: "reservations",
  labels: { singular: "Reservation", plural: "Reservations" },
  admin: {
    useAsTitle: "guestName",
    defaultColumns: ["guestName", "guestEmail", "guestPhone", "item", "contributionAmount", "reservedAt"],
    group: "Wishlist",
  },
  fields: [
    { name: "item", type: "relationship", label: "Wishlist Item", relationTo: "wishlist_items", required: true, admin: { tab: "Details", width: "50%" } },
    { name: "guestName", type: "text", label: "Guest Name", required: true, admin: { tab: "Details", width: "50%" } },
    { name: "guestEmail", type: "email", label: "Guest Email", admin: { tab: "Details", width: "50%" } },
    { name: "guestPhone", type: "text", label: "Guest Phone", admin: { tab: "Details", width: "50%" } },
    { name: "contributionAmount", type: "number", label: "Contribution Amount", admin: { tab: "Details", description: "Required for crowdfund items (min ₦5,000)", width: "50%" } },
    { name: "reservedAt", type: "date", label: "Reserved At", admin: { tab: "Details", readOnly: true, width: "50%" } },
    { name: "message", type: "textarea", label: "Message", admin: { tab: "Details", placeholder: "Message to the couple (optional)" } },
  ],
  access: {
    read: "user != null",
    create: "user != null",
    update: "false",
    delete: "user != null",
  },
  hooks: {
    beforeChange: [reserveItem],
    afterDelete: [releaseReservation],
  },
};
