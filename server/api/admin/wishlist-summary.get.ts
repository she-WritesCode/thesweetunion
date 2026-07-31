import { defineEventHandler } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const client = createClient({
    baseUrl: config.public.dyrectedUrl || config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  try {
    const wishlistRes = await client.collection("wishlist_items").find({ limit: 1000, depth: 1 });
    const wishlistDocs = wishlistRes?.docs || [];

    let totalRegistryTarget = 0;
    let totalAmountRaised = 0;
    let fullyReservedCount = 0;
    let partiallyFundedCount = 0;
    let unclaimedCount = 0;

    for (const item of wishlistDocs) {
      const price = Number(item.price) || 0;
      const raised = Number(item.amountRaised) || 0;
      const reservedCount = Number(item.reservedCount) || 0;
      const maxQty = Number(item.maxQuantity) || 1;

      if (price > 0) {
        totalRegistryTarget += price * maxQty;
      }
      totalAmountRaised += raised;

      if (item.fundingType === "full") {
        if (reservedCount >= maxQty) {
          fullyReservedCount++;
        } else {
          unclaimedCount++;
        }
      } else {
        if (raised >= price && price > 0) {
          fullyReservedCount++;
        } else if (raised > 0) {
          partiallyFundedCount++;
        } else {
          unclaimedCount++;
        }
      }
    }

    const registryFulfillmentPct =
      totalRegistryTarget > 0
        ? Math.min(100, Math.round((totalAmountRaised / totalRegistryTarget) * 100))
        : 0;

    return {
      success: true,
      data: {
        totalItems: wishlistDocs.length,
        totalRegistryTarget,
        totalAmountRaised,
        registryFulfillmentPct,
        fullyReservedCount,
        partiallyFundedCount,
        unclaimedCount,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to calculate wishlist summary",
    };
  }
});
