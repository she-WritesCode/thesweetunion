import { parsePhoneNumber, isValidPhoneNumber, type CountryCode } from "libphonenumber-js";

/**
 * Normalises a phone number to E.164 international format.
 *
 * Rules:
 *   - If the number already starts with "+", parse it directly.
 *   - If it starts with "0" (local Nigerian format, e.g. "08012345678"),
 *     strip the leading "0" and prepend "+234".
 *   - Otherwise, try to parse it as a number from `defaultCountry`.
 *   - If libphonenumber-js can parse and validate it, return the E.164 form.
 *   - Fallback: strip all non-digits and prepend "+234" for 10-digit Nigerian
 *     numbers (e.g. "8012345678") or return the value as-is if unrecognised.
 */
export function formatPhoneNumber(
  phone: string,
  defaultCountry: CountryCode = "NG",
): string {
  if (!phone) return phone;

  const trimmed = phone.trim();
  if (!trimmed) return trimmed;

  // If it already has a + prefix, try to parse directly
  if (trimmed.startsWith("+")) {
    try {
      const parsed = parsePhoneNumber(trimmed);
      if (parsed && parsed.isValid()) {
        return parsed.format("E.164");
      }
    } catch {
      // fall through
    }
    return trimmed;
  }

  // Local 0XX format → strip leading 0, prepend +234
  if (trimmed.startsWith("0")) {
    const withCountry = `+234${trimmed.slice(1)}`;
    try {
      const parsed = parsePhoneNumber(withCountry);
      if (parsed && parsed.isValid()) {
        return parsed.format("E.164");
      }
    } catch {
      // fall through
    }
    // Return best-effort anyway
    return withCountry;
  }

  // Try parsing as-is with default country context
  try {
    const parsed = parsePhoneNumber(trimmed, defaultCountry);
    if (parsed && parsed.isValid()) {
      return parsed.format("E.164");
    }
  } catch {
    // fall through
  }

  // Last resort: strip non-digits and assume NG if 10 digits
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return `+234${digitsOnly}`;
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    return `+234${digitsOnly.slice(1)}`;
  }
  if (digitsOnly.length === 13 && digitsOnly.startsWith("234")) {
    return `+${digitsOnly}`;
  }

  return trimmed;
}
