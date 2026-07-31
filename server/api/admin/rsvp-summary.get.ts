import { defineEventHandler } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const client = createClient({
    baseUrl: config.dyrectedUrl || "http://localhost:3005",
    apiKey: config.dyrectedApiKey,
  });

  try {
    const [rsvpRes, asoebiGlobalRes] = await Promise.all([
      client.collection("rsvp_records").find({ limit: 1000, depth: 1 }),
      client.global("asoebi_settings").get().catch(() => null),
    ]);

    const rsvpDocs = rsvpRes?.docs || [];
    const asoebiGlobal = (asoebiGlobalRes as any) || {};

    const pricePerYard = Number(asoebiGlobal?.pricePerYard) || 10000;
    const asoOkeMalePrice = Number(asoebiGlobal?.asoOkeMalePrice) || 15000;
    const asoOkeFemalePrice = Number(asoebiGlobal?.asoOkeFemalePrice) || 25000;

    let totalSubmitted = 0;
    let totalAttending = 0;
    let totalDeclined = 0;
    let leadAttendingCount = 0;
    let spouseAttendingCount = 0;

    let totalAsoebiYards = 0;
    let asoebiOrderCount = 0;
    let totalAsoOkeMaleQty = 0;
    let totalAsoOkeFemaleQty = 0;

    for (const record of rsvpDocs) {
      totalSubmitted++;
      if (record.attending === true || record.attending === "true") {
        totalAttending++;
        leadAttendingCount++;

        if (record.hasSpouse && record.spouseName) {
          spouseAttendingCount++;
        }

        if (record.wantsAsoebi) {
          asoebiOrderCount++;
          const yards = parseInt(record.asoebiYards, 10);
          if (!isNaN(yards) && yards > 0) {
            totalAsoebiYards += yards;
          }
        }

        if (record.wantsAsoOke) {
          if (record.asoOkeMaleQty && record.asoOkeMaleQty > 0) {
            totalAsoOkeMaleQty += Number(record.asoOkeMaleQty);
          }
          if (record.asoOkeFemaleQty && record.asoOkeFemaleQty > 0) {
            totalAsoOkeFemaleQty += Number(record.asoOkeFemaleQty);
          }
        }
      } else {
        totalDeclined++;
      }
    }

    const totalGuestHeadcount = leadAttendingCount + spouseAttendingCount;
    const fabricRevenue = totalAsoebiYards * pricePerYard;
    const asoOkeMaleRevenue = totalAsoOkeMaleQty * asoOkeMalePrice;
    const asoOkeFemaleRevenue = totalAsoOkeFemaleQty * asoOkeFemalePrice;
    const totalAsoOkeRevenue = asoOkeMaleRevenue + asoOkeFemaleRevenue;
    const grandAsoebiRevenue = fabricRevenue + totalAsoOkeRevenue;

    return {
      success: true,
      data: {
        totalSubmitted,
        totalAttending,
        totalDeclined,
        leadAttendingCount,
        spouseAttendingCount,
        totalGuestHeadcount,
        asoebi: {
          orderCount: asoebiOrderCount,
          totalYards: totalAsoebiYards,
          fabricRevenue,
          maleQty: totalAsoOkeMaleQty,
          maleRevenue: asoOkeMaleRevenue,
          femaleQty: totalAsoOkeFemaleQty,
          femaleRevenue: asoOkeFemaleRevenue,
          totalAsoOkeRevenue,
          grandRevenue: grandAsoebiRevenue,
        },
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to calculate RSVP summary",
    };
  }
});
