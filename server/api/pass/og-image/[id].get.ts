import { defineEventHandler, getRouterParam, createError, setHeader } from "h3";
import { createClient } from "@dyrected/sdk";
import QRCode from "qrcode";
import { Resvg } from "@resvg/resvg-js";

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

  // Fetch site settings if available
  let coupleName = "Adun & Uche";
  let hashtag = "#TheSweetUnion";
  let weddingDateText = "October 22 & 24, 2026";
  try {
    const settings = (await client.global("site_settings").get()) as any;
    if (settings?.partnerOneName && settings?.partnerTwoName) {
      coupleName = `${settings.partnerOneName} & ${settings.partnerTwoName}`;
    }
    if (settings?.hashtag) hashtag = settings.hashtag;
    if (settings?.weddingDateText) weddingDateText = settings.weddingDateText;
  } catch {}

  // Generate QR Code data URL
  const passUrl = `${appUrl}/pass/${id.toLowerCase()}`;
  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(passUrl, {
      margin: 1,
      width: 240,
      color: {
        dark: "#4A253B",
        light: "#FFFFFF",
      },
    });
  } catch (err) {
    console.warn("Failed to generate QR in OG image:", err);
  }

  // Escape XML entities
  const escapeXml = (unsafe: string) =>
    unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const safeGuestTitle = escapeXml(guestTitle);
  const safeCoupleName = escapeXml(coupleName.toUpperCase());
  const safeHashtag = escapeXml(hashtag.toUpperCase());
  const safePassCode = escapeXml(passCode);
  const safeDate = escapeXml(weddingDateText.toUpperCase());

  // 1200x630 Rich Wedding Pass Card Preview
  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#301626"/>
      <stop offset="50%" stop-color="#4A253B"/>
      <stop offset="100%" stop-color="#230E1B"/>
    </linearGradient>

    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#552C43"/>
      <stop offset="100%" stop-color="#3B1C2E"/>
    </linearGradient>

    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCE8B3"/>
      <stop offset="35%" stop-color="#D4AF37"/>
      <stop offset="65%" stop-color="#F5D77F"/>
      <stop offset="100%" stop-color="#B48A1E"/>
    </linearGradient>

    <linearGradient id="goldSoft" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D4AF37" stop-opacity="0"/>
      <stop offset="50%" stop-color="#FCE8B3" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Canvas Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Outer Frame -->
  <rect x="24" y="24" width="1152" height="582" stroke="url(#gold)" stroke-width="1.5" fill="none" opacity="0.6"/>
  <rect x="32" y="32" width="1136" height="566" stroke="url(#gold)" stroke-width="0.75" stroke-dasharray="6 4" fill="none" opacity="0.4"/>

  <!-- LEFT COLUMN: Typography & Invitation Text -->
  <g transform="translate(80, 0)">
    <!-- Brand Tag -->
    <text x="0" y="125" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="13" font-weight="800" fill="url(#gold)" letter-spacing="5">
      OFFICIAL WEDDING PASS
    </text>

    <!-- Couple Names -->
    <text x="0" y="200" font-family="'Georgia', serif" font-size="56" font-weight="700" fill="#FFFFFF" letter-spacing="2">
      ${safeCoupleName}
    </text>

    <!-- Hashtag -->
    <text x="0" y="240" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="url(#gold)" letter-spacing="6" opacity="0.9">
      ${safeHashtag}
    </text>

    <!-- Divider -->
    <line x1="0" y1="270" x2="420" y2="270" stroke="url(#goldSoft)" stroke-width="1.5"/>

    <!-- Invitation Message -->
    <text x="0" y="330" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="16" font-weight="600" fill="#EBDDE5" letter-spacing="1">
      Admit One Guest &amp; Partner
    </text>
    <text x="0" y="375" font-family="'Georgia', serif" font-size="34" font-weight="600" fill="#FFFFFF">
      ${safeGuestTitle}
    </text>

    <!-- Date & Location -->
    <text x="0" y="465" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="15" font-weight="700" fill="url(#gold)" letter-spacing="3">
      ${safeDate}
    </text>
    <text x="0" y="495" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="14" font-weight="500" fill="#D4C2CC">
      LAGOS, NIGERIA · PRESENT PASS AT ENTRANCE
    </text>
  </g>

  <!-- RIGHT COLUMN: Luxury Access Card Replica -->
  <g transform="translate(740, 55)">
    <!-- Card Shadow & Shell -->
    <rect x="0" y="0" width="370" height="520" rx="8" fill="url(#cardBg)" stroke="url(#gold)" stroke-width="2"/>
    <rect x="10" y="10" width="350" height="500" rx="4" fill="none" stroke="url(#gold)" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>

    <!-- Top Monogram & Couple -->
    <text x="185" y="65" text-anchor="middle" font-family="'Georgia', serif" font-size="24" font-weight="700" fill="url(#gold)" letter-spacing="2">
      ${safeCoupleName}
    </text>
    <text x="185" y="90" text-anchor="middle" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="10" font-weight="700" fill="url(#gold)" letter-spacing="4" opacity="0.8">
      ${safeHashtag}
    </text>

    <!-- Small Diamond -->
    <rect x="180" y="108" width="10" height="10" transform="rotate(45 185 113)" fill="url(#gold)"/>

    <!-- Guest Name on Card -->
    <text x="185" y="160" text-anchor="middle" font-family="'Georgia', serif" font-size="22" font-weight="700" fill="#FFFFFF">
      ${safeGuestTitle}
    </text>

    ${
      hasSpouse
        ? `<g transform="translate(185, 185)">
        <rect x="-48" y="0" width="96" height="20" rx="3" fill="#653853" stroke="url(#gold)" stroke-width="1"/>
        <text x="0" y="14" text-anchor="middle" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="10" font-weight="800" fill="url(#gold)" letter-spacing="2">ADMITS 2</text>
      </g>`
        : ""
    }

    <!-- QR Code Container -->
    <g transform="translate(85, ${hasSpouse ? 225 : 205})">
      <rect x="-10" y="-10" width="220" height="220" rx="8" fill="#FFFFFF" stroke="url(#gold)" stroke-width="2"/>
      ${
        qrDataUrl
          ? `<image x="0" y="0" width="200" height="200" href="${qrDataUrl}"/>`
          : `<rect x="0" y="0" width="200" height="200" fill="#FAF5F8"/>`
      }
    </g>

    <!-- Pass Code Footer -->
    <text x="185" y="${hasSpouse ? 480 : 465}" text-anchor="middle" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="14" font-weight="800" fill="url(#gold)" letter-spacing="4">
      ${safePassCode}
    </text>
  </g>
</svg>`;

  // Convert SVG to PNG Buffer via Resvg
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 1200,
    },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: "sans-serif",
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  setHeader(event, "Content-Type", "image/png");
  setHeader(event, "Cache-Control", "public, max-age=86400, s-maxage=86400");
  setHeader(event, "Content-Length", pngBuffer.length);

  return pngBuffer;
});
