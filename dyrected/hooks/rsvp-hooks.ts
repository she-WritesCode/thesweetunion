import type { CollectionBeforeChangeHook } from "@dyrected/core";
import { formatPhoneNumber } from "../../utils/phone.ts";

/** Generate a random 6-character alphanumeric pass code (excluding confusing chars like 0, O, 1, I) */
export function generatePassCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Stamps submittedAt and generates an editToken and passCode on new records.
// Also normalises leadPhone to E.164 (e.g. +2348012345678) on every save.
// Capacity enforcement and duplicate-email checks happen in the
// /api/rsvp/submit route where the SDK client is available.
export const enforceRsvpCapacity: CollectionBeforeChangeHook = ({ data, operation }) => {
  // Normalize phone number to international E.164 format
  if (data.leadPhone && typeof data.leadPhone === "string") {
    data.leadPhone = formatPhoneNumber(data.leadPhone);
  }

  // Always normalize passCode to uppercase if provided
  if (data.passCode && typeof data.passCode === "string") {
    data.passCode = data.passCode.toUpperCase().trim();
  }

  // Ensure passCode is only generated on initial create, NEVER regenerated on update
  if (operation === "create" && !data.passCode) {
    data.passCode = generatePassCode();
  }

  if (operation !== "create") return data;

  data.submittedAt = new Date().toISOString();
  if (!data.editToken) {
    data.editToken = crypto.randomUUID();
  }

  return data;
};
