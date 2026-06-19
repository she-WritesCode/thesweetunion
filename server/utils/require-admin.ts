import { createError, getHeader, type H3Event } from "h3";
import { jwtVerify } from "jose";

export async function requireAdmin(event: H3Event) {
  const authorization = getHeader(event, "authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");
  const secret = process.env.DYRECTED_JWT_SECRET || process.env.JWT_SECRET;

  if (!token || !secret) {
    throw createError({ statusCode: 401, message: "Admin authentication required." });
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (payload.collection !== "admins" || !payload.sub) throw new Error("Not an admin token");
    return payload;
  } catch {
    throw createError({ statusCode: 401, message: "Invalid or expired admin session." });
  }
}
