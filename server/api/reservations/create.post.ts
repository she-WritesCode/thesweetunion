import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";

const MIN_CONTRIBUTION = 5000;

async function recomputeItemStats(client: any, itemId: string) {
  const reservations = await client.collection("reservations").find({
    where: { item: { equals: itemId } },
    limit: 1000,
  });

  let amountRaised = 0;
  let contributorCount = 0;
  let reservedCount = 0;

  for (const r of reservations.docs) {
    if (r.contributionAmount && r.contributionAmount > 0) {
      amountRaised += r.contributionAmount;
      contributorCount += 1;
    } else {
      reservedCount += 1;
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
  const { itemId, guestName, guestEmail, guestPhone, message, contributionAmount, isAnonymous } = body;

  if (!itemId) {
    throw createError({ statusCode: 400, message: "Missing item ID" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.public.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  // Fetch the wishlist item
  const item = await client.findOne("wishlist_items", itemId);

  if (!item) {
    throw createError({ statusCode: 404, message: "Wishlist item not found." });
  }

  // Compute current stats from reservations (source of truth)
  const currentStats = await recomputeItemStats(client, itemId);

  if (item.fundingType === "crowdfund") {
    if (!contributionAmount || contributionAmount < MIN_CONTRIBUTION) {
      throw createError({ statusCode: 400, message: `Minimum contribution is ₦${MIN_CONTRIBUTION.toLocaleString()}.` });
    }

    if (item.price > 0 && currentStats.amountRaised >= item.price) {
      throw createError({ statusCode: 400, message: "This fund has been fully raised. Thank you!" });
    }
  } else {
    if (currentStats.reservedCount >= item.maxQuantity) {
      throw createError({ statusCode: 400, message: "Sorry, this gift was just taken. Please choose another." });
    }
  }

  // Create the reservation record
  const reservation = await client.collection("reservations").create({
    item: itemId,
    guestName: isAnonymous ? "Anonymous" : guestName,
    guestEmail: guestEmail || "",
    guestPhone: guestPhone || "",
    message: message || "",
    contributionAmount: item.fundingType === "crowdfund" ? contributionAmount : undefined,
    reservedAt: new Date().toISOString(),
  });

  // Recompute stats after adding the new reservation
  const finalStats = await recomputeItemStats(client, itemId);

  return { success: true, reservation, stats: finalStats };
});
