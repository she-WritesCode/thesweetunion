import {
  defineCollection,
  defineTab,
  defineJsonField,
  defineRelationshipField,
  defineTextField,
  defineNumberField,
  defineDateField,
  defineTextareaField,
} from "@dyrected/core";
import { stampCheckInTime } from "../hooks/check-in-hooks.ts";

export const checkIns = defineCollection({
  slug: "check_ins",
  labels: { singular: "Check-in", plural: "Check-ins" },
  admin: {
    icon: "TicketCheck",
    useAsTitle: "guestName",
    defaultColumns: ["guestName", "partySize", "event", "scannedBy", "createdAt"],
    group: "RSVP",
  },
  fields: [
    ...defineTab({
      label: "Scanner",
      fields: [
        defineJsonField({
          name: "checkInScanner",
          label: "Check-in Scanner",
          admin: {
            component: "check_ins.checkInScanner",
            description: "Scan a guest's QR code or enter the code manually to check them in.",
          },
        }),
      ],
    }),

    ...defineTab({
      label: "Record",
      fields: [
        defineRelationshipField({
          name: "rsvpRecord",
          label: "RSVP Record",
          relationTo: "rsvp_records",
          required: true,
          admin: { readOnly: true, width: "50%" },
        }),
        defineRelationshipField({
          name: "event",
          label: "Event",
          relationTo: "events",
          admin: { readOnly: true, width: "50%" },
        }),
        defineTextField({
          name: "guestName",
          label: "Guest Name",
          admin: { readOnly: true, width: "50%" },
        }),
        defineNumberField({
          name: "partySize",
          label: "Party Size",
          defaultValue: 1,
          admin: { readOnly: true, width: "50%" },
        }),
        defineDateField({
          name: "createdAt",
          label: "Check-in Time",
          admin: { readOnly: true, width: "50%" },
        }),
        defineTextField({
          name: "scannedBy",
          label: "Scanned By",
          admin: { readOnly: true, width: "50%" },
        }),
        defineTextareaField({
          name: "notes",
          label: "Staff Notes",
        }),
      ],
    }),
  ],
  access: {
    read: "user != null",
    create: "user != null",
    update: "user != null",
    delete: "user != null",
  },
  hooks: {
    beforeChange: [stampCheckInTime as any],
  },
});
