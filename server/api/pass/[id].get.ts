import { defineEventHandler, getRouterParam, createError } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, message: "Missing pass ID" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  // Query RSVP record by id or editToken
  let result = await client.collection("rsvp_records").find({
    where: { id: { equals: id } },
    limit: 1,
    depth: 1,
  });

  if (!result.docs || result.docs.length === 0) {
    // Fallback: search by editToken
    result = await client.collection("rsvp_records").find({
      where: { editToken: { equals: id } },
      limit: 1,
      depth: 1,
    });
  }

  const rsvp = result.docs?.[0];
  if (!rsvp) {
    throw createError({ statusCode: 404, message: "Pass not found" });
  }

  // Populate events if not already populated or if depth was shallow
  let eventDocs: any[] = [];
  try {
    const rawEvents = rsvp.selectedEvents;
    if (Array.isArray(rawEvents) && rawEvents.length > 0) {
      if (typeof rawEvents[0] === "object" && rawEvents[0] !== null && rawEvents[0].name) {
        eventDocs = rawEvents;
      } else {
        const eventsRes = await client.collection("events").find({ limit: 50, depth: 1 });
        const allEvents = eventsRes.docs || [];
        eventDocs = allEvents.filter((e: any) => rawEvents.includes(e.id));
      }
    }
  } catch (err) {
    console.error("Error populating events for pass:", err);
  }

  // Populate group name
  let groupName = "";
  try {
    if (rsvp.group) {
      if (typeof rsvp.group === "object" && rsvp.group !== null && rsvp.group.name) {
        groupName = rsvp.group.name;
      } else {
        const groupRes = await client.collection("rsvp_groups").find({
          where: { id: { equals: rsvp.group } },
          limit: 1,
        });
        groupName = groupRes.docs?.[0]?.name || "";
      }
    }
  } catch (err) {
    console.error("Error populating group for pass:", err);
  }

  // Site Settings
  let coupleName = "Adun & Uche";
  let hashtag = "#TheSweetUnion";
  let weddingDateText = "October 22 & 24, 2026";
  try {
    const settings = await client.global("site_settings").get();
    if (settings) {
      const p1 = settings.partnerOneName || "";
      const p2 = settings.partnerTwoName || "";
      if (p1 && p2) coupleName = `${p1} & ${p2}`;
      if (settings.hashtag) hashtag = settings.hashtag;
      if (settings.weddingDateText) weddingDateText = settings.weddingDateText;
    }
  } catch {}

  const hasSpouse = Boolean(rsvp.hasSpouse);
  const spouseName = rsvp.spouseName || "";
  const leadName = rsvp.leadName || "Guest";
  const guestName = hasSpouse && spouseName ? `${leadName} + ${spouseName}` : leadName;

  return {
    id: rsvp.id,
    leadName,
    hasSpouse,
    spouseName,
    guestName,
    attending: Boolean(rsvp.attending),
    groupName,
    events: eventDocs.map((e: any) => ({
      id: e.id,
      name: e.name,
      date: e.date,
      venueName: e.venueName,
      venueAddress: e.venueAddress,
      dressCode: e.dressCode,
    })),
    siteSettings: {
      coupleName,
      hashtag,
      weddingDateText,
    },
  };
});
