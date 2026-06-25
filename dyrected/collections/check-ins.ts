import type { CollectionConfig } from "@dyrected/core";
import { stampCheckInTime } from "../hooks/check-in-hooks.ts";

export const checkIns: CollectionConfig = {
  slug: "check_ins",
  labels: { singular: "Check-in", plural: "Check-ins" },
  admin: {
    useAsTitle: "guestName",
    defaultColumns: ["guestName", "partySize", "event", "scannedBy", "createdAt"],
    group: "RSVP",
  },
  fields: [
    // ── Scanner tab ───────────────────────────────────────────────────────────
    // Staff open "Add New Check-in", land here, and scan. The component creates
    // the check-in record via API — no need to click Save.
    {
      name: "checkInScanner",
      type: "json",
      label: "Check-in Scanner",
      admin: {
        tab: "Scanner",
        component: "check_ins.checkInScanner",
        description: "Scan a guest's QR code or enter the code manually to check them in.",
      },
    },

    // ── Record tab ────────────────────────────────────────────────────────────
    // Auto-populated after a successful scan. Read-only fields show what was
    // recorded; scannedBy and notes can be edited after the fact.
    {
      name: "rsvpRecord",
      type: "relationship",
      label: "RSVP Record",
      relationTo: "rsvp_records",
      required: true,
      admin: { tab: "Record", readOnly: true, width: "50%" },
    },
    {
      name: "event",
      type: "relationship",
      label: "Event",
      relationTo: "events",
      admin: { tab: "Record", readOnly: true, width: "50%" },
    },
    {
      name: "guestName",
      type: "text",
      label: "Guest Name",
      admin: { tab: "Record", readOnly: true, width: "50%" },
    },
    {
      name: "partySize",
      type: "number",
      label: "Party Size",
      defaultValue: 1,
      admin: { tab: "Record", readOnly: true, width: "50%" },
    },
    {
      name: "createdAt",
      type: "date",
      label: "Check-in Time",
      admin: { tab: "Record", readOnly: true, width: "50%" },
    },
    {
      name: "scannedBy",
      type: "text",
      label: "Scanned By",
      admin: { tab: "Record", readOnly: true, width: "50%" },
    },
    {
      name: "notes",
      type: "textarea",
      label: "Staff Notes",
      admin: { tab: "Record" },
    },
  ],
  access: {
    read: "user != null",
    create: "user != null",
    update: "user != null",
    delete: "user != null",
  },
  hooks: {
    beforeChange: [stampCheckInTime],
  },
};
