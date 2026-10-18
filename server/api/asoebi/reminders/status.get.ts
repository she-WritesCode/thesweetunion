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

  // Fetch all RSVP records
  const res = await client.collection("rsvp_records").find({ limit: 2000, depth: 1 });
  const allDocs = res.docs || [];

  const unpaidGuests: any[] = [];
  let totalWithOrder = 0;
  let totalPaid = 0;
  let totalNeverSent = 0;

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
    if (!isSent) {
      totalNeverSent++;
    }

    unpaidGuests.push({
      id: doc.id,
      leadName: (doc.leadName || "").trim() || "Guest",
      leadPhone: (doc.leadPhone || "").trim(),
      itemsSummary: items.join(" + ") || "Aso Ebi",
      totalAmount: total,
      paymentStatus: doc.asoebiPaymentStatus || "pending",
      asoebiSent: Boolean(isSent),
      asoebiSentAt: doc.asoebiSentAt || null,
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
