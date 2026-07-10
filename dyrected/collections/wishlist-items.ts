import { defineNumberField, type CollectionConfig } from "@dyrected/core";

export const wishlistItems: CollectionConfig = {
  slug: "wishlist_items",
  labels: { singular: "Wishlist Item", plural: "Wishlist Items" },
  admin: {
    icon: "ClipboardList",
    useAsTitle: "name",
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
    { name: "image", type: "relationship", label: "Product Image", relationTo: "media", admin: { tab: "General" } },
    { name: "name", type: "text", label: "Item Name", required: true, admin: { tab: "General" } },
    { name: "description", type: "textarea", label: "Description", admin: { tab: "General" } },
    {
      name: "category",
      type: "select",
      label: "Category",
      options: [
        { label: "Kitchen", value: "kitchen" },
        { label: "Travel", value: "travel" },
        { label: "Home", value: "home" },
        { label: "Cash Fund", value: "cash-fund" },
        { label: "Other", value: "other" },
      ],
      admin: { tab: "General" },
    },
    defineNumberField({
      name: "price",
      type: "number",
      label: "Price / Funding Goal",
      required: true,
      admin: {
        tab: "General",
        description: "For crowdfund items: set to the goal amount, or 0 for unlimited",
        width: "75%",
        format: {
          type: "currency",
          currency: "NGN",
        },
      },
    }),
    {
      name: "fundingType",
      type: "select",
      label: "Funding Type",
      defaultValue: "fixed",
      options: [
        { label: "Fixed (one person reserves the full item)", value: "fixed" },
        { label: "Crowdfund (guests contribute partial amounts)", value: "crowdfund" },
      ],
      admin: { tab: "General", width: "50%" },
    },
    {
      name: "maxQuantity",
      type: "number",
      label: "Max Reservations",
      required: true,
      defaultValue: 1,
      admin: {
        tab: "General",
        description: "For crowdfund: leave at 1 (not used). For fixed: how many people can reserve.",
        width: "50%",
      },
    },
    {
      name: "link",
      type: "url",
      label: "Purchase Link",
      admin: { tab: "General", description: "External purchase link (optional)" },
    },
    { name: "isHidden", type: "boolean", label: "Hidden", defaultValue: false, admin: { tab: "General" } },

    defineNumberField({
      name: "amountRaised",
      type: "number",
      label: "Amount Raised",
      defaultValue: 0,
      admin: {
        tab: "Reservations",
        component: "wishlist_items.amountRaised",
        readOnly: true,
        width: "50%",
        format: {
          type: "currency",
          currency: "NGN",
        },
      },
    }),
    {
      name: "contributorCount",
      type: "number",
      label: "Contributors",
      defaultValue: 0,
      admin: { tab: "Reservations", component: "wishlist_items.contributorCount", readOnly: true, width: "50%" },
    },
    {
      name: "reservedCount",
      type: "number",
      label: "Reserved Count",
      defaultValue: 0,
      admin: { tab: "Reservations", component: "wishlist_items.reservedCount", readOnly: true, width: "50%" },
    },
    {
      name: "reservations",
      type: "join",
      label: "Reservations & Contributions",
      collection: "reservations",
      on: "item",
      admin: { tab: "Reservations" },
    },
  ],
  access: {
    read: "true",
    create: "user != null",
    update: "user != null",
    delete: "user != null",
  },
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === "create") {
          data.createdAt = new Date().toISOString();
        }
        return data;
      },
    ],
  },
};
