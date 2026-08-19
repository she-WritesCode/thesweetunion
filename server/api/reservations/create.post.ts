import { defineEventHandler, readBody, createError, getRequestHost } from "h3";
import { createClient } from "@dyrected/sdk";
import { sendEmail } from "~~/dyrected/mailer";
import { adminWishlistNotificationEmail } from "~~/dyrected/emails";

const MIN_CONTRIBUTION = 5000;

async function findOne(client: any, slug: string, id: string) {
  const res = await client.collection(slug).find({ where: { id: { equals: id } }, limit: 1 });
  return res.docs?.[0] ?? null;
}

async function recomputeItemStats(client: any, itemId: string) {
  const item = await findOne(client, "wishlist_items", itemId);
  const reservations = await client.collection("reservations").find({
    where: { item: { equals: itemId } },
    limit: 1000,
  });

  let amountRaised = 0;
  let contributorCount = 0;
  let reservedCount = 0;

  for (const r of reservations.docs) {
    const qty = Math.max(1, Number((r as any).quantity) || 1);
    if ((item?.fundingType || "fixed") === "crowdfund") {
      if (r.intent === "contribute" && r.contributionAmount && r.contributionAmount > 0) {
        amountRaised += r.contributionAmount;
        contributorCount += 1;
      }
    } else {
      if (r.intent === "reserve") {
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
  const {
    itemId,
    guestName,
    paymentTiming,
    intent,
    contributionAmount,
    quantity = 1,
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

  // Fetch the wishlist item
  const item = await findOne(client, "wishlist_items", itemId);

  if (!item) {
    throw createError({ statusCode: 404, message: "Wishlist item not found." });
  }

  const isCrowdfund = item.fundingType === "crowdfund";
  const normalizedIntent = intent || (isCrowdfund ? (paymentTiming === "now" ? "contribute" : "reminder") : "reserve");
  const trimmedReminderContact = reminderContact?.trim() || "";
  const reqQty = Math.max(1, parseInt(String(quantity), 10) || 1);

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
    if (!contributionAmount || Number(contributionAmount) < MIN_CONTRIBUTION) {
      throw createError({
        statusCode: 400,
        message: `Please choose a pledge/contribution amount (minimum ₦${MIN_CONTRIBUTION.toLocaleString()}).`,
      });
    }

    if (paymentTiming === "now" && item.price > 0 && currentStats.amountRaised >= item.price) {
      throw createError({ statusCode: 400, message: "This fund has been fully raised. Thank you!" });
    }
  } else {
    const availableQty = item.maxQuantity - currentStats.reservedCount;
    if (availableQty <= 0) {
      throw createError({ statusCode: 400, message: "Sorry, this gift was just taken. Please choose another." });
    }
    if (reqQty > availableQty) {
      throw createError({ statusCode: 400, message: `Only ${availableQty} item(s) available to reserve.` });
    }
  }

  // Compute the exact monetary amount for this reservation record
  const computedContributionAmount = isCrowdfund
    ? (Number(contributionAmount) || 0)
    : (Number(item.price) || 0) * reqQty;

  // Create the reservation record
  const reservation = await client.collection("reservations").create({
    item: itemId,
    guestName: guestName.trim(),
    intent: normalizedIntent,
    paymentTiming,
    quantity: reqQty,
    reminderAt: paymentTiming === "later" ? reminderAt : undefined,
    reminderChannel: paymentTiming === "later" ? reminderChannel : undefined,
    reminderContact: paymentTiming === "later" ? trimmedReminderContact : undefined,
    paymentOption: paymentOption || (isCrowdfund ? "bank_transfer" : undefined),
    contributionAmount: computedContributionAmount,
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
