import { defineEventHandler } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const client = createClient({
    baseUrl: config.dyrectedUrl || "http://localhost:3005",
    apiKey: config.dyrectedApiKey,
  });

  try {
    // Fetch collections in parallel
    const [rsvpRes, wishlistRes, reservationsRes, groupsRes, checkInsRes, asoebiGlobalRes] = await Promise.all([
      client.collection("rsvp_records").find({ limit: 1000, depth: 1 }),
      client.collection("wishlist_items").find({ limit: 1000, depth: 1 }),
      client.collection("reservations").find({ limit: 1000, depth: 1 }),
      client.collection("rsvp_groups").find({ limit: 1000, depth: 1 }),
      client.collection("check_ins").find({ limit: 1000, depth: 1 }),
      client
        .global("asoebi_settings")
        .get()
        .catch(() => null),
    ]);

    const rsvpDocs = rsvpRes?.docs || [];
    const wishlistDocs = wishlistRes?.docs || [];
    const reservationDocs = reservationsRes?.docs || [];
    const groupDocs = groupsRes?.docs || [];
    const checkInDocs = checkInsRes?.docs || [];
    const asoebiGlobal = (asoebiGlobalRes as any) || {};

    const pricePerYard = Number(asoebiGlobal?.pricePerYard) || 10000;
    const asoOkeMalePrice = Number(asoebiGlobal?.asoOkeMalePrice) || 15000;
    const asoOkeFemalePrice = Number(asoebiGlobal?.asoOkeFemalePrice) || 25000;

    // 1. RSVP & Headcount Metrics
    let totalSubmitted = 0;
    let totalAttending = 0;
    let totalDeclined = 0;
    let leadAttendingCount = 0;
    let spouseAttendingCount = 0;

    let totalAsoebiYards = 0;
    let asoebiOrderCount = 0;
    let totalAsoOkeMaleQty = 0;
    let totalAsoOkeFemaleQty = 0;
    let accessCardSentCount = 0;

    for (const record of rsvpDocs) {
      totalSubmitted++;
      if (record.attending === true || record.attending === "true") {
        totalAttending++;
        leadAttendingCount++;

        if (record.hasSpouse && record.spouseName) {
          spouseAttendingCount++;
        }

        // Asoebi Fabric
        if (record.wantsAsoebi) {
          asoebiOrderCount++;
          const yards = parseInt(record.asoebiYards, 10);
          if (!isNaN(yards) && yards > 0) {
            totalAsoebiYards += yards;
          }
        }

        // Aso-Oke
        if (record.wantsAsoOke) {
          if (record.asoOkeMaleQty && record.asoOkeMaleQty > 0) {
            totalAsoOkeMaleQty += Number(record.asoOkeMaleQty);
          }
          if (record.asoOkeFemaleQty && record.asoOkeFemaleQty > 0) {
            totalAsoOkeFemaleQty += Number(record.asoOkeFemaleQty);
          }
        }

        // Access Card
        if (record.invitationSent) {
          accessCardSentCount++;
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

    // 2. Wishlist Registry Metrics
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
        // Crowdfund / partial
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
      totalRegistryTarget > 0 ? Math.min(100, Math.round((totalAmountRaised / totalRegistryTarget) * 100)) : 0;

    // 3. RSVP Groups Metrics
    let totalGroupCapacity = 0;
    let groupsRespondedCount = 0;

    for (const g of groupDocs) {
      totalGroupCapacity += Number(g.allowedGuests) || 0;
      if (g.hasSubmitted) {
        groupsRespondedCount++;
      }
    }

    const groupResponsePct = groupDocs.length > 0 ? Math.round((groupsRespondedCount / groupDocs.length) * 100) : 0;

    // 4. Check-Ins Metrics
    const checkedInCount = checkInDocs.length;
    const checkInPct = totalGuestHeadcount > 0 ? Math.round((checkedInCount / totalGuestHeadcount) * 100) : 0;

    return {
      success: true,
      timestamp: new Date().toISOString(),
      rsvp: {
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
        accessCardSentCount,
      },
      wishlist: {
        totalItems: wishlistDocs.length,
        totalRegistryTarget,
        totalAmountRaised,
        registryFulfillmentPct,
        fullyReservedCount,
        partiallyFundedCount,
        unclaimedCount,
        totalReservationsCount: reservationDocs.length,
      },
      groups: {
        totalGroups: groupDocs.length,
        totalCapacity: totalGroupCapacity,
        groupsRespondedCount,
        responsePct: groupResponsePct,
      },
      checkIns: {
        totalCheckedIn: checkedInCount,
        checkInPct,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to calculate admin summaries",
    };
  }
});
