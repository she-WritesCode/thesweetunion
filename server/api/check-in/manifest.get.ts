import { defineEventHandler } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const allRsvps = await client.collection("rsvp_records").find({
    where: { attending: { equals: true } },
    limit: 1000,
  });

  const manifest = allRsvps.docs.map((r: any) => ({
    id: r.id,
    leadName: r.leadName,
    spouseName: r.spouseName,
    hasSpouse: r.hasSpouse,
    partySize: r.hasSpouse ? 2 : 1,
    groupId: typeof r.group === "object" ? r.group.id : r.group,
    groupName: typeof r.group === "object" ? r.group.name : null,
    checkedIn: r.checkedIn || false,
    checkInId: r.checkIn ? (typeof r.checkIn === "object" ? r.checkIn.id : r.checkIn) : null,
    tableLabel: null, // populated once seating is implemented
  }));

  return { manifest, total: manifest.length };
});
