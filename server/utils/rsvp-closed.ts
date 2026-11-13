import { createError } from "h3";

/**
 * Throws 403 when the couple has switched on "Close All RSVPs" in Site Settings.
 * Fails open if settings cannot be read, so a CMS hiccup doesn't lock guests out.
 */
export async function assertRsvpOpen(client: any) {
  const settings = (await client
    .global("site_settings")
    .get({ depth: 0 })
    .catch(() => null)) as any;
  if (settings?.rsvpClosed === true || String(settings?.rsvpClosed) === "true") {
    throw createError({
      statusCode: 403,
      statusMessage: "RSVP closed",
      message: "RSVPs are now closed. Please contact the couple directly.",
    });
  }
}
