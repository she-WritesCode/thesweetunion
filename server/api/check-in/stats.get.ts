import { defineEventHandler } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const [allRsvps, allCheckIns] = await Promise.all([
    client.collection("rsvp_records").find({ limit: 1000 }),
    client.collection("check_ins").find({ limit: 1000 }),
  ]);

  const attendingRsvps = allRsvps.docs.filter((r: any) => r.attending === true || r.attending === "true");

  const totalExpected = attendingRsvps.reduce(
    (n: number, r: any) => n + (r.hasSpouse ? 2 : 1),
    0
  );

  const totalCheckedIn = allCheckIns.docs.reduce(
    (n: number, c: any) => n + (c.partySize || 1),
    0
  );

  const recentCheckIns = [...allCheckIns.docs]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return {
    totalExpected,
    totalCheckedIn,
    percentage: totalExpected > 0 ? Math.round((totalCheckedIn / totalExpected) * 100) : 0,
    recentCheckIns,
  };
});
