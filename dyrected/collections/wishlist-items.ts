import {
  defineCollection,
  defineTab,
  defineRelationshipField,
  defineTextField,
  defineTextareaField,
  defineSelectField,
  defineNumberField,
  defineUrlField,
  defineBooleanField,
  defineJoinField,
  // ── Detail View Primitives ──
  displayGrid,
  displayField,
  displayDivider,
  displaySection,
} from "@dyrected/core";

export const wishlistItems = defineCollection({
  slug: "wishlist_items",
  labels: { singular: "Wishlist Item", plural: "Wishlist Items" },
  admin: {
    icon: "ClipboardList",
    useAsTitle: "name",
    components: {
      beforeListTable: ["WishlistListSummary"],
    },
    defaultColumns: [
      "name",
      "category",
      "price",
      "fundingType",
      "reservedCount",
      "amountRaised",
      "contributorCount",
      "maxQuantity",
      "isHidden",
    ],
    group: "Wishlist",
  },
  fields: [
    ...defineTab({
      label: "General",
      fields: [
        defineRelationshipField({
          name: "image",
          label: "Product Image",
          relationTo: "media",
        }),
        defineTextField({ name: "name", label: "Item Name", required: true }),
        defineTextareaField({ name: "description", label: "Description" }),
        defineSelectField({
          name: "category",
          label: "Category",
          options: [
            { label: "Kitchen", value: "kitchen" },
            { label: "Travel", value: "travel" },
            { label: "Home", value: "home" },
            { label: "Cash Fund", value: "cash-fund" },
            { label: "Other", value: "other" },
          ],
        }),
        defineNumberField({
          name: "price",
          label: "Price / Funding Goal",
          required: true,
          admin: {
            description: "For crowdfund items: set to the goal amount, or 0 for unlimited",
            width: "75%",
            format: {
              type: "currency",
              currency: "NGN",
            },
          },
        }),
        defineSelectField({
          name: "fundingType",
          label: "Funding Type",
          defaultValue: "fixed",
          options: [
            { label: "Fixed (one person reserves the full item)", value: "fixed" },
            { label: "Crowdfund (guests contribute partial amounts)", value: "crowdfund" },
          ],
          admin: { width: "50%" },
        }),
        defineNumberField({
          name: "maxQuantity",
          label: "Max Reservations",
          required: true,
          defaultValue: 1,
          admin: {
            description: "For crowdfund: leave at 1 (not used). For fixed: how many people can reserve.",
            width: "50%",
          },
        }),
        defineUrlField({
          name: "link",
          label: "Purchase Link",
          admin: { description: "External purchase link (optional)" },
        }),
        defineBooleanField({
          name: "isFeatured",
          label: "Special Highlight",
          defaultValue: false,
          admin: { description: "Show in the top showcase section on the registry page." },
        }),
        defineBooleanField({ name: "isHidden", label: "Hidden", defaultValue: false }),
      ],
    }),

    ...defineTab({
      label: "Reservations",
      fields: [
        defineNumberField({
          name: "amountRaised",
          label: "Amount Raised",
          defaultValue: 0,
          admin: {
            component: "wishlist_items.amountRaised",
            readOnly: true,
            width: "50%",
            format: {
              type: "currency",
              currency: "NGN",
            },
          },
        }),
        defineNumberField({
          name: "contributorCount",
          label: "Contributors",
          defaultValue: 0,
          admin: { component: "wishlist_items.contributorCount", readOnly: true, width: "50%" },
        }),
        defineNumberField({
          name: "reservedCount",
          label: "Reserved Count",
          defaultValue: 0,
          admin: { component: "wishlist_items.reservedCount", readOnly: true, width: "50%" },
        }),
        defineJoinField({
          name: "reservations",
          label: "Reservations & Contributions",
          collection: "reservations",
          on: "item",
        }),
      ],
    }),
  ],
  // ── 📱 High-Density Compact Detail View ──────────────────────────────────────
  detail: [
    // ── 1. Top Status & Funding Model Strip (Compact 4-column grid) ──────────
    displayGrid(4, [
      displayField("fundingType", {
        display: "badge",
        badgeColors: { fixed: "indigo", crowdfund: "purple" },
        label: "Funding Model",
        editable: true,
      }),
      displayField("category", {
        display: "badge",
        badgeColors: {
          kitchen: "amber",
          travel: "sky",
          home: "teal",
          "cash-fund": "emerald",
          other: "slate",
        },
        label: "Category",
        editable: true,
      }),
      displayField("isFeatured", {
        display: "badge",
        badgeColors: { true: "amber", false: "slate" },
        label: "Showcase",
        editable: true,
      }),
      displayField("isHidden", {
        display: "badge",
        badgeColors: { false: "emerald", true: "rose" },
        label: "Visibility",
        editable: true,
      }),
    ]),

    displayDivider({ spacing: "sm" }),

    // ── 2. Financial & Reservation Metrics Hub (4-column grid) ───────────────
    displayGrid(4, [
      displayField("price", {
        display: "currency",
        currency: "NGN",
        label: "Price / Goal",
        editable: true,
      }),
      displayField("amountRaised", {
        display: "currency",
        currency: "NGN",
        label: "Total Raised",
      }),
      displayField("reservedCount", {
        label: "Reserved Units",
      }),
      displayField("contributorCount", {
        label: "Contributors",
      }),
    ]),

    displayDivider({ spacing: "md" }),

    // ── 3. Product Media, Details & Links ────────────────────────────────────
    displayGrid(3, [
      displayField("image", {
        label: "Product Image",
        display: "image",
        aspectRatio: "1/1",
        objectFit: "cover",
      }),
      displayField("description", {
        label: "Description & Gift Notes",
        emptyText: "No description provided.",
        editable: true,
        span: 2,
      }),
    ]),

    displayGrid(2, [
      displayField("link", {
        display: "link",
        label: "Purchase / Registry Link",
        emptyText: "Direct Gift / No External Link",
        editable: true,
      }),
      displayField("maxQuantity", {
        label: "Max Allowed Reservations",
        editable: true,
      }),
    ]),

    displayDivider({ spacing: "md" }),

    // ── 4. Guest Reservations & Contributions Subsystem (Card Section) ───────
    displaySection(
      "Guest Reservations & Contributions",
      [
        displayField("reservations", {
          label: "Reservation Records",
        }),
      ],
      { span: 12, icon: "Gift" },
    ),
  ],
  access: {
    read: "true",
    create: "user != null",
    update: ({ user, req }: any) => {
      if (user != null) return true;
      const apiKeyHeader = req?.headers?.get?.("x-api-key") || req?.headers?.["x-api-key"];
      const authHeader = req?.headers?.get?.("authorization") || req?.headers?.authorization;
      if (apiKeyHeader || (authHeader && authHeader.includes("Bearer "))) return true;
      return false;
    },
    delete: "user != null",
  },
  hooks: {
    beforeChange: [
      async ({ data }) => {
        return data;
      },
    ],
  },
});
