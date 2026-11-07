/** Normalise a Nigerian/E.164 phone number to digits only, country code first (e.g. 2348012345678). */
export function normalizeWhatsAppNumber(raw: string): string {
  let digits = (raw || "").trim().replace(/\D/g, "");
  if (!digits) return "";

  // Guard against duplicate country codes (e.g. 2342348...)
  while (digits.startsWith("234234")) {
    digits = digits.slice(3);
  }

  // Nigerian local standard: 080..., 070..., 081..., 090... -> strip 0 and prepend 234
  if (digits.startsWith("0")) {
    return `234${digits.slice(1)}`;
  }

  // Already prefixed with 234 (e.g. 2348012345678)
  if (digits.startsWith("234")) {
    return digits;
  }

  // 10-digit Nigerian number without leading 0 (e.g. 8012345678)
  if (digits.length === 10) {
    return `234${digits}`;
  }

  // Any other international number
  return digits;
}

/** Send a text or image message through a self-hosted WAHA instance (https://waha.devlike.pro). */
export async function sendWhatsApp({
  to,
  text,
  imageUrl,
  session,
}: {
  to: string;
  text: string;
  imageUrl?: string;
  session?: string;
}) {
  const config = useRuntimeConfig();
  const baseUrl = (config.wahaUrl as string).replace(/\/+$/, "");
  const apiKey = config.wahaApiKey as string;
  const targetSession = session || (config.wahaSession as string) || "default";

  if (!baseUrl) {
    throw new Error("WAHA is not configured (WAHA_URL).");
  }

  const chatId = `${normalizeWhatsAppNumber(to)}@c.us`;

  // If an image URL is provided, try sending as an image with caption via WAHA
  if (imageUrl) {
    try {
      const res = await fetch(`${baseUrl}/api/sendImage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(apiKey ? { "X-Api-Key": apiKey } : {}),
        },
        body: JSON.stringify({
          session: targetSession,
          chatId,
          file: {
            url: imageUrl,
            mimetype: "image/png",
            filename: "wedding-pass.png",
          },
          caption: text,
        }),
      });

      const json: any = await res.json().catch(() => ({}));
      if (res.ok) {
        return json;
      }
      console.warn(`WAHA sendImage failed (${res.status}), falling back to sendText:`, json);
    } catch (imgErr) {
      console.warn("WAHA sendImage exception, falling back to sendText:", imgErr);
    }
  }

  const res = await fetch(`${baseUrl}/api/sendText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(apiKey ? { "X-Api-Key": apiKey } : {}),
    },
    body: JSON.stringify({ session: targetSession, chatId, text }),
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`WAHA send failed (${res.status}): ${json?.message || JSON.stringify(json)}`);
  }
  return json;
}
