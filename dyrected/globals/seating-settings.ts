import { defineGlobal, defineArrayField, defineNumberField, defineTextField } from "@dyrected/core";

/**
 * Per-table overrides for the reception floor plan (config/seating.ts holds the
 * geometry and default capacities). Edited from the Seating Planner page.
 */
export const seatingSettings = defineGlobal({
  slug: "seating_settings",
  label: "Seating Settings",
  detail: false,
  admin: { icon: "Armchair" },
  fields: [
    defineArrayField({
      name: "tables",
      label: "Table Overrides",
      admin: { description: "Managed from the Seating Planner. Only tables that differ from the defaults are listed." },
      fields: [
        defineNumberField({ name: "number", label: "Table Number", required: true }),
        defineTextField({ name: "label", label: "Table Name (e.g. Family, VIP)" }),
        defineNumberField({ name: "capacity", label: "Seats" }),
      ],
    }),
  ],
  access: {
    read: "true",
    update: "user != null",
  },
});
