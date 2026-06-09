import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";

const MIN_CONTRIBUTION = 5000;

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

  if (item.fundingType === "crowdfund") {
    // Crowdfund: validate contribution amount
    if (!contributionAmount || contributionAmount < MIN_CONTRIBUTION) {
      throw createError({ statusCode: 400, message: `Minimum contribution is ₦${MIN_CONTRIBUTION.toLocaleString()}.` });
    }

    // Check if fund goal already reached
    if (item.price > 0 && (item.amountRaised ?? 0) >= item.price) {
      throw createError({ statusCode: 400, message: "This fund has been fully raised. Thank you!" });
    }

    // Update amountRaised and contributorCount
    await client.collection("wishlist_items").update(itemId, {
      amountRaised: (item.amountRaised ?? 0) + contributionAmount,
      contributorCount: (item.contributorCount ?? 0) + 1,
    });
  } else {
    // Fixed: increment reservedCount
    if ((item.reservedCount ?? 0) >= item.maxQuantity) {
      throw createError({ statusCode: 400, message: "Sorry, this gift was just taken. Please choose another." });
    }

    await client.collection("wishlist_items").update(itemId, {
      reservedCount: (item.reservedCount ?? 0) + 1,
    });
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

  return { success: true, reservation };
});
