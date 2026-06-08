import type { GlobalConfig } from "@dyrected/core";
import { publicRead } from "../access/public.ts";
import { adminOnly } from "../access/admin.ts";

export const siteSettings: GlobalConfig = {
  slug: "site_settings",
  label: "Site Settings",
  fields: [
    // ─── Wedding Tab ─────────────────────────────────────────────
    {
      name: "partnerOneName",
      type: "text",
      label: "Partner One Name",
      required: true,
      admin: { tab: "Wedding" },
    },
    {
      name: "partnerTwoName",
      type: "text",
      label: "Partner Two Name",
      required: true,
      admin: { tab: "Wedding" },
    },
    {
      name: "weddingDate",
      type: "date",
      label: "Wedding Date",
      required: true,
      admin: { tab: "Wedding" },
    },
    {
      name: "weddingDateText",
      type: "text",
      label: "Wedding Date Display Text",
      defaultValue: "October 22 & 24, 2026",
      admin: { tab: "Wedding", description: "How the date appears on the site, e.g. October 22 & 24, 2026" },
    },
    {
      name: "weddingLocation",
      type: "text",
      label: "Location",
      defaultValue: "Lagos, Nigeria",
      admin: { tab: "Wedding", description: "Short location shown in the hero, e.g. Lagos, Nigeria" },
    },
    {
      name: "hashtag",
      type: "text",
      label: "Wedding Hashtag",
      defaultValue: "#TheSweetUnion",
      admin: { tab: "Wedding" },
    },

    // ─── Home Page Tab ───────────────────────────────────────────
    {
      name: "heroImage",
      type: "relationship",
      label: "Hero Photo",
      relationTo: "media",
      admin: { tab: "Home Page", description: "Main photo displayed in the hero section at the top of the page." },
    },
    {
      name: "heroSubtitle",
      type: "text",
      label: "Hero Subtitle",
      admin: { tab: "Home Page", placeholder: "e.g. Together with their families" },
    },
    {
      name: "countdownPhotos",
      type: "relationship",
      label: "Countdown Photos",
      relationTo: "media",
      hasMany: true,
      admin: { tab: "Home Page", description: "Photos shown in the scrapbook collage beside the countdown. Upload 2 for best results." },
    },
    {
      name: "wishlistTeaserImage",
      type: "relationship",
      label: "Registry Section Photo",
      relationTo: "media",
      admin: { tab: "Home Page", description: "Polaroid photo displayed next to the registry/wishlist card." },
    },
    {
      name: "wishlistTeaserTitle",
      type: "text",
      label: "Registry Section Title",
      defaultValue: "Support Our Union",
      admin: { tab: "Home Page", description: "Heading on the wishlist/registry card." },
    },
    {
      name: "wishlistTeaserDescription",
      type: "textarea",
      label: "Registry Section Text",
      defaultValue:
        "Your presence and prayers are everything we could ask for. If you wish to bless our home, we have put together a registry of items we'll need as we set up our life together in Lagos.",
      admin: { tab: "Home Page", description: "Body text on the wishlist/registry card." },
    },
    {
      name: "rsvpTeaserImage",
      type: "relationship",
      label: "FAQs Section Photo",
      relationTo: "media",
      admin: {
        tab: "Home Page",
        description: "Polaroid photo shown next to the FAQs accordion.",
      },
    },
    {
      name: "footerImage",
      type: "relationship",
      label: "Footer Photo",
      relationTo: "media",
      admin: {
        tab: "Home Page",
        description: "Small polaroid photo displayed in the site footer.",
      },
    },

    // ─── Our Story Tab ───────────────────────────────────────────
    {
      name: "storyFormat",
      type: "select",
      label: "Story Format",
      options: [
        { label: "Timeline", value: "timeline" },
      ],
      defaultValue: "timeline",
      admin: { tab: "Our Story" },
    },
    {
      name: "storySubtitle",
      type: "text",
      label: "Section Label",
      defaultValue: "Our Journey",
      admin: { tab: "Our Story", description: "Small uppercase label above the title, e.g. Our Journey" },
    },
    {
      name: "storyTitle",
      type: "text",
      label: "Section Title",
      defaultValue: "The Friendship that Grew",
      admin: { tab: "Our Story" },
    },
    {
      name: "storyDescription",
      type: "textarea",
      label: "Section Introduction",
      defaultValue:
        "We took our time, built a friendship that couldn't be broken, and ended up exactly where we belonged. Here is our story over the years.",
      admin: { tab: "Our Story" },
    },
    {
      name: "storyPhotos",
      type: "array",
      label: "Story Items",
      admin: { tab: "Our Story" },
      fields: [
        { name: "label", type: "text", label: "Timeframe / Date (e.g. September 2016)", required: true },
        { name: "title", type: "text", label: "Moment Title (e.g. Teen Church Exco)", required: true },
        { name: "description", type: "textarea", label: "Story Detail", required: true },
        { name: "photo", type: "relationship", label: "Photo", relationTo: "media" },
      ],
    },

    // ─── FAQs Tab ────────────────────────────────────────────────
    {
      name: "faqs",
      type: "array",
      label: "Frequently Asked Questions",
      admin: { tab: "FAQs" },
      fields: [
        { name: "question", type: "text", label: "Question", required: true },
        { name: "answer", type: "textarea", label: "Answer", required: true },
      ],
    },

    // ─── RSVP Tab ────────────────────────────────────────────────
    {
      name: "rsvpCutoffDate",
      type: "date",
      label: "RSVP Cutoff Date",
      required: true,
      admin: { tab: "RSVP", description: "Guests cannot submit or edit RSVPs after this date." },
    },
    {
      name: "rsvpCutoffTime",
      type: "text",
      label: "RSVP Cutoff Time",
      defaultValue: "23:59",
      admin: { tab: "RSVP", description: "24-hour format, e.g. 23:59" },
    },

    // ─── Payments Tab ────────────────────────────────────────────
    {
      name: "bankName",
      type: "text",
      label: "Bank Name",
      admin: { tab: "Payments", description: "Shown to guests contributing to cash fund items." },
    },
    {
      name: "accountNumber",
      type: "text",
      label: "Account Number",
      admin: { tab: "Payments" },
    },
    {
      name: "accountName",
      type: "text",
      label: "Account Name",
      admin: { tab: "Payments" },
    },
  ],
  access: {
    read: "true",
    update: "user != null",
  },
};
