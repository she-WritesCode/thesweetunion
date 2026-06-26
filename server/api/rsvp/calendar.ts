import { defineEventHandler, getQuery, createError } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const eventId = query.eventId as string;

  if (!eventId) {
    throw createError({ statusCode: 400, message: "Missing eventId" });
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.public.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const res = await client.collection("events").find({
    where: { id: { equals: eventId } },
    limit: 1,
  });

  const eventDoc = res.docs?.[0];
  if (!eventDoc) {
    throw createError({ statusCode: 404, message: "Event not found" });
  }

  // Format details
  const name = eventDoc.name || "Wedding Event";
  const start = new Date(eventDoc.date);
  
  // Set default duration to 5 hours if not specified
  const end = new Date(start.getTime() + 5 * 60 * 60 * 1000);
  const location = `${eventDoc.venueName || ""}, ${eventDoc.venueAddress || ""}`.trim();
  const description = `Dress Code: ${eventDoc.dressCode || "Strictly Formal"}\n\nThank you for RSVPing to our wedding! See you there.`;

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TheSweetUnion//Wedding Calendar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `SUMMARY:${name}`,
    `DTSTART:${formatDate(start)}`,
    `DTEND:${formatDate(end)}`,
    `LOCATION:${location.replace(/,/g, "\\,")}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR"
  ];

  const icsContent = icsLines.join("\r\n");

  event.node.res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  event.node.res.setHeader("Content-Disposition", `attachment; filename="${name.toLowerCase().replace(/\s+/g, "-")}.ics"`);
  
  return icsContent;
});
