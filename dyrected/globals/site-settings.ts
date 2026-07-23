import {
  defineGlobal,
  defineTab,
  defineTextField,
  defineDateField,
  defineRelationshipField,
  defineTextareaField,
  defineSelectField,
  defineArrayField,
} from "@dyrected/core";

export const siteSettings = defineGlobal({
  slug: "site_settings",
  label: "Site Settings",
  fields: [
    // ─── Wedding Tab ─────────────────────────────────────────────
    ...defineTab({
      label: "Wedding",
      fields: [
        defineTextField({
          name: "partnerOneName",
          label: "Partner One Name",
          required: true,
        }),
        defineTextField({
          name: "partnerTwoName",
          label: "Partner Two Name",
          required: true,
        }),
        defineDateField({
          name: "weddingDate",
          label: "Wedding Date",
          required: true,
        }),
        defineTextField({
          name: "weddingDateText",
          label: "Wedding Date Display Text",
          defaultValue: "October 22 & 24, 2026",
          admin: { description: "How the date appears on the site, e.g. October 22 & 24, 2026" },
        }),
        defineTextField({
          name: "weddingLocation",
          label: "Location",
          defaultValue: "Lagos, Nigeria",
          admin: { description: "Short location shown in the hero, e.g. Lagos, Nigeria" },
        }),
        defineTextField({
          name: "hashtag",
          label: "Wedding Hashtag",
          defaultValue: "#TheSweetUnion",
        }),
      ],
    }),

    // ─── Home Page Tab ───────────────────────────────────────────
    ...defineTab({
      label: "Home Page",
      fields: [
        defineRelationshipField({
          name: "heroImage",
          label: "Hero Photo",
          relationTo: "media",
          admin: { description: "Main photo displayed in the hero section at the top of the page." },
        }),
        defineTextField({
          name: "heroSubtitle",
          label: "Hero Subtitle",
          admin: { placeholder: "e.g. Together with their families" },
        }),
        defineRelationshipField({
          name: "countdownPhotos",
          label: "Countdown Photos",
          relationTo: "media",
          hasMany: true,
          admin: { description: "Photos shown in the scrapbook collage beside the countdown. Upload 2 for best results." },
        }),
        defineRelationshipField({
          name: "wishlistTeaserImage",
          label: "Registry Section Photo",
          relationTo: "media",
          admin: { description: "Polaroid photo displayed next to the registry/wishlist card." },
        }),
        defineTextField({
          name: "wishlistTeaserTitle",
          label: "Registry Section Title",
          defaultValue: "Support Our Union",
          admin: { description: "Heading on the wishlist/registry card." },
        }),
        defineTextareaField({
          name: "wishlistTeaserDescription",
          label: "Registry Section Text",
          defaultValue:
            "Your presence and prayers are everything we could ask for. If you wish to bless our home, we have put together a registry of items we'll need as we set up our life together in Lagos.",
          admin: { description: "Body text on the wishlist/registry card." },
        }),
        defineRelationshipField({
          name: "rsvpTeaserImage",
          label: "FAQs Section Photo",
          relationTo: "media",
          admin: {
            description: "Polaroid photo shown next to the FAQs accordion.",
          },
        }),
        defineRelationshipField({
          name: "footerImage",
          label: "Footer Photo",
          relationTo: "media",
          admin: {
            description: "Small polaroid photo displayed in the site footer.",
          },
        }),
      ],
    }),

    // ─── Our Story Tab ───────────────────────────────────────────
    ...defineTab({
      label: "Our Story",
      fields: [
        defineSelectField({
          name: "storyFormat",
          label: "Story Format",
          options: [
            { label: "Timeline", value: "timeline" },
          ],
          defaultValue: "timeline",
        }),
        defineTextField({
          name: "storySubtitle",
          label: "Section Label",
          defaultValue: "Our Journey",
          admin: { description: "Small uppercase label above the title, e.g. Our Journey" },
        }),
        defineTextField({
          name: "storyTitle",
          label: "Section Title",
          defaultValue: "The Friendship that Grew",
        }),
        defineTextareaField({
          name: "storyDescription",
          label: "Section Introduction",
          defaultValue:
            "We took our time, built a friendship that couldn't be broken, and ended up exactly where we belonged. Here is our story over the years.",
        }),
        defineArrayField({
          name: "storyPhotos",
          label: "Story Items",
          fields: [
            defineTextField({ name: "label", label: "Timeframe / Date (e.g. September 2016)", required: true }),
            defineTextField({ name: "title", label: "Moment Title (e.g. Teen Church Exco)", required: true }),
            defineTextareaField({ name: "description", label: "Story Detail", required: true }),
            defineRelationshipField({ name: "photo", label: "Photo", relationTo: "media" }),
          ],
        }),
      ],
    }),

    // ─── FAQs Tab ────────────────────────────────────────────────
    ...defineTab({
      label: "FAQs",
      fields: [
        defineArrayField({
          name: "faqs",
          label: "Frequently Asked Questions",
          fields: [
            defineTextField({ name: "question", label: "Question", required: true }),
            defineTextareaField({ name: "answer", label: "Answer", required: true }),
          ],
        }),
      ],
    }),

    // ─── RSVP Tab ────────────────────────────────────────────────
    ...defineTab({
      label: "RSVP",
      fields: [
        defineDateField({
          name: "rsvpCutoffDate",
          label: "RSVP Cutoff Date",
          required: true,
          admin: { description: "Guests cannot submit or edit RSVPs after this date." },
        }),
        defineTextField({
          name: "rsvpCutoffTime",
          label: "RSVP Cutoff Time",
          defaultValue: "23:59",
          admin: { description: "24-hour format, e.g. 23:59" },
        }),
      ],
    }),

    // ─── Payments Tab ────────────────────────────────────────────
    ...defineTab({
      label: "Payments",
      fields: [
        defineTextField({
          name: "bankName",
          label: "Bank Name",
          admin: { description: "Shown to guests contributing to cash fund items." },
        }),
        defineTextField({
          name: "accountNumber",
          label: "Account Number",
        }),
        defineTextField({
          name: "accountName",
          label: "Account Name",
        }),
      ],
    }),
  ],
  access: {
    read: "true",
    update: "user != null",
  },
});
