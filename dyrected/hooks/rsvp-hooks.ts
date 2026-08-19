import type { CollectionBeforeChangeHook } from "@dyrected/core";
import { formatPhoneNumber } from "../../utils/phone.ts";

// Stamps submittedAt and generates an editToken on new records.
// Also normalises leadPhone to E.164 (e.g. +2348012345678) on every save.
// Capacity enforcement and duplicate-email checks happen in the
// /api/rsvp/submit route where the SDK client is available.
export const enforceRsvpCapacity: CollectionBeforeChangeHook = ({ data, operation }) => {
  // Normalize phone number to international E.164 format
  if (data.leadPhone && typeof data.leadPhone === "string") {
    data.leadPhone = formatPhoneNumber(data.leadPhone);
  }

  if (operation !== "create") return data;

  data.submittedAt = new Date().toISOString();
  if (!data.editToken) {
    data.editToken = crypto.randomUUID();
  }

  return data;
};
