import { createError, getHeader, getCookie, type H3Event } from "h3";
import { jwtVerify } from "jose";
import { createClient } from "@dyrected/sdk";

/**
 * Verifies the admin session. Ushers (role "usher") are rejected unless the
 * route explicitly opts in with `{ allowUsher: true }` (check-in routes only).
 * Accounts without a role are treated as full admins.
 */
export async function requireAdmin(event: H3Event, opts: { allowUsher?: boolean } = {}) {
  const authorization = getHeader(event, "authorization");
  let token = authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    token = getCookie(event, "__dyrected_token") || getCookie(event, "dyrected_token");
  }

  const secret = process.env.DYRECTED_JWT_SECRET || process.env.JWT_SECRET;

  if (!token || !secret) {
    throw createError({ statusCode: 401, message: "Admin authentication required." });
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (payload.collection !== "admins" || !payload.sub) throw new Error("Not an admin token");
    if (!opts.allowUsher) {
      // The session token carries no role, so look it up on the admin record.
      const config = useRuntimeConfig();
      const client = createClient({ baseUrl: config.dyrectedUrl, apiKey: config.dyrectedApiKey });
      const res = await client.collection("admins").find({ where: { id: { equals: String(payload.sub) } }, limit: 1, depth: 0 });
      const role = (res.docs?.[0] as any)?.role;
      if (role === "usher") {
        throw createError({ statusCode: 403, message: "Ushers can only access check-in." });
      }
    }
    return payload;
  } catch (err: any) {
    if (err?.statusCode === 403) throw err;
    throw createError({ statusCode: 401, message: "Invalid or expired admin session." });
  }
}
