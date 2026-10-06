import { defineEventHandler, readBody, createError, getRequestHost } from "h3";
import { createClient } from "@dyrected/sdk";

async function findOne(client: any, slug: string, id: string) {
  const res = await client.collection(slug).find({ where: { id: { equals: id } }, limit: 1, depth: 1 });
  return res.docs?.[0] ?? null;
}

export async function recomputeWishlistItemStats(client: any, itemId: string) {
  const item = await findOne(client, "wishlist_items", itemId);
  if (!item) return null;

  const reservationsRes = await client.collection("reservations").find({
    where: { item: { equals: itemId } },
    limit: 1000,
  });

  let amountRaised = 0;
  let contributorCount = 0;
  let reservedCount = 0;

  for (const r of reservationsRes.docs || []) {
    // If the reservation was cancelled/released, skip it
    if (r.giftStatus === "cancelled") {
      continue;
    }

    const qty = Math.max(1, Number((r as any).quantity) || 1);
    const amount = Number(r.amountReceived) || Number(r.contributionAmount) || 0;

    if ((item?.fundingType || "fixed") === "crowdfund") {
      // For crowdfund: count if contributed or if confirmed received/delivered
      if (
        r.intent === "contribute" ||
        r.giftStatus === "received" ||
        r.giftStatus === "delivered" ||
        amount > 0
      ) {
        if (amount > 0) {
          amountRaised += amount;
          contributorCount += 1;
        }
      }
    } else {
      // For fixed items: count towards reservedCount if not cancelled
      if (r.intent === "reserve" || r.giftStatus !== "cancelled") {
        reservedCount += qty;
      }
    }
  }

  await client.collection("wishlist_items").update(itemId, {
    amountRaised,
    contributorCount,
    reservedCount,
  });

  return { amountRaised, contributorCount, reservedCount };
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { id, giftStatus, amountReceived, giftReceivedAt, giftNotes } = body;

  if (!id) {
    throw createError({ statusCode: 400, message: "Missing reservation ID" });
  }

  const validStatuses = ["pending", "received", "delivered", "cancelled"];
  if (giftStatus && !validStatuses.includes(giftStatus)) {
    throw createError({ statusCode: 400, message: `Invalid gift status: ${giftStatus}` });
  }

  const config = useRuntimeConfig();
  const host = getRequestHost(event, { xForwardedHost: true });
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const dyrectedUrl =
    process.env.NUXT_PUBLIC_DYRECTED_URL ||
    (config.dyrectedUrl && !config.dyrectedUrl.includes("localhost:3000")
      ? config.dyrectedUrl
      : `${protocol}://${host}/api/dyrected`);

  const client = createClient({
    baseUrl: dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const reservation = await findOne(client, "reservations", id);
  if (!reservation) {
    throw createError({ statusCode: 404, message: "Reservation not found" });
  }

  const newStatus = giftStatus || reservation.giftStatus || "pending";
  const updateData: Record<string, any> = {
    giftStatus: newStatus,
  };

  if (giftNotes !== undefined) {
    updateData.giftNotes = giftNotes;
  }

  if (newStatus === "received" || newStatus === "delivered") {
    updateData.giftReceivedAt = giftReceivedAt || reservation.giftReceivedAt || new Date().toISOString();
    updateData.amountReceived =
      amountReceived !== undefined && amountReceived !== null && amountReceived !== ""
        ? Number(amountReceived)
        : reservation.amountReceived !== undefined && reservation.amountReceived !== null
        ? Number(reservation.amountReceived)
        : Number(reservation.contributionAmount) || 0;
  } else if (newStatus === "pending") {
    if (amountReceived !== undefined) {
      updateData.amountReceived = Number(amountReceived) || 0;
    }
    if (giftReceivedAt !== undefined) {
      updateData.giftReceivedAt = giftReceivedAt;
    }
  } else if (newStatus === "cancelled") {
    if (amountReceived !== undefined) {
      updateData.amountReceived = 0;
    }
  }

  const updatedReservation = await client.collection("reservations").update(id, updateData);

  // Recompute stats for the wishlist item
  const itemId =
    typeof reservation.item === "object" && reservation.item !== null
      ? reservation.item.id
      : reservation.item;

  let itemStats = null;
  if (itemId) {
    try {
      itemStats = await recomputeWishlistItemStats(client, itemId);
    } catch (statErr) {
      console.error("Error recomputing wishlist item stats:", statErr);
    }
  }

  return {
    success: true,
    reservation: updatedReservation,
    itemStats,
  };
});
