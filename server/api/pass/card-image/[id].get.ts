import { defineEventHandler, getRouterParam, getQuery, createError, setHeader } from "h3";
import { createClient } from "@dyrected/sdk";
import QRCode from "qrcode";
import { Resvg } from "@resvg/resvg-js";
import { ensureServerFonts } from "~~/server/utils/og-fonts";

let cachedFontFiles: string[] = [];

export default defineEventHandler(async (event) => {
  const rawId = getRouterParam(event, "id") || "";
  const id = rawId.replace(/\.png$/i, "");
  if (!id) {
    throw createError({ statusCode: 400, message: "Missing pass ID" });
  }

  const query = getQuery(event);
  const isDownload = query.download === "true" || query.download === "1";

  const config = useRuntimeConfig();
  const appUrl = (config.public as any).appUrl || "https://thesweetunion.com";
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  // Parallel fetch: RSVP record + site settings
  const [rsvpRes, settingsRes] = await Promise.all([
    client.collection("rsvp_records").find({
      where: { id: { equals: id } },
      limit: 1,
      depth: 2,
    }).then(async (res) => {
      if (res.docs && res.docs.length > 0) return res;
      return client.collection("rsvp_records").find({
        where: { editToken: { equals: id } },
        limit: 1,
        depth: 2,
      });
    }),
    client.global("site_settings").get().catch(() => null) as Promise<any>,
  ]);

  const rsvp = rsvpRes?.docs?.[0];
  const leadName = rsvp?.leadName || "Honoured Guest";
  const hasSpouse = Boolean(rsvp?.hasSpouse);
  const spouseName = rsvp?.spouseName || "";
  const guestTitle = hasSpouse && spouseName ? `${leadName} & ${spouseName}` : leadName;
  const passCode = (rsvp?.id || id).toUpperCase();

  // Populate events & group
  let eventText = "";
  if (Array.isArray(rsvp?.selectedEvents)) {
    eventText = (rsvp.selectedEvents as any[])
      .map((e) => (typeof e === "object" && e?.name ? e.name : ""))
      .filter(Boolean)
      .join(" · ");
  }

  let groupName = "";
  if (rsvp?.group) {
    groupName = typeof rsvp.group === "object" && (rsvp.group as any)?.name ? (rsvp.group as any).name : "";
  }

  let coupleName = "ADUN & UCHE";
  let hashtag = "#THESWEETUNION";
  let weddingDateText = "OCTOBER 22 & 24, 2026";
  if (settingsRes?.partnerOneName && settingsRes?.partnerTwoName) {
    coupleName = `${settingsRes.partnerOneName} & ${settingsRes.partnerTwoName}`.toUpperCase();
  }
  if (settingsRes?.hashtag) hashtag = settingsRes.hashtag.toUpperCase();
  if (settingsRes?.weddingDateText) weddingDateText = settingsRes.weddingDateText.toUpperCase();

  const passUrl = `${appUrl}/pass/${id.toLowerCase()}`;
  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(passUrl, {
      margin: 1,
      width: 260,
      color: {
        dark: "#865172",
        light: "#F5EDF1",
      },
    });
  } catch (err) {
    console.warn("Failed to generate QR for card download:", err);
  }

  const escapeXml = (unsafe: string) =>
    (unsafe || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const safeGuestTitle = escapeXml(guestTitle);
  const safeCoupleName = escapeXml(coupleName);
  const safeHashtag = escapeXml(hashtag);
  const safePassCode = escapeXml(passCode);
  const safeDate = escapeXml(weddingDateText);
  const safeGroup = escapeXml(groupName.toUpperCase());
  const safeEvents = escapeXml(eventText);

  // Standalone Vertical Luxury Access Card SVG (600 x 860)
  const svg = `<svg width="600" height="860" viewBox="0 0 600 860" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#653853"/>
      <stop offset="100%" stop-color="#4A253B"/>
    </linearGradient>

    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCE8B3"/>
      <stop offset="40%" stop-color="#D4AF37"/>
      <stop offset="60%" stop-color="#F5D77F"/>
      <stop offset="100%" stop-color="#B48A1E"/>
    </linearGradient>

    <linearGradient id="goldReverse" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#B48A1E"/>
      <stop offset="40%" stop-color="#F5D77F"/>
      <stop offset="60%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#FCE8B3"/>
    </linearGradient>
  </defs>

  <!-- Outer Card Shell -->
  <rect x="0" y="0" width="600" height="860" fill="url(#cardBg)" stroke="url(#gold)" stroke-width="4"/>

  <!-- Inner Double Gold Frame -->
  <rect x="18" y="18" width="564" height="824" fill="none" stroke="url(#goldReverse)" stroke-width="2"/>
  <rect x="24" y="24" width="552" height="812" fill="none" stroke="#D4AF37" stroke-width="1.2" opacity="0.85"/>

  <!-- Top Botanical Leaves -->
  <g transform="translate(300, 52)">
    <path d="M0 0 C-22 -12, -48 -15, -75 -6" stroke="url(#gold)" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <path d="M0 0 C22 -12, 48 -15, 75 -6" stroke="url(#gold)" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <path d="M-45 -6 C-51 -15, -60 -18, -69 -12" stroke="url(#gold)" stroke-width="1.4" stroke-linecap="round" fill="none"/>
    <path d="M45 -6 C51 -15, 60 -18, 69 -12" stroke="url(#gold)" stroke-width="1.4" stroke-linecap="round" fill="none"/>
    <circle cx="0" cy="0" r="3" fill="url(#gold)"/>
    <circle cx="-69" cy="-12" r="2.2" fill="url(#gold)" opacity="0.8"/>
    <circle cx="69" cy="-12" r="2.2" fill="url(#gold)" opacity="0.8"/>
  </g>

  <!-- Couple Name -->
  <text x="300" y="105" text-anchor="middle" font-family="Cinzel" font-size="32" font-weight="700" fill="url(#gold)" letter-spacing="3">
    ${safeCoupleName}
  </text>

  <!-- Hashtag -->
  <text x="300" y="136" text-anchor="middle" font-family="Inter" font-size="14" font-weight="700" fill="url(#gold)" letter-spacing="4" opacity="0.9">
    ${safeHashtag}
  </text>

  <!-- Divider Diamond -->
  <line x1="120" y1="160" x2="260" y2="160" stroke="url(#gold)" stroke-width="1.5" opacity="0.6"/>
  <polygon points="300,152 308,160 300,168 292,160" fill="url(#gold)"/>
  <line x1="340" y1="160" x2="480" y2="160" stroke="url(#gold)" stroke-width="1.5" opacity="0.6"/>

  <!-- Guest Name -->
  <text x="300" y="220" text-anchor="middle" font-family="Cinzel" font-size="28" font-weight="700" fill="#FFFFFF">
    ${safeGuestTitle}
  </text>

  <!-- Admits 2 Pill -->
  ${
    hasSpouse
      ? `<g transform="translate(300, 246)">
      <rect x="-60" y="0" width="120" height="24" rx="4" fill="#653853" stroke="url(#gold)" stroke-width="1.5"/>
      <text x="0" y="17" text-anchor="middle" font-family="Inter" font-size="12" font-weight="800" fill="url(#gold)" letter-spacing="2">ADMITS 2</text>
    </g>`
      : ""
  }

  <!-- Group Name -->
  ${
    safeGroup
      ? `<text x="300" y="${hasSpouse ? 298 : 270}" text-anchor="middle" font-family="Inter" font-size="15" font-weight="700" fill="url(#gold)" letter-spacing="3">${safeGroup}</text>`
      : ""
  }

  <!-- Events -->
  ${
    safeEvents
      ? `<text x="300" y="${hasSpouse ? (safeGroup ? 324 : 298) : safeGroup ? 296 : 270}" text-anchor="middle" font-family="Inter" font-size="14" font-weight="500" fill="#F5EDF1" opacity="0.95">${safeEvents}</text>`
      : ""
  }

  <!-- QR Code Frame -->
  <g transform="translate(180, ${hasSpouse ? 350 : 320})">
    <rect x="0" y="0" width="240" height="240" rx="12" fill="#F5EDF1" stroke="url(#gold)" stroke-width="2"/>
    ${
      qrDataUrl
        ? `<image x="15" y="15" width="210" height="210" href="${qrDataUrl}"/>`
        : `<rect x="15" y="15" width="210" height="210" fill="#FAF5F8"/>`
    }
  </g>

  <!-- Pass Code -->
  <text x="300" y="${hasSpouse ? 628 : 598}" text-anchor="middle" font-family="Inter" font-size="19" font-weight="800" fill="url(#gold)" letter-spacing="4">
    ${safePassCode}
  </text>

  <!-- Footer Rule -->
  <line x1="90" y1="${hasSpouse ? 665 : 640}" x2="510" y2="${hasSpouse ? 665 : 640}" stroke="url(#gold)" stroke-width="1.2" opacity="0.5"/>

  <!-- Date & Welcome -->
  <text x="300" y="${hasSpouse ? 706 : 685}" text-anchor="middle" font-family="Inter" font-size="16" font-weight="600" fill="url(#gold)" letter-spacing="3">
    ${safeDate}
  </text>
  <text x="300" y="${hasSpouse ? 738 : 718}" text-anchor="middle" font-family="Inter" font-size="14" font-style="italic" fill="#E8D7E1" opacity="0.85">
    Welcome to our celebration
  </text>
  <text x="300" y="${hasSpouse ? 770 : 750}" text-anchor="middle" font-family="Inter" font-size="13" font-weight="600" fill="url(#gold)" letter-spacing="3" opacity="0.75">
    ${safeHashtag}
  </text>
</svg>`;

  if (cachedFontFiles.length === 0) {
    cachedFontFiles = ensureServerFonts();
  }

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 1200, // 2x retina render
    },
    font: {
      fontFiles: cachedFontFiles.length > 0 ? cachedFontFiles : undefined,
      defaultFontFamily: "Inter",
      serifFamily: "Cinzel",
      sansSerifFamily: "Inter",
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  const safeFilename = `wedding-pass-${leadName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`;

  setHeader(event, "Content-Type", "image/png");
  setHeader(event, "Cache-Control", "public, max-age=604800, s-maxage=604800");
  setHeader(event, "Content-Length", pngBuffer.length);

  if (isDownload) {
    setHeader(event, "Content-Disposition", `attachment; filename="${safeFilename}"`);
  }

  return pngBuffer;
});
