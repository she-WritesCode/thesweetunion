import { defineEventHandler, getHeader, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { sendWhatsApp } from "~~/dyrected/whatsapp";
import { sendEmail } from "~~/dyrected/mailer";
import { wishlistReminderEmail } from "~~/dyrected/emails";
import { buildWhatsAppReminderText } from "~~/dyrected/reminder-message";

// Sending too many WhatsApp messages back-to-back looks bot-like and risks the
// connected number being flagged/banned. Throttle: a random human-ish delay
// between sends, and a per-run cap so a large backlog trickles out over
// several days instead of firing all at once. Email has no such risk.
//
// The delay is bounded by how long the whole request can run (see
// nitro.vercel.functions.maxDuration in nuxt.config.ts, currently 60s — the
// max Vercel allows on the Hobby plan). A realistic "someone typing this out"
// delay (20-40s) only leaves room for ~2 sends before the function must
// return; the rest of the backlog is left for tomorrow's run rather than
// rushed through at an inhuman pace. (MAX_WHATSAPP_PER_RUN - 1) * MAX_DELAY_MS
// must stay comfortably under maxDuration.
const MAX_WHATSAPP_PER_RUN = 2;
const MIN_DELAY_MS = 20_000;
const MAX_DELAY_MS = 40_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = () => sleep(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));

// Called daily by Vercel Cron (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const secret = config.cronSecret as string;
  if (!secret || getHeader(event, "authorization") !== `Bearer ${secret}`) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const client = createClient({ baseUrl: config.dyrectedUrl, apiKey: config.dyrectedApiKey });
  const appUrl = (config.public as any).appUrl || "http://localhost:3000";

  const settingsRes = await client.collection("site_settings").find({ limit: 1, depth: 1 });
  const settings: any = settingsRes.docs?.[0] || {};
  const coupleNames = [settings.partnerOneName, settings.partnerTwoName].filter(Boolean).join(" & ") || "the couple";
  const senderName = settings.whatsappSenderName || "the wedding team";
  const bankName = settings.bankName || "";
  const accountNumber = settings.accountNumber || "";
  const accountName = settings.accountName || "";

  // Filter in JS — date/boolean WHERE filters are unreliable here.
  const res = await client.collection("reservations").find({ limit: 1000, depth: 1 });
  const now = Date.now();
  const due = res.docs.filter(
    (r: any) =>
      r.intent === "reminder" &&
      (r.reminderChannel === "whatsapp" || r.reminderChannel === "email") &&
      r.reminderContact &&
      r.reminderAt &&
      !r.reminderSentAt &&
      new Date(r.reminderAt).getTime() <= now,
  );

  // Group by contact + channel so a guest with several pledged items gets one message, not one per item.
  const groups = new Map<string, any[]>();
  for (const r of due) {
    const key = `${r.reminderChannel}:${r.reminderContact}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  let sent = 0;
  let whatsappSentThisRun = 0;
  let whatsappThrottled = 0;
  const failed: { contact: string; error: string }[] = [];

  for (const [key, records] of groups) {
    const [channel, contact] = key.split(":");

    // Cap WhatsApp volume per run — anything over the cap is left unsent and
    // picked up on tomorrow's run instead of bursting out all at once.
    if (channel === "whatsapp" && whatsappSentThisRun >= MAX_WHATSAPP_PER_RUN) {
      whatsappThrottled += records.length;
      continue;
    }
    const guestName = records[0].guestName;
    const items = records.map((r) => ({
      name: r.item?.name || "Gift item",
      amount: Number(r.contributionAmount) || 0,
    }));
    const total = items.reduce((sum, i) => sum + i.amount, 0);
    const wishlistLink = `${appUrl}/wishlist`;

    try {
      if (channel === "email") {
        await sendEmail({
          to: contact,
          subject: `A reminder about your gift to ${coupleNames}`,
          html: wishlistReminderEmail({
            guestName,
            senderName,
            coupleNames,
            items,
            total,
            bankName,
            accountNumber,
            accountName,
            wishlistLink,
          }),
        });
      } else {
        // Human-ish pacing: wait before every WhatsApp send but the very first one.
        if (whatsappSentThisRun > 0) await randomDelay();

        await sendWhatsApp({
          to: contact,
          text: buildWhatsAppReminderText(guestName, items, { coupleNames, senderName, bankName, accountNumber, accountName }),
        });
        whatsappSentThisRun++;
      }
      await Promise.all(
        records.map((r) => client.collection("reservations").update(r.id, { reminderSentAt: new Date().toISOString() })),
      );
      sent += records.length;
    } catch (e: any) {
      console.error(`[reminders] failed for ${contact}:`, e);
      failed.push({ contact, error: e.message });
    }
  }

  return { due: due.length, groups: groups.size, sent, whatsappThrottled, failed };
});
