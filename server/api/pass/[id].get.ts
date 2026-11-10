import { defineEventHandler, getRouterParam, createError } from "h3";
import { createClient } from "@dyrected/sdk";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, message: "Missing pass ID" });
  }

  const cleanId = id.trim();
  const upperCode = cleanId.toUpperCase();

  // Test / Demo Pass Handler (e.g. /pass/demo99)
  if (upperCode === "DEMO99" || upperCode === "DEMO" || upperCode === "SAMPLE") {
    return {
      id: "demo99",
      passCode: "DEMO99",
      leadName: "Test Guest",
      hasSpouse: true,
      spouseName: "Partner",
      guestName: "Test Guest & Partner",
      attending: true,
      groupName: "Special Guests",
      events: [
        {
          id: "ceremony",
          name: "Church Wedding Ceremony",
          date: "2026-11-21T08:00:00.000Z",
          venueName: "RCCG Victory Center",
          venueAddress: "No 58 Iju Road, Agege, Lagos",
          dressCode: "Mauve & Gold",
        },
        {
          id: "reception",
          name: "Wedding Reception",
          date: "2026-11-21T12:00:00.000Z",
          venueName: "Ronnie Dee Event Centre",
          venueAddress: "67 Iju Rd, Pen Cinema Zone, beside Eterna Petrol Station, Agege, Lagos",
          dressCode: "Mauve & Gold",
        },
      ],
      siteSettings: {
        coupleName: "Adun & Uche",
        hashtag: "#TheSweetUnion",
        weddingDateText: "Saturday, November 21, 2026",
      },
    };
  }

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  // Query RSVP record by passCode (uppercase, lowercase, raw)
  let rsvp: any = null;
  const passVariants = Array.from(new Set([upperCode, cleanId.toLowerCase(), cleanId]));
  for (const code of passVariants) {
    if (rsvp) break;
    try {
      const res = await client.collection("rsvp_records").find({
        where: { passCode: { equals: code } },
        limit: 1,
        depth: 1,
      });
      if (res.docs && res.docs.length > 0) {
        rsvp = res.docs[0];
      }
    } catch (err) {
      console.warn("passCode query failed for variant:", code, err);
    }
  }

  if (!rsvp) {
    try {
      const res = await client.collection("rsvp_records").find({
        where: { id: { equals: cleanId } },
        limit: 1,
        depth: 1,
      });
      if (res.docs && res.docs.length > 0) {
        rsvp = res.docs[0];
      }
    } catch (err) {
      console.warn("id query failed:", err);
    }
  }

  if (!rsvp) {
    try {
      const res = await client.collection("rsvp_records").find({
        where: { id: { equals: cleanId.toLowerCase() } },
        limit: 1,
        depth: 1,
      });
      if (res.docs && res.docs.length > 0) {
        rsvp = res.docs[0];
      }
    } catch (err) {
      console.warn("lowercase id query failed:", err);
    }
  }

  if (!rsvp) {
    try {
      const res = await client.collection("rsvp_records").find({
        where: { editToken: { equals: cleanId } },
        limit: 1,
        depth: 1,
      });
      if (res.docs && res.docs.length > 0) {
        rsvp = res.docs[0];
      }
    } catch (err) {
      console.warn("editToken query failed:", err);
    }
  }

  if (!rsvp && cleanId.includes("@")) {
    try {
      const res = await client.collection("rsvp_records").find({
        where: { leadEmail: { equals: cleanId.toLowerCase() } },
        limit: 1,
        depth: 1,
      });
      if (res.docs && res.docs.length > 0) {
        rsvp = res.docs[0];
      }
    } catch (err) {
      console.warn("email query failed:", err);
    }
  }

  const digits = cleanId.replace(/\D/g, "");
  if (!rsvp && digits.length >= 8) {
    try {
      const res = await client.collection("rsvp_records").find({ limit: 1000, depth: 1 });
      const match = (res.docs || []).find((r: any) => {
        const p = (r.leadPhone || "").replace(/\D/g, "");
        return p && (p.endsWith(digits) || digits.endsWith(p));
      });
      if (match) rsvp = match;
    } catch (err) {
      console.warn("phone fallback failed:", err);
    }
  }

  // Historical passCode check via audit log (resolves previous codes if an update changed them)
  if (!rsvp && process.env.DATABASE_URL) {
    try {
      const postgres = (await import("postgres")).default;
      const sql = postgres(process.env.DATABASE_URL, { ssl: "prefer", max: 1 });
      const auditRows = await sql`
        SELECT data->>'documentId' as doc_id
        FROM collection___audit
        WHERE data->>'collection' = 'rsvp_records'
          AND (
            data->>'changes' ILIKE ${'%"passCode":"' + upperCode + '"%'}
            OR data->>'changes' ILIKE ${'%"passCode":"' + cleanId + '"%'}
          )
        ORDER BY created_at DESC
        LIMIT 1
      `;
      if (auditRows.length > 0 && auditRows[0].doc_id) {
        const foundId = auditRows[0].doc_id;
        const res = await client.collection("rsvp_records").find({
          where: { id: { equals: foundId } },
          limit: 1,
          depth: 1,
        });
        if (res.docs && res.docs.length > 0) {
          rsvp = res.docs[0];
        }
      }
      await sql.end();
    } catch (auditErr) {
      console.warn("Audit passCode fallback failed:", auditErr);
    }
  }

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
  let weddingDateText = "Saturday, November 21, 2026";
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
    passCode: (rsvp.passCode || rsvp.id).toUpperCase(),
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
