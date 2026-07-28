import type { CollectionBeforeChangeHook, CollectionAfterDeleteHook } from "@dyrected/core";
import type { Reservations } from "~/dyrected-types";

export const reserveItem: CollectionBeforeChangeHook<Reservations> = async ({ data, operation }: any) => {
  if (operation === "create") {
    data.reservedAt = new Date().toISOString();
  }
  return data;
};

// NOTE: AfterDelete hook for releasing reservations is handled by the
// /api/reservations/release endpoint instead, because Dyrected hooks
// don't have access to the DB client directly.
export const releaseReservation: CollectionAfterDeleteHook = async ({ doc, db }: any) => {
  const itemId = typeof doc?.item === "object" && doc?.item !== null ? doc.item.id : doc?.item;
  if (!itemId || !db) return;

  try {
    const reservationsRes = await db.findMany("reservations", {
      where: { item: itemId },
      limit: 1000,
    });

    const docs = Array.isArray(reservationsRes) ? reservationsRes : reservationsRes?.docs || [];

    let amountRaised = 0;
    let contributorCount = 0;
    let reservedCount = 0;

    for (const r of docs) {
      if (r.intent === "contribute" && r.contributionAmount && r.contributionAmount > 0) {
        amountRaised += r.contributionAmount;
        contributorCount += 1;
      } else if (r.intent === "reserve") {
        reservedCount += 1;
      }
    }

    await db.update("wishlist_items", itemId, {
      amountRaised,
      contributorCount,
      reservedCount,
    });
  } catch (err) {
    console.error("Error updating wishlist_items stats on reservation delete:", err);
  }
};
