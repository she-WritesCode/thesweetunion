import type { CollectionBeforeChangeHook } from "@dyrected/core";

// Stamps submittedAt and generates an editToken on new records.
// Capacity enforcement and duplicate-email checks happen in the
// /api/rsvp/submit route where the SDK client is available.
export const enforceRsvpCapacity: CollectionBeforeChangeHook = ({ data, operation }) => {
  if (operation !== "create") return data;

  data.submittedAt = new Date().toISOString();
  if (!data.editToken) {
    data.editToken = crypto.randomUUID();
  }

  return data;
};
