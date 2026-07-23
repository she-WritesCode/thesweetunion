import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { sendEmail } from "~~/dyrected/mailer";
import { adminWishlistNotificationEmail } from "~~/dyrected/emails";

const MIN_CONTRIBUTION = 5000;

async function recomputeItemStats(client: any, itemId: string) {
  const item = await client.findOne("wishlist_items", itemId);
  const reservations = await client.collection("reservations").find({
    where: { item: { equals: itemId } },
    limit: 1000,
  });

  let amountRaised = 0;
  let contributorCount = 0;
  let reservedCount = 0;

  for (const r of reservations.docs) {
    if (r.intent === "contribute" && r.contributionAmount && r.contributionAmount > 0) {
      amountRaised += r.contributionAmount;
      contributorCount += 1;
    } else if ((item?.fundingType || "fixed") === "fixed" && r.intent === "reserve") {
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
  const {
    itemId,
    guestName,
    paymentTiming,
    intent,
    contributionAmount,
    reminderAt,
    reminderChannel,
    reminderContact,
    paymentOption,
  } = body;

  if (!itemId) {
    throw createError({ statusCode: 400, message: "Missing item ID" });
  }
  if (!guestName?.trim()) {
    throw createError({ statusCode: 400, message: "Please enter your name." });
  }
  if (paymentTiming !== "now" && paymentTiming !== "later") {
    throw createError({ statusCode: 400, message: "Please choose whether you are paying now or later." });
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

  const isCrowdfund = item.fundingType === "crowdfund";
  const normalizedIntent = intent || (isCrowdfund ? (paymentTiming === "now" ? "contribute" : "reminder") : "reserve");
  const trimmedReminderContact = reminderContact?.trim() || "";

  if (paymentTiming === "later" && paymentOption !== "bring_to_wedding") {
    if (!reminderAt) {
      throw createError({ statusCode: 400, message: "Please choose when you would like to be reminded." });
    }
    if (!trimmedReminderContact || !["whatsapp", "email"].includes(reminderChannel)) {
      throw createError({ statusCode: 400, message: "Please add one contact method for your reminder." });
    }
  }

  // Compute current stats from reservations (source of truth)
  const currentStats = await recomputeItemStats(client, itemId);

  if (isCrowdfund) {
    if (paymentTiming === "now" && (!contributionAmount || contributionAmount < MIN_CONTRIBUTION)) {
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
    guestName: guestName.trim(),
    intent: normalizedIntent,
    paymentTiming,
    reminderAt: paymentTiming === "later" ? reminderAt : undefined,
    reminderChannel: paymentTiming === "later" ? reminderChannel : undefined,
    reminderContact: paymentTiming === "later" ? trimmedReminderContact : undefined,
    paymentOption: paymentOption || (isCrowdfund ? "bank_transfer" : undefined),
    contributionAmount: isCrowdfund && paymentTiming === "now" ? contributionAmount : undefined,
    reservedAt: new Date().toISOString(),
  });

  // Recompute stats after adding the new reservation
  const finalStats = await recomputeItemStats(client, itemId);

  // Admin notification — fire and forget
  try {
    const adminsRes = await client.collection("admins").find({ limit: 20 });
    const adminEmails: string[] = adminsRes.docs.map((a: any) => a.email).filter(Boolean);
    if (adminEmails.length) {
      const appUrl: string = (config.public as any).appUrl || "http://localhost:3000";
      sendEmail({
        to: adminEmails.join(","),
        subject: `New Registry ${normalizedIntent === "contribute" ? "Contribution" : normalizedIntent === "reminder" ? "Reminder" : "Reservation"}: ${guestName.trim()} — ${item.name}`,
        html: adminWishlistNotificationEmail({
          guestName: guestName.trim(),
          itemName: item.name,
          fundingType: item.fundingType,
          paymentTiming,
          intent: normalizedIntent,
          contributionAmount: isCrowdfund && paymentTiming === "now" ? contributionAmount : undefined,
          reminderAt: paymentTiming === "later" ? reminderAt : undefined,
          reminderChannel: paymentTiming === "later" ? reminderChannel : undefined,
          reminderContact: paymentTiming === "later" ? trimmedReminderContact : undefined,
          paymentOption: paymentOption || (isCrowdfund ? "bank_transfer" : undefined),
          dashboardLink: `${appUrl}/admin`,
        }),
      }).catch(console.error);
    }
  } catch (adminErr) {
    console.error("Failed to send admin registry email:", adminErr);
  }

  return { success: true, reservation, stats: finalStats };
});
