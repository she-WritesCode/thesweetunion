import {
  defineCollection,
  defineTab,
  defineRelationshipField,
  defineTextField,
  defineSelectField,
  defineNumberField,
  defineDateField,
  defineDateTimeField,
} from "@dyrected/core";
import { reserveItem, releaseReservation } from "../hooks/reservation-hooks.ts";

export const reservations = defineCollection({
  slug: "reservations",
  labels: { singular: "Reservation", plural: "Reservations" },
  admin: {
    icon: "Gift",
    useAsTitle: "guestName",
    defaultColumns: ["guestName", "item", "intent", "paymentTiming", "reminderAt", "reservedAt"],
    group: "Wishlist",
  },
  fields: [
    ...defineTab({
      label: "Details",
      fields: [
        defineRelationshipField({
          name: "item",
          label: "Wishlist Item",
          relationTo: "wishlist_items",
          required: true,
          admin: { width: "50%" },
        }),
        defineTextField({
          name: "guestName",
          label: "Guest Name",
          required: true,
          admin: { width: "50%" },
        }),
        defineSelectField({
          name: "intent",
          label: "Intent",
          required: true,
          options: [
            { label: "Reserve Gift", value: "reserve" },
            { label: "Contribute Now", value: "contribute" },
            { label: "Remind Me Later", value: "reminder" },
          ],
          admin: { width: "50%" },
        }),
        defineSelectField({
          name: "paymentTiming",
          label: "Payment Timing",
          required: true,
          options: [
            { label: "Pay Now", value: "now" },
            { label: "Pay Later", value: "later" },
          ],
          admin: { width: "50%" },
        }),
        defineNumberField({
          name: "contributionAmount",
          label: "Contribution Amount",
          admin: {
            description: "Required for crowdfund items (min ₦5,000)",
            width: "50%",
            format: {
              type: "currency",
              currency: "NGN",
            },
          },
        }),
        defineDateField({
          name: "reminderAt",
          label: "Reminder Date",
          admin: {
            width: "50%",
          },
        }),
        defineSelectField({
          name: "reminderChannel",
          label: "Reminder Channel",
          options: [
            { label: "WhatsApp", value: "whatsapp" },
            { label: "Email", value: "email" },
          ],
          admin: { width: "50%" },
        }),
        defineTextField({
          name: "reminderContact",
          label: "Reminder Contact",
          admin: {
            width: "50%",
            description: "Only collected when the guest asks to be reminded later.",
          },
        }),
        defineSelectField({
          name: "paymentOption",
          label: "Payment Option",
          options: [
            { label: "Bank Transfer", value: "bank_transfer" },
            { label: "Buy Item Directly", value: "purchase_link" },
            { label: "Bring to Wedding", value: "bring_to_wedding" },
          ],
          admin: { width: "50%" },
        }),
        defineDateTimeField({
          name: "reservedAt",
          label: "Reserved At",
          admin: {
            readOnly: true,
            width: "50%",
          },
        }),
      ],
    }),
  ],
  access: {
    read: true,
    create: "user != null",
    update: "false",
    delete: "user != null",
  },
  hooks: {
    beforeChange: [reserveItem as any],
    afterDelete: [releaseReservation as any],
  },
});
