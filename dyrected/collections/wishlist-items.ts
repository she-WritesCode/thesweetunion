import type { CollectionConfig } from "@dyrected/core";

export const wishlistItems: CollectionConfig = {
  slug: "wishlist_items",
  labels: { singular: "Wishlist Item", plural: "Wishlist Items" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "price", "reservedCount", "maxQuantity", "category"],
    group: "Wishlist",
  },
  fields: [
    { name: "name", type: "text", label: "Item Name", required: true },
    { name: "description", type: "textarea", label: "Description" },
    { name: "image", type: "relationship", label: "Product Image", relationTo: "media" },
    { name: "link", type: "url", label: "Purchase Link", admin: { description: "External purchase link (optional)" } },
    { name: "price", type: "number", label: "Price", required: true },
    { name: "maxQuantity", type: "number", label: "Max Reservations", required: true, defaultValue: 1 },
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
    { name: "isCashFund", type: "boolean", label: "Cash Fund", defaultValue: false },
    { name: "isHidden", type: "boolean", label: "Hidden", defaultValue: false },
    { name: "createdAt", type: "date", label: "Created At", admin: { readOnly: true } },
  ],
  access: {
    read: ({ user }) => (user ? true : { isHidden: { not_equals: true } }),
    create: ({ user }) => !!user,
    update: ({ user }) => !!user,
    delete: ({ user }) => !!user,
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
