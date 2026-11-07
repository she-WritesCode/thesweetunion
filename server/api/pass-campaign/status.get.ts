import { defineEventHandler, createError } from "h3";
import { createClient } from "@dyrected/sdk";
import { requireAdmin } from "~~/server/utils/require-admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const config = useRuntimeConfig();
  const baseUrl = (config.wahaUrl as string)?.replace(/\/+$/, "");
  const apiKey = config.wahaApiKey as string;

  // 1. Fetch WAHA sessions
  let sessions: any[] = [];
  if (baseUrl) {
    try {
      const res = await fetch(`${baseUrl}/api/sessions`, {
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

  const savedConfig = settingsRes?.passCampaignConfig || null;

  return {
    success: true,
    sessions,
    groups,
    rsvpGroups: groups,
    guests: attendingGuests,
    totalGuests: attendingGuests.length,
    sentCount: attendingGuests.filter((g) => g.invitationSent).length,
    remainingCount: attendingGuests.filter((g) => !g.invitationSent).length,
    config: savedConfig,
  };
});
