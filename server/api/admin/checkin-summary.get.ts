import { defineEventHandler } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const client = createClient({
    baseUrl: config.dyrectedUrl || "http://localhost:3005",
    apiKey: config.dyrectedApiKey,
  });

  try {
    const [rsvpRes, checkInsRes] = await Promise.all([
      client.collection("rsvp_records").find({ limit: 1000, depth: 1 }),
      client.collection("check_ins").find({ limit: 1000, depth: 1 }),
    ]);

    const rsvpDocs = rsvpRes?.docs || [];
    const checkInDocs = checkInsRes?.docs || [];

    let totalGuestHeadcount = 0;

    for (const record of rsvpDocs) {
      if (record.attending === true || record.attending === "true") {
        totalGuestHeadcount++;
        if (record.hasSpouse && record.spouseName) {
          totalGuestHeadcount++;
        }
      }
    }

    const checkedInCount = checkInDocs.length;
    const checkInPct =
      totalGuestHeadcount > 0 ? Math.round((checkedInCount / totalGuestHeadcount) * 100) : 0;

    return {
      success: true,
      data: {
        totalCheckedIn: checkedInCount,
        totalExpected: totalGuestHeadcount,
        checkInPct,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to calculate check-in summary",
    };
  }
});
