import type { GlobalConfig } from "@dyrected/core";
import { publicRead } from "../access/public.ts";
import { adminOnly } from "../access/admin.ts";

export const siteSettings: GlobalConfig = {
  slug: "site_settings",
  label: "Site Settings",
  fields: [
    // ─── Couple Tab ──────────────────────────────────────────────
    {
      name: "partnerOneName",
      type: "text",
      label: "Partner One Name",
      required: true,
      admin: { tab: "Couple" },
    },
    {
      name: "partnerTwoName",
      type: "text",
      label: "Partner Two Name",
      required: true,
      admin: { tab: "Couple" },
    },
    {
      name: "weddingDate",
      type: "date",
      label: "Wedding Date",
      required: true,
      admin: { tab: "Couple" },
    },
    {
      name: "weddingTime",
      type: "text",
      label: "Wedding Time",
      admin: { tab: "Couple", placeholder: "e.g. 3:00 PM" },
    },
    {
      name: "weddingDateText",
      type: "text",
      label: "Wedding Date Display Text (e.g. October 22 & 24, 2026)",
      defaultValue: "October 22 & 24, 2026",
      admin: { tab: "Couple" },
    },
    {
      name: "weddingLocation",
      type: "text",
      label: "Location (e.g. Lagos, Nigeria)",
      defaultValue: "Lagos, Nigeria",
      admin: { tab: "Couple" },
    },
    {
      name: "hashtag",
      type: "text",
      label: "Wedding Hashtag",
      defaultValue: "#TheSweetUnion",
      admin: { tab: "Couple" },
    },

    // ─── Venue Tab ───────────────────────────────────────────────
    {
      name: "venueName",
      type: "text",
      label: "Venue Name",
      required: true,
      admin: { tab: "Venue" },
    },
    {
      name: "venueAddress",
      type: "textarea",
      label: "Venue Address",
      required: true,
      admin: { tab: "Venue" },
    },
    // ─── Hero Tab ────────────────────────────────────────────────
    {
      name: "heroImage",
      type: "relationship",
      label: "Hero Photo",
      relationTo: "media",
      admin: { tab: "Hero", description: "Main photo displayed in the hero section." },
    },
    {
      name: "heroSubtitle",
      type: "text",
      label: "Hero Subtitle",
      admin: { tab: "Hero", placeholder: "e.g. Together with their families" },
    },

    // ─── Our Story Tab ───────────────────────────────────────────
    {
      name: "storyFormat",
      type: "select",
      label: "Story Format",
      options: [
        { label: "Timeline", value: "timeline" },
        // { label: "Confessions", value: "confessions" },
        // { label: "Blend", value: "blend" },
      ],
      defaultValue: "timeline",
      admin: { tab: "Our Story" },
    },
    {
      name: "storySubtitle",
      type: "text",
      label: "Story Subtitle",
      defaultValue: "Our Journey",
      admin: { tab: "Our Story" },
    },
    {
      name: "storyTitle",
      type: "text",
      label: "Story Title",
      defaultValue: "The Friendship that Grew",
      admin: { tab: "Our Story" },
    },
    {
      name: "storyDescription",
      type: "textarea",
      label: "Story Description",
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
        { name: "label", type: "text", label: "Timeframe/Date (e.g. September 2016)", required: true },
        { name: "title", type: "text", label: "Title (e.g. Teen Church Exco)", required: true },
        { name: "description", type: "textarea", label: "Story Detail", required: true },
        { name: "photo", type: "relationship", label: "Photo", relationTo: "media" },
      ],
    },

    // ─── Schedule & FAQs Tab ─────────────────────────────────────
    {
      name: "schedule",
      type: "array",
      label: "Event Schedule",
      admin: { tab: "Schedule & FAQs" },
      fields: [
        { name: "time", type: "datetime", label: "Time (e.g. 1:00 PM)", required: true },
        { name: "event", type: "text", label: "Event", required: true },
        { name: "description", type: "textarea", label: "Description" },
      ],
    },
    {
      name: "faqs",
      type: "array",
      label: "Frequently Asked Questions",
      admin: { tab: "Schedule & FAQs" },
      fields: [
        { name: "question", type: "text", label: "Question", required: true },
        { name: "answer", type: "textarea", label: "Answer", required: true },
      ],
    },

    // ─── RSVP Config Tab ─────────────────────────────────────────
    {
      name: "rsvpCutoffDate",
      type: "date",
      label: "RSVP Cutoff Date",
      required: true,
      admin: { tab: "RSVP Config" },
    },
    {
      name: "rsvpCutoffTime",
      type: "text",
      label: "RSVP Cutoff Time",
      defaultValue: "23:59",
      admin: { tab: "RSVP Config" },
    },

    // ─── Payments Tab ────────────────────────────────────────────
    {
      name: "bankName",
      type: "text",
      label: "Bank Name",
      admin: { tab: "Payments", description: "Bank details for cash fund contributions." },
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

    // ─── Admin Tab ───────────────────────────────────────────────
    {
      name: "adminEmail",
      type: "email",
      label: "Admin Notification Email",
      required: true,
      admin: { tab: "Admin", description: "Email address to receive RSVP and reservation notifications." },
    },
  ],
  access: {
    read: publicRead,
    update: adminOnly,
  },
};
