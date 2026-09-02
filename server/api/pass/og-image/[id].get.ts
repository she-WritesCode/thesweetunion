import { defineEventHandler, getRouterParam, createError, setHeader } from "h3";
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

  // Escape XML entities for safety in SVG
  const escapeXml = (unsafe: string) =>
    unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const safeGuestTitle = escapeXml(guestTitle);
  const safePassCode = escapeXml(passCode);

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4a253b"/>
      <stop offset="50%" stop-color="#653853"/>
      <stop offset="100%" stop-color="#381c2d"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCE8B3"/>
      <stop offset="40%" stop-color="#D4AF37"/>
      <stop offset="60%" stop-color="#F5D77F"/>
      <stop offset="100%" stop-color="#B48A1E"/>
    </linearGradient>
    <linearGradient id="cardGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#8A651E"/>
    </linearGradient>
    <pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="2" height="2" fill="#FFFFFF" fill-opacity="0.04"/>
      <rect x="2" y="2" width="2" height="2" fill="#FFFFFF" fill-opacity="0.04"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grain)"/>

  <!-- Outer Elegant Frame -->
  <rect x="36" y="36" width="1128" height="558" stroke="url(#gold)" stroke-width="2" fill="none"/>
  <rect x="46" y="46" width="1108" height="538" stroke="url(#gold)" stroke-width="1" stroke-dasharray="6 4" fill="none" stroke-opacity="0.6"/>

  <!-- Botanical Ornament Top -->
  <g transform="translate(600, 110)">
    <path d="M0 0 C-40 -20, -100 -20, -160 0" stroke="url(#gold)" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M0 0 C40 -20, 100 -20, 160 0" stroke="url(#gold)" stroke-width="2" stroke-linecap="round" fill="none"/>
    <circle cx="0" cy="0" r="4" fill="url(#gold)"/>
    <circle cx="-80" cy="-12" r="3" fill="url(#gold)"/>
    <circle cx="80" cy="-12" r="3" fill="url(#gold)"/>
    <circle cx="-160" cy="0" r="2.5" fill="url(#gold)"/>
    <circle cx="160" cy="0" r="2.5" fill="url(#gold)"/>
  </g>

  <!-- Couple Title -->
  <text x="600" y="165" text-anchor="middle" font-family="'Cinzel', 'Times New Roman', serif" font-size="44" font-weight="700" fill="url(#gold)" letter-spacing="4">
    ADUN &amp; UCHE
  </text>

  <text x="600" y="202" text-anchor="middle" font-family="'Helvetica Neue', sans-serif" font-size="16" font-weight="600" fill="url(#gold)" letter-spacing="8" fill-opacity="0.9">
    #THESWEETUNION
  </text>

  <!-- Divider with Diamond -->
  <line x1="420" y1="230" x2="560" y2="230" stroke="url(#gold)" stroke-width="1" stroke-opacity="0.6"/>
  <rect x="593" y="223" width="14" height="14" transform="rotate(45 600 230)" fill="url(#gold)"/>
  <line x1="640" y1="230" x2="780" y2="230" stroke="url(#gold)" stroke-width="1" stroke-opacity="0.6"/>

  <!-- Pass Type Banner -->
  <text x="600" y="280" text-anchor="middle" font-family="'Helvetica Neue', sans-serif" font-size="18" font-weight="700" fill="#FAF5F8" fill-opacity="0.75" letter-spacing="6">
    OFFICIAL DIGITAL WEDDING PASS
  </text>

  <!-- Guest Name -->
  <text x="600" y="348" text-anchor="middle" font-family="'Georgia', serif" font-size="52" font-weight="600" fill="#FFFFFF" letter-spacing="1">
    ${safeGuestTitle}
  </text>

  ${
    hasSpouse
      ? `<g transform="translate(600, 375)">
      <rect x="-65" y="0" width="130" height="28" stroke="url(#gold)" stroke-width="1.5" fill="#653853" fill-opacity="0.8"/>
      <text x="0" y="19" text-anchor="middle" font-family="'Helvetica Neue', sans-serif" font-size="13" font-weight="800" fill="url(#gold)" letter-spacing="3">ADMITS 2</text>
    </g>`
      : ""
  }

  <!-- Pass Code Badge -->
  <g transform="translate(600, ${hasSpouse ? 435 : 410})">
    <rect x="-140" y="0" width="280" height="50" rx="8" fill="#FAF5F8" stroke="url(#gold)" stroke-width="2"/>
    <text x="0" y="22" text-anchor="middle" font-family="'Helvetica Neue', sans-serif" font-size="11" font-weight="700" fill="#865172" letter-spacing="3">PASS CODE</text>
    <text x="0" y="42" text-anchor="middle" font-family="'Helvetica Neue', sans-serif" font-size="18" font-weight="800" fill="#653853" letter-spacing="5">${safePassCode}</text>
  </g>

  <!-- Footer Dates & Venue -->
  <text x="600" y="525" text-anchor="middle" font-family="'Helvetica Neue', sans-serif" font-size="16" font-weight="600" fill="url(#gold)" letter-spacing="4">
    OCTOBER 22 &amp; 24, 2026 · LAGOS, NIGERIA
  </text>
  <text x="600" y="555" text-anchor="middle" font-family="'Georgia', serif" font-size="15" font-style="italic" fill="#FAF5F8" fill-opacity="0.7">
    Kindly present this digital pass at the entrance
  </text>
</svg>`;

  setHeader(event, "Content-Type", "image/svg+xml");
  setHeader(event, "Cache-Control", "public, max-age=86400, s-maxage=86400");
  return svg;
});
