import { defineEventHandler, getRouterParam, createError, setHeader } from "h3";
import { createClient } from "@dyrected/sdk";
import QRCode from "qrcode";
import { Resvg } from "@resvg/resvg-js";
import path from "path";
import fs from "fs";

export default defineEventHandler(async (event) => {
  const rawId = getRouterParam(event, "id") || "";
  // Strip .png if present in URL (e.g. /api/pass/og-image/ieyhqr.png)
  const id = rawId.replace(/\.png$/i, "");
  if (!id) {
    throw createError({ statusCode: 400, message: "Missing pass ID" });
  }

  const config = useRuntimeConfig();
  const appUrl = (config.public as any).appUrl || "https://thesweetunion.com";
  const client = createClient({
    baseUrl: config.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  // Query RSVP record
  let result = await client.collection("rsvp_records").find({
    where: { id: { equals: id } },
    limit: 1,
    depth: 1,
  });

  if (!result.docs || result.docs.length === 0) {
    result = await client.collection("rsvp_records").find({
      where: { editToken: { equals: id } },
      limit: 1,
      depth: 1,
    });
  }

  const rsvp = result.docs?.[0];
  const leadName = rsvp?.leadName || "Honoured Guest";
  const hasSpouse = Boolean(rsvp?.hasSpouse);
  const spouseName = rsvp?.spouseName || "";
  const guestTitle = hasSpouse && spouseName ? `${leadName} & ${spouseName}` : leadName;
  const passCode = (rsvp?.id || id).toUpperCase();

  // Populate events & group
  let eventText = "";
  let groupName = "";
  if (Array.isArray(rsvp?.selectedEvents) && rsvp.selectedEvents.length > 0) {
    if (typeof rsvp.selectedEvents[0] === "object" && rsvp.selectedEvents[0]?.name) {
      eventText = rsvp.selectedEvents.map((e: any) => e.name).join(" · ");
    } else {
      try {
        const eventsRes = await client.collection("events").find({ limit: 50, depth: 1 });
        eventText = (eventsRes?.docs || [])
          .filter((e: any) => rsvp.selectedEvents.includes(e.id))
          .map((e: any) => e.name)
          .join(" · ");
      } catch {}
    }
  }

  if (rsvp?.group) {
    if (typeof rsvp.group === "object" && rsvp.group?.name) {
      groupName = rsvp.group.name;
    } else {
      try {
        const groupRes = await client.collection("rsvp_groups").find({
          where: { id: { equals: rsvp.group } },
          limit: 1,
        });
        groupName = groupRes?.docs?.[0]?.name || "";
      } catch {}
    }
  }

  // Fetch site settings if available
  let coupleName = "ADUN & UCHE";
  let hashtag = "#THESWEETUNION";
  let weddingDateText = "OCTOBER 22 & 24, 2026";
  try {
    const settings = (await client.global("site_settings").get()) as any;
    if (settings?.partnerOneName && settings?.partnerTwoName) {
      coupleName = `${settings.partnerOneName} & ${settings.partnerTwoName}`.toUpperCase();
    }
    if (settings?.hashtag) hashtag = settings.hashtag.toUpperCase();
    if (settings?.weddingDateText) weddingDateText = settings.weddingDateText.toUpperCase();
  } catch {}

  // Generate QR Code data URL matching the Access Card colors
  const passUrl = `${appUrl}/pass/${id.toLowerCase()}`;
  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(passUrl, {
      margin: 1,
      width: 220,
      color: {
        dark: "#865172",
        light: "#F5EDF1",
      },
    });
  } catch (err) {
    console.warn("Failed to generate QR in OG image:", err);
  }

  // Escape XML entities
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

  // 1200x630 Rich Wedding Pass Card Preview
  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2D1222"/>
      <stop offset="50%" stop-color="#4A253B"/>
      <stop offset="100%" stop-color="#1F0C17"/>
    </linearGradient>

    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#653853"/>
      <stop offset="100%" stop-color="#4F263E"/>
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

  <!-- Canvas Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Left Side Branding -->
  <g transform="translate(100, 0)">
    <text x="0" y="140" font-family="Inter" font-size="13" font-weight="700" fill="url(#gold)" letter-spacing="4">
      OFFICIAL WEDDING INVITATION
    </text>

    <text x="0" y="215" font-family="Cinzel" font-size="52" font-weight="700" fill="url(#gold)" letter-spacing="3">
      ${safeCoupleName}
    </text>

    <text x="0" y="255" font-family="Inter" font-size="16" font-weight="600" fill="url(#gold)" letter-spacing="6" opacity="0.9">
      ${safeHashtag}
    </text>

    <line x1="0" y1="285" x2="380" y2="285" stroke="url(#gold)" stroke-width="1.5" opacity="0.6"/>

    <text x="0" y="345" font-family="Inter" font-size="15" font-weight="600" fill="#E8D7E1" letter-spacing="1">
      ${hasSpouse ? "Admit Guest &amp; Partner" : "Admit One Guest"}
    </text>
    <text x="0" y="390" font-family="Cinzel" font-size="34" font-weight="700" fill="#FFFFFF">
      ${safeGuestTitle}
    </text>

    <text x="0" y="480" font-family="Inter" font-size="14" font-weight="700" fill="url(#gold)" letter-spacing="3">
      ${safeDate}
    </text>
    <text x="0" y="510" font-family="Inter" font-size="13" font-weight="500" fill="#D4C2CC">
      LAGOS, NIGERIA · PRESENT PASS AT ENTRANCE
    </text>
  </g>

  <!-- Right Side: Exact Access Card Replica -->
  <g transform="translate(720, 30)">
    <!-- Outer Card Shell -->
    <rect x="0" y="0" width="400" height="570" fill="url(#cardBg)" stroke="url(#gold)" stroke-width="2"/>

    <!-- Inner Frame with Inset Double Border -->
    <rect x="12" y="12" width="376" height="546" fill="none" stroke="url(#goldReverse)" stroke-width="1.5"/>
    <rect x="16" y="16" width="368" height="538" fill="none" stroke="#D4AF37" stroke-width="1" opacity="0.8"/>

    <!-- Top Botanical Leaves -->
    <g transform="translate(200, 35)">
      <path d="M0 0 C-15 -8, -32 -10, -50 -4" stroke="url(#gold)" stroke-width="1.2" stroke-linecap="round" fill="none"/>
      <path d="M0 0 C15 -8, 32 -10, 50 -4" stroke="url(#gold)" stroke-width="1.2" stroke-linecap="round" fill="none"/>
      <path d="M-30 -4 C-34 -10, -40 -12, -46 -8" stroke="url(#gold)" stroke-width="0.9" stroke-linecap="round" fill="none"/>
      <path d="M30 -4 C34 -10, 40 -12, 46 -8" stroke="url(#gold)" stroke-width="0.9" stroke-linecap="round" fill="none"/>
      <circle cx="0" cy="0" r="2" fill="url(#gold)"/>
      <circle cx="-46" cy="-8" r="1.5" fill="url(#gold)" opacity="0.8"/>
      <circle cx="46" cy="-8" r="1.5" fill="url(#gold)" opacity="0.8"/>
    </g>

    <!-- Couple Name -->
    <text x="200" y="70" text-anchor="middle" font-family="Cinzel" font-size="22" font-weight="700" fill="url(#gold)" letter-spacing="2">
      ${safeCoupleName}
    </text>

    <!-- Hashtag -->
    <text x="200" y="92" text-anchor="middle" font-family="Inter" font-size="10" font-weight="700" fill="url(#gold)" letter-spacing="3" opacity="0.85">
      ${safeHashtag}
    </text>

    <!-- Divider Diamond -->
    <line x1="80" y1="108" x2="175" y2="108" stroke="url(#gold)" stroke-width="1" opacity="0.6"/>
    <polygon points="200,103 205,108 200,113 195,108" fill="url(#gold)"/>
    <line x1="225" y1="108" x2="320" y2="108" stroke="url(#gold)" stroke-width="1" opacity="0.6"/>

    <!-- Guest Name -->
    <text x="200" y="150" text-anchor="middle" font-family="Cinzel" font-size="20" font-weight="700" fill="#FFFFFF">
      ${safeGuestTitle}
    </text>

    <!-- Admits 2 Pill -->
    ${
      hasSpouse
        ? `<g transform="translate(200, 168)">
        <rect x="-42" y="0" width="84" height="18" rx="3" fill="#653853" stroke="url(#gold)" stroke-width="1"/>
        <text x="0" y="13" text-anchor="middle" font-family="Inter" font-size="9" font-weight="800" fill="url(#gold)" letter-spacing="1.5">ADMITS 2</text>
      </g>`
        : ""
    }

    <!-- Group Name -->
    ${
      safeGroup
        ? `<text x="200" y="${hasSpouse ? 204 : 185}" text-anchor="middle" font-family="Inter" font-size="11" font-weight="700" fill="url(#gold)" letter-spacing="2">${safeGroup}</text>`
        : ""
    }

    <!-- Events -->
    ${
      safeEvents
        ? `<text x="200" y="${hasSpouse ? (safeGroup ? 222 : 204) : safeGroup ? 203 : 185}" text-anchor="middle" font-family="Inter" font-size="10" font-weight="500" fill="#F5EDF1" opacity="0.9">${safeEvents}</text>`
        : ""
    }

    <!-- QR Code Frame -->
    <g transform="translate(120, ${hasSpouse ? 240 : 220})">
      <rect x="0" y="0" width="160" height="160" rx="8" fill="#F5EDF1" stroke="url(#gold)" stroke-width="1.5"/>
      ${
        qrDataUrl
          ? `<image x="10" y="10" width="140" height="140" href="${qrDataUrl}"/>`
          : `<rect x="10" y="10" width="140" height="140" fill="#FAF5F8"/>`
      }
    </g>

    <!-- Pass Code -->
    <text x="200" y="${hasSpouse ? 425 : 405}" text-anchor="middle" font-family="Inter" font-size="13" font-weight="800" fill="url(#gold)" letter-spacing="3">
      ${safePassCode}
    </text>

    <!-- Footer Rule -->
    <line x1="60" y1="${hasSpouse ? 450 : 435}" x2="340" y2="${hasSpouse ? 450 : 435}" stroke="url(#gold)" stroke-width="0.8" opacity="0.5"/>

    <!-- Date & Welcome -->
    <text x="200" y="${hasSpouse ? 478 : 465}" text-anchor="middle" font-family="Inter" font-size="11" font-weight="600" fill="url(#gold)" letter-spacing="2">
      ${safeDate}
    </text>
    <text x="200" y="${hasSpouse ? 500 : 487}" text-anchor="middle" font-family="Inter" font-size="10" font-style="italic" fill="#E8D7E1" opacity="0.8">
      Welcome to our celebration
    </text>
    <text x="200" y="${hasSpouse ? 522 : 509}" text-anchor="middle" font-family="Inter" font-size="9" font-weight="600" fill="url(#gold)" letter-spacing="2" opacity="0.7">
      ${safeHashtag}
    </text>
  </g>
</svg>`;

  // Locate font files
  const possibleFontPaths = [
    path.resolve(process.cwd(), "public/fonts"),
    path.resolve(process.cwd(), ".output/public/fonts"),
    path.resolve(process.cwd(), "node_modules/@fontsource/cinzel/files"),
  ];

  const fontFiles: string[] = [];
  const cinzelPath = path.resolve(process.cwd(), "public/fonts/cinzel-700.woff");
  const inter600Path = path.resolve(process.cwd(), "public/fonts/inter-600.woff");
  const inter400Path = path.resolve(process.cwd(), "public/fonts/inter-400.woff");

  if (fs.existsSync(cinzelPath)) fontFiles.push(cinzelPath);
  if (fs.existsSync(inter600Path)) fontFiles.push(inter600Path);
  if (fs.existsSync(inter400Path)) fontFiles.push(inter400Path);

  // Convert SVG to PNG Buffer via Resvg with fonts
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 1200,
    },
    font: {
      fontFiles: fontFiles.length > 0 ? fontFiles : undefined,
      fontDirs: possibleFontPaths.filter((p) => fs.existsSync(p)),
      defaultFontFamily: "Inter",
      serifFamily: "Cinzel",
      sansSerifFamily: "Inter",
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  setHeader(event, "Content-Type", "image/png");
  setHeader(event, "Cache-Control", "public, max-age=86400, s-maxage=86400");
  setHeader(event, "Content-Length", pngBuffer.length);

  return pngBuffer;
});
