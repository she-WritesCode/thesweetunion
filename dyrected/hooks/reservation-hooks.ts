import type { CollectionBeforeChangeHook, CollectionAfterDeleteHook } from "@dyrected/core";

const MIN_CONTRIBUTION = 5000;

export const reserveItem: CollectionBeforeChangeHook = async ({ data, operation, req }: any) => {
  if (operation === "create") {
    data.reservedAt = new Date().toISOString();

    const itemId = typeof data.item === "object" ? data.item.id : data.item;
    const item = await req.db.findByID({ collection: "wishlist_items", id: itemId });

    if (!item) {
      throw new Error("Wishlist item not found.");
    }

    if (item.fundingType === "crowdfund") {
      // Crowdfund: validate contribution amount and update amountRaised/contributorCount
      const amount = data.contributionAmount;
      if (!amount || amount < MIN_CONTRIBUTION) {
        throw new Error(`Minimum contribution is ₦${MIN_CONTRIBUTION.toLocaleString()}.`);
      }

      // If item has a goal (price > 0), check it's not already fully funded
      if (item.price > 0 && item.amountRaised >= item.price) {
        throw new Error("This fund has been fully raised. Thank you!");
      }

      await req.db.update({
        collection: "wishlist_items",
        id: itemId,
        data: {
          amountRaised: { $increment: amount },
          contributorCount: { $increment: 1 },
        },
      });
    } else {
      // Fixed: increment reservedCount (existing logic)
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
  }
  return data;
};

export const releaseReservation: CollectionAfterDeleteHook = async ({ doc, req }: any) => {
  const itemId = doc.item?.id || doc.item;
  const item = await req.db.findByID({ collection: "wishlist_items", id: itemId });

  if (!item) return;

  if (item.fundingType === "crowdfund") {
    // Crowdfund: decrement amountRaised and contributorCount
    const amount = doc.contributionAmount || 0;
    await req.db.update({
      collection: "wishlist_items",
      id: itemId,
      data: {
        amountRaised: { $decrement: amount },
        contributorCount: { $decrement: 1 },
      },
    });
  } else {
    // Fixed: decrement reservedCount
    await req.db.update({
      collection: "wishlist_items",
      id: itemId,
      data: { reservedCount: { $decrement: 1 } },
    });
  }
};
