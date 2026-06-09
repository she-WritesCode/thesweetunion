import type { CollectionConfig } from "@dyrected/core";

export const wishlistItems: CollectionConfig = {
  slug: "wishlist_items",
  labels: { singular: "Wishlist Item", plural: "Wishlist Items" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "category", "price", "fundingType", "reservedCount", "amountRaised", "contributorCount", "maxQuantity", "isHidden"],
    group: "Wishlist",
  },
  fields: [
    { name: "name", type: "text", label: "Item Name", required: true },
    { name: "description", type: "textarea", label: "Description" },
    { name: "image", type: "relationship", label: "Product Image", relationTo: "media" },
    { name: "link", type: "url", label: "Purchase Link", admin: { description: "External purchase link (optional)" } },
    { name: "price", type: "number", label: "Price / Funding Goal", required: true, admin: { description: "For crowdfund items: set to the goal amount, or 0 for unlimited" } },
    {
      name: "fundingType",
      type: "select",
      label: "Funding Type",
      defaultValue: "fixed",
      options: [
        { label: "Fixed (one person reserves the full item)", value: "fixed" },
        { label: "Crowdfund (guests contribute partial amounts)", value: "crowdfund" },
      ],
    },
    { name: "amountRaised", type: "number", label: "Amount Raised", defaultValue: 0, admin: { readOnly: true } },
    { name: "contributorCount", type: "number", label: "Contributors", defaultValue: 0, admin: { readOnly: true } },
    { name: "maxQuantity", type: "number", label: "Max Reservations", required: true, defaultValue: 1, admin: { description: "For crowdfund: leave at 1 (not used). For fixed: how many people can reserve." } },
    { name: "reservedCount", type: "number", label: "Reserved Count", defaultValue: 0, admin: { readOnly: true } },
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
    },
    { name: "isHidden", type: "boolean", label: "Hidden", defaultValue: false },
    { name: "createdAt", type: "date", label: "Created At", admin: { readOnly: true } },
  ],
  access: {
    read: "true",
    create: "user != null",
    update: "true",
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
