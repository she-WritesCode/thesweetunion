import { defineEventHandler, createError, setHeader } from "h3";
import { createClient } from "@dyrected/sdk";
import { requireAdmin } from "~~/server/utils/require-admin";

const DEFAULT_SENDERS = [
  { id: "groom", name: "Groom", phone: "", wahaSession: "Groom", status: "SCAN_QR_CODE" },
  { id: "bride", name: "Bride", phone: "", wahaSession: "Bride", status: "SCAN_QR_CODE" },
  { id: "adun", name: "Adun", phone: "2347086492639", wahaSession: "AdunsPhone", status: "FAILED" },
  { id: "busola", name: "My Phone", phone: "2347065055605", wahaSession: "default", status: "WORKING" },
];

const DEFAULT_MESSAGE_TEMPLATE = `[Greeting, e.g. Dear [Guest Name] / Hi [Guest Name]!]

We can't wait to celebrate with you at #TheSweetUnion! 💍✨

🎟️ YOUR RECEPTION PASS:
Your digital pass code is *[PASS_CODE]*.
Access your official entry card and itinerary here:
[PASS_URL]

⚠️ IMPORTANT VENUE & ENTRY INFO:
• *Church Ceremony:* [Church Venue & Time] (Open to all friends and family)
• *Wedding Reception:* [Reception Venue & Time]
  *Please note: The digital pass above is strictly required for entry at the reception venue. Kindly have it ready on your phone.*

❓ FREQUENTLY ASKED QUESTIONS:
• Colors / Dress Code: [Details...]
• Gifts & Registry: [Wishlist Link...]

With love,
Adun & Uche`;

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event);
  } catch (authErr: any) {
    throw authErr;
  }

  // Prevent caching of live status
  try {
    setHeader(event, "Cache-Control", "no-store, no-cache, must-revalidate");
  } catch {
    // ignore
  }

  try {
    const config = useRuntimeConfig();
    const baseUrl = (config.wahaUrl as string)?.replace(/\/+$/, "");
    const apiKey = config.wahaApiKey as string;

    // 1. Fetch WAHA sessions safely
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
            sessions = data
              .filter((s: any) => s && typeof s === "object")
              .map((s: any) => ({
                name: String(s.name || ""),
                status: String(s.status || "UNKNOWN"),
                phone: s.me?.id ? String(s.me.id).replace(/@.*$/, "") : null,
                pushName: s.me?.pushName || s.name || "",
              }))
              .filter((s) => Boolean(s.name));
          }
        }
      } catch (err: any) {
        console.warn("Could not fetch WAHA sessions:", err.message);
      }
    }

    // 2. Fetch Dyrected Collections & Globals across all pages (Dyrected caps find() at 100/page)
    const client = createClient({
      baseUrl: config.dyrectedUrl,
      apiKey: config.dyrectedApiKey,
    });

    const [groupsList, recordsList, settingsRes] = await Promise.all([
      fetchAllDocs(client, "rsvp_groups", { depth: 0 }),
      fetchAllDocs(client, "rsvp_records", { depth: 1 }),
      (async () => {
        try {
          return await client.global("site_settings").get();
        } catch {
          return null;
        }
      })(),
    ]);

    const groups = groupsList.map((g: any) => ({
      id: g.id,
      name: g.name || "Group",
      slug: g.slug || "",
      maxCapacity: g.maxCapacity,
    }));
    const attendingGuests = recordsList
      .filter((r: any) => r && (r.attending === true || r.attending === "true"))
      .map((r: any) => {
        const groupId = typeof r.group === "object" ? r.group?.id : r.group;
        const groupName = typeof r.group === "object" ? r.group?.name : "";
        const code = String(r.passCode || r.id || "").toUpperCase();
        return {
          id: String(r.id),
          passCode: code,
          leadName: r.leadName || "Guest",
          leadPhone: r.leadPhone || "",
          hasSpouse: Boolean(r.hasSpouse),
          spouseName: r.spouseName || "",
          group: r.group,
          groupId: groupId || "",
          groupName: groupName || "",
          asoebiSent: Boolean(r.asoebiSent === true || r.asoebiSent === "true" || r.asoebiSent === 1),
          wantsAsoebi: Boolean(r.wantsAsoebi === true || r.wantsAsoebi === "true" || r.wantsAsoebi === 1),
          invitationSent: Boolean(r.invitationSent),
          invitationSentAt: r.invitationSentAt || null,
          invitationSentVia: r.invitationSentVia || null,
          previousInvitationSentAt: r.previousInvitationSentAt || null,
          previousInvitationSentVia: r.previousInvitationSentVia || null,
        };
      });

    // Safely parse saved passCampaignConfig
    let savedConfig: any = settingsRes?.passCampaignConfig || {};
    if (typeof savedConfig === "string") {
      try {
        savedConfig = JSON.parse(savedConfig);
      } catch {
        savedConfig = {};
      }
    }
    if (!savedConfig || typeof savedConfig !== "object") {
      savedConfig = {};
    }

    // Merge live WAHA sessions into senders list
    const baseSenders: any[] = Array.isArray(savedConfig.senders) && savedConfig.senders.length > 0
      ? savedConfig.senders
      : DEFAULT_SENDERS;

    const mergedSenders = baseSenders
      .filter((s) => s && typeof s === "object")
      .map((s: any) => {
        const sSession = String(s.wahaSession || s.id || s.name || "").toLowerCase();
        const liveMatch = sessions.find((ws: any) => {
          const wsName = String(ws?.name || "").toLowerCase();
          return wsName === sSession || wsName.includes(sSession) || sSession.includes(wsName);
        });

        return {
          id: String(s.id || s.name || "sender").toLowerCase(),
          name: s.name || liveMatch?.pushName || "Sender",
          wahaSession: liveMatch?.name || s.wahaSession || s.id || "default",
          phone: liveMatch?.phone || s.phone || "",
          status: liveMatch?.status || s.status || "SCAN_QR_CODE",
        };
      });

    // Also include any sessions from WAHA not already present
    for (const sess of sessions) {
      if (!sess?.name) continue;
      const sessNameLower = String(sess.name).toLowerCase();
      const exists = mergedSenders.some(
        (s: any) => String(s?.wahaSession || "").toLowerCase() === sessNameLower
      );
      if (!exists) {
        mergedSenders.push({
          id: sessNameLower,
          name: sess.pushName || sess.name,
          wahaSession: sess.name,
          phone: sess.phone || "",
          status: sess.status || "SCAN_QR_CODE",
        });
      }
    }

    const mergedConfig = {
      ...savedConfig,
      senders: mergedSenders,
      messageTemplate: savedConfig.messageTemplate || DEFAULT_MESSAGE_TEMPLATE,
      paceSeconds: savedConfig.paceSeconds || 8,
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
  } catch (err: any) {
    console.error("status.get unhandled error:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      message: `Failed to load campaign status: ${err?.message || String(err)}`,
    });
  }
});
