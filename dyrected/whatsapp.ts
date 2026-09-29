/** Normalise a Nigerian/E.164 phone number to digits only, country code first (e.g. 2348012345678). */
export function normalizeWhatsAppNumber(raw: string): string {
  const value = (raw || "").trim();
  if (value.startsWith("+")) return value.replace(/\D/g, "");
  return `234${value.replace(/^0/, "").replace(/\D/g, "")}`;
}

/** Send a text message through a self-hosted WAHA instance (https://waha.devlike.pro). */
export async function sendWhatsApp({ to, text }: { to: string; text: string }) {
  const config = useRuntimeConfig();
  const baseUrl = (config.wahaUrl as string).replace(/\/+$/, "");
  const apiKey = config.wahaApiKey as string;
  const session = (config.wahaSession as string) || "default";

  if (!baseUrl) {
    throw new Error("WAHA is not configured (WAHA_URL).");
  }

  const res = await fetch(`${baseUrl}/api/sendText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(apiKey ? { "X-Api-Key": apiKey } : {}),
    },
    body: JSON.stringify({ session, chatId: `${normalizeWhatsAppNumber(to)}@c.us`, text }),
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`WAHA send failed (${res.status}): ${json?.message || JSON.stringify(json)}`);
  }
  return json;
}
