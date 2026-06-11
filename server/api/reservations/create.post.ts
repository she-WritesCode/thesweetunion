import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { sendEmail } from "~~/dyrected/mailer";
import { wishlistFixedConfirmationEmail, wishlistCrowdfundConfirmationEmail, adminWishlistNotificationEmail } from "~~/dyrected/emails";

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
    baseUrl: config.dyrectedUrl,
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

  const isCrowdfund = item.fundingType === "crowdfund";
  const effectiveAnonymous = !!isAnonymous && isCrowdfund;

  // Create the reservation record
  const reservation = await client.collection("reservations").create({
    item: itemId,
    guestName: effectiveAnonymous ? "Anonymous" : guestName,
    guestEmail: guestEmail || "",
    guestPhone: guestPhone || "",
    message: message || "",
    contributionAmount: isCrowdfund ? contributionAmount : undefined,
    reservedAt: new Date().toISOString(),
  });

  // Recompute stats after adding the new reservation
  const finalStats = await recomputeItemStats(client, itemId);

  // Send email if guest provided an email address
  if (guestEmail && guestEmail.trim() !== "") {
    try {
      if (isCrowdfund) {
        // Fetch site settings global for bank details
        let siteSettings: any = null;
        try {
          siteSettings = await $fetch("/api/globals/site_settings");
        } catch (e) {
          console.error("Failed to fetch site settings in reservation backend:", e);
        }

        const bankName = siteSettings?.bankName || "Guaranty Trust Bank (GTBank)";
        const accountNumber = siteSettings?.accountNumber || "0123456789";
        const accountName = siteSettings?.accountName || "Uche & Adun Wedding Account";

        sendEmail({
          to: guestEmail,
          subject: `Thank you for contributing to our ${item.name}! 💖`,
          html: wishlistCrowdfundConfirmationEmail({
            guestName: effectiveAnonymous ? "Anonymous" : guestName,
            itemName: item.name,
            contributionAmount,
            bankName,
            accountNumber,
            accountName,
          }),
        }).catch(console.error);
      } else {
        sendEmail({
          to: guestEmail,
          subject: `Thank you for your registry gift: ${item.name}! 🎁`,
          html: wishlistFixedConfirmationEmail({
            guestName: guestName, // Fixed gifts are never anonymous
            itemName: item.name,
            itemLink: item.link,
          }),
        }).catch(console.error);
      }
    } catch (mailErr) {
      console.error("Error preparing email send:", mailErr);
    }
  }

  // Admin notification — fire and forget
  try {
    const adminsRes = await client.collection("admins").find({ limit: 20 });
    const adminEmails: string[] = adminsRes.docs.map((a: any) => a.email).filter(Boolean);
    if (adminEmails.length) {
      const appUrl: string = (config.public as any).appUrl || "http://localhost:3000";
      sendEmail({
        to: adminEmails.join(","),
        subject: `New Registry ${isCrowdfund ? 'Contribution' : 'Reservation'}: ${effectiveAnonymous ? 'Anonymous' : guestName} — ${item.name}`,
        html: adminWishlistNotificationEmail({
          guestName: effectiveAnonymous ? "Anonymous" : guestName,
          guestEmail: guestEmail || undefined,
          guestPhone: guestPhone || undefined,
          itemName: item.name,
          fundingType: item.fundingType,
          contributionAmount: isCrowdfund ? contributionAmount : undefined,
          message: message || undefined,
          dashboardLink: `${appUrl}/admin`,
        }),
      }).catch(console.error);
    }
  } catch (adminErr) {
    console.error("Failed to send admin registry email:", adminErr);
  }

  return { success: true, reservation, stats: finalStats };
});
