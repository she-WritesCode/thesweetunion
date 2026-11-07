import { defineEventHandler, createError, setHeader } from "h3";
import { createClient } from "@dyrected/sdk";
import { requireAdmin } from "~~/server/utils/require-admin";

const DEFAULT_SENDERS = [
  { id: "groom", name: "Groom", phone: "", wahaSession: "Groom", status: "SCAN_QR_CODE" },
  { id: "bride", name: "Bride", phone: "", wahaSession: "Bride", status: "SCAN_QR_CODE" },
  { id: "adun", name: "Adun", phone: "2347086492639", wahaSession: "AdunsPhone", status: "FAILED" },
  { id: "busola", name: "My Phone", phone: "2347065055605", wahaSession: "default", status: "WORKING" },
];

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  // Prevent caching of live status
  setHeader(event, "Cache-Control", "no-store, no-cache, must-revalidate");

  const config = useRuntimeConfig();
  const baseUrl = (config.wahaUrl as string)?.replace(/\/+$/, "");
  const apiKey = config.wahaApiKey as string;

  // 1. Fetch WAHA sessions
  let sessions: any[] = [];
  if (baseUrl) {
    try {
      const res = await fetch(`${baseUrl}/api/sessions?all=true`, {
        headers: {
          Accept: "application/json",
          ...(apiKey ? { "X-Api-Key": apiKey } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          sessions = data.map((s: any) => ({
            name: s.name,
            status: s.status,
            phone: s.me?.id ? s.me.id.replace(/@.*$/, "") : null,
            pushName: s.me?.pushName || s.name,
          }));
        }
      }
    } catch (err: any) {
      console.warn("Could not fetch WAHA sessions:", err.message);
    }
  }

  // 2. Fetch Dyrected Collections & Globals
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  const [groupsRes, allRsvpRes, settingsRes] = await Promise.all([
    client.collection("rsvp_groups").find({ limit: 200, depth: 0 }).catch(() => ({ docs: [] })),
    // Fetch all records and filter attending in JS per AGENTS.md boolean filter rule
    client.collection("rsvp_records").find({ limit: 1000, depth: 1 }).catch(() => ({ docs: [] })),
    client.global("site_settings").get().catch(() => null) as Promise<any>,
  ]);

  const groups = (groupsRes.docs || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    maxCapacity: g.maxCapacity,
  }));

  const allRecords = allRsvpRes.docs || [];
  const attendingGuests = allRecords
    .filter((r: any) => r.attending === true || r.attending === "true")
    .map((r: any) => {
      const groupId = typeof r.group === "object" ? r.group?.id : r.group;
      const groupName = typeof r.group === "object" ? r.group?.name : "";
      return {
        id: r.id,
        passCode: (r.passCode || r.id).toUpperCase(),
        leadName: r.leadName || "Guest",
        leadPhone: r.leadPhone || "",
        hasSpouse: Boolean(r.hasSpouse),
        spouseName: r.spouseName || "",
        group: r.group,
        groupId: groupId || "",
        groupName: groupName || "",
        invitationSent: Boolean(r.invitationSent),
        invitationSentAt: r.invitationSentAt || null,
        invitationSentVia: r.invitationSentVia || null,
      };
    });

  const savedConfig = settingsRes?.passCampaignConfig || {};

  // Merge live WAHA sessions into senders list
  const baseSenders = Array.isArray(savedConfig.senders) && savedConfig.senders.length > 0
    ? savedConfig.senders
    : DEFAULT_SENDERS;

  const mergedSenders = baseSenders.map((s: any) => {
    const sSession = (s.wahaSession || s.id || s.name || "").toLowerCase();
    const liveMatch = sessions.find((ws: any) => {
      const wsName = (ws.name || "").toLowerCase();
      return wsName === sSession || wsName.includes(sSession) || sSession.includes(wsName);
    });

    return {
      id: s.id || s.name?.toLowerCase() || "sender",
      name: s.name || liveMatch?.pushName || "Sender",
      wahaSession: liveMatch?.name || s.wahaSession || s.id,
      phone: liveMatch?.phone || s.phone || "",
      status: liveMatch?.status || s.status || "SCAN_QR_CODE",
    };
  });

  // Also include any sessions from WAHA not already present
  for (const sess of sessions) {
    const exists = mergedSenders.some(
      (s: any) => (s.wahaSession || "").toLowerCase() === sess.name.toLowerCase()
    );
    if (!exists) {
      mergedSenders.push({
        id: sess.name.toLowerCase(),
        name: sess.pushName || sess.name,
        wahaSession: sess.name,
        phone: sess.phone || "",
        status: sess.status,
      });
    }
  }

  const mergedConfig = {
    ...savedConfig,
    senders: mergedSenders,
  };

  return {
    success: true,
    sessions,
    groups,
    rsvpGroups: groups,
    guests: attendingGuests,
    totalGuests: attendingGuests.length,
    sentCount: attendingGuests.filter((g) => g.invitationSent).length,
    remainingCount: attendingGuests.filter((g) => !g.invitationSent).length,
    config: mergedConfig,
  };
});
