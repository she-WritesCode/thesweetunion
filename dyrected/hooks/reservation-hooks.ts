import type { CollectionBeforeChangeHook, CollectionAfterDeleteHook } from "@dyrected/core";

export const reserveItem: CollectionBeforeChangeHook = async ({ data, operation, req }: any) => {
  if (operation === "create") {
    data.reservedAt = new Date().toISOString();

    const itemId = typeof data.item === "object" ? data.item.id : data.item;
    const result = await req.db.update({
      collection: "wishlist_items",
      id: itemId,
      data: { reservedCount: { $increment: 1 } },
      where: { reservedCount: { $lt: "{maxQuantity}" } },
    });

    if (!result) {
      throw new Error("Sorry, this gift was just taken. Please choose another.");
    }
  }
  return data;
};

export const releaseReservation: CollectionAfterDeleteHook = async ({ doc, req }: any) => {
  await req.db.update({
    collection: "wishlist_items",
    id: doc.item.id || doc.item,
    data: { reservedCount: { $decrement: 1 } },
  });
};
