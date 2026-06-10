import { defineEventHandler } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const allRsvps = await client.collection("rsvp_records").find({ limit: 1000, depth: 1 });
  const attending = allRsvps.docs.filter((r: any) => r.attending === true || r.attending === "true");

  const manifest = attending.map((r: any) => ({
    id: r.id,
    leadName: r.leadName,
    spouseName: r.spouseName,
    hasSpouse: r.hasSpouse,
    partySize: r.hasSpouse ? 2 : 1,
    groupId: r.group?.id ?? r.group,
    groupName: r.group?.name ?? null,
    checkedIn: r.checkedIn || false,
    checkInId: r.checkIn?.id ?? r.checkIn ?? null,
  }));

  return { manifest, total: manifest.length };
});
