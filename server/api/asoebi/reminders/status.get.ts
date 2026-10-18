import { defineEventHandler } from "h3";
import { createClient } from "@dyrected/sdk";
import { requireAdmin } from "~~/server/utils/require-admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const asoebiGlobalRes = await client.getGlobal("asoebi_settings").catch(() => null);
  const settings: any = asoebiGlobalRes || {};
  const ppy = Number(settings.pricePerYard) || 10000;
  const malePrice = Number(settings.asoOkeMalePrice) || 6000;
  const femalePrice = Number(settings.asoOkeFemalePrice) || 6000;

  // 1. Fetch targeted count using aggregate with pending payment condition
  const aggRes = await client.collection("rsvp_records").aggregate({
    pendingCount: {
      count: "*",
      where: { asoebiPaymentStatus: { equals: "pending" } },
    },
  }).catch(() => null);
  const pendingCount = aggRes?.pendingCount || 0;

  // 2. Fetch only records with pending payment status across pages until reaching pendingCount
  const allDocs: any[] = [];
  let page = 1;
  while (allDocs.length < pendingCount) {
    const res = await client.collection("rsvp_records").find({
      where: { asoebiPaymentStatus: { equals: "pending" } },
      limit: 100,
      page,
      depth: 0,
    });
    const docs = res.docs || [];
    if (docs.length === 0) break;
    allDocs.push(...docs);
    page++;
  }

  // Fallback if aggregate failed or returned 0
  if (allDocs.length === 0 && pendingCount === 0) {
    const fallbackRes = await client.collection("rsvp_records").find({
      where: { asoebiPaymentStatus: { equals: "pending" } },
      limit: 100,
      depth: 0,
    });
    allDocs.push(...(fallbackRes.docs || []));
  }

  const unpaidGuests: any[] = [];
  let totalWithOrder = 0;
  let totalPaid = 0;
  let totalNeverSent = 0;
  let totalNotSentThisMonth = 0;
  let totalSentThisMonth = 0;

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  for (const rawDoc of allDocs) {
    const doc = rawDoc as any;
    const wantsAsoebi = doc.wantsAsoebi === true || doc.wantsAsoebi === "true" || doc.wantsAsoebi === 1;
    const asoebiYards = doc.asoebiYards ? parseInt(String(doc.asoebiYards), 10) : 0;
    const wantsAsoOke = doc.wantsAsoOke === true || doc.wantsAsoOke === "true" || doc.wantsAsoOke === 1;
    const maleQty = Number(doc.asoOkeMaleQty) || 0;
    const femaleQty = Number(doc.asoOkeFemaleQty) || 0;

    const hasOrder = wantsAsoebi || asoebiYards > 0 || wantsAsoOke || maleQty > 0 || femaleQty > 0;
    if (!hasOrder) continue;

    totalWithOrder++;

    const isPaid = doc.asoebiPaymentStatus === "received" || doc.asoebiPaymentStatus === "waived";
    if (isPaid) {
      totalPaid++;
      continue;
    }

    let total = 0;
    const items: string[] = [];
    if (wantsAsoebi && asoebiYards > 0) {
      total += asoebiYards * ppy;
      items.push(`${asoebiYards} yards of Asoebi fabric (Customised Adire)`);
    }
    if (wantsAsoOke && maleQty > 0) {
      total += maleQty * malePrice;
      items.push(`${maleQty} Male Aso Oke (Fila / Cap)`);
    }
    if (wantsAsoOke && femaleQty > 0) {
      total += femaleQty * femalePrice;
      items.push(`${femaleQty} Female Aso Oke (Gele)`);
    }

    const isSent = doc.asoebiSent === true || doc.asoebiSent === "true" || doc.asoebiSent === 1;
    const sentAt = doc.asoebiSentAt;
    const sentThisMonth = Boolean(isSent && sentAt && String(sentAt).startsWith(currentYearMonth));

    if (!isSent) {
      totalNeverSent++;
    }

    if (sentThisMonth) {
      totalSentThisMonth++;
    } else {
      totalNotSentThisMonth++;
    }

    unpaidGuests.push({
      id: doc.id,
      leadName: (doc.leadName || "").trim() || "Guest",
      leadPhone: (doc.leadPhone || "").trim(),
      itemsSummary: items.join(" + ") || "Aso Ebi",
      totalAmount: total,
      paymentStatus: doc.asoebiPaymentStatus || "pending",
      asoebiSent: Boolean(isSent),
      asoebiSentAt: sentAt || null,
      sentThisMonth,
      wantsAsoebi,
      asoebiYards,
      wantsAsoOke,
      asoOkeMaleQty: maleQty,
      asoOkeFemaleQty: femaleQty,
    });
  }

  return {
    success: true,
    summary: {
      totalWithOrder,
      totalPaid,
      totalUnpaid: unpaidGuests.length,
      totalNeverSent,
      totalNotSentThisMonth,
      totalSentThisMonth,
    },
    settings: {
      whatsAppTemplate: settings.whatsAppTemplate || "",
      representativeName: settings.representativeName || "Ololade",
      bankName: settings.bankName || "OPay Digital Services Limited",
      accountNumber: settings.accountNumber || "8105733592",
      accountName: settings.accountName || "ADUNOLUWA ANUOLUWAPO OBADOFIN",
      wahaSession: settings.wahaSession || "AdunsPhone",
      pricePerYard: ppy,
      asoOkeMalePrice: malePrice,
      asoOkeFemalePrice: femalePrice,
    },
    unpaidGuests,
  };
});
