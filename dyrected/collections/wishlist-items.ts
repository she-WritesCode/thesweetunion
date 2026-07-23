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
} from "@dyrected/core";

export const wishlistItems = defineCollection({
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
  access: {
    read: "true",
    create: "user != null",
    update: "user != null",
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
