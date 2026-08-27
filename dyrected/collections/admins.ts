import { defineCollection, defineTextField } from "@dyrected/core";

export const admins = defineCollection({
  slug: "admins",
  auth: true,
  labels: { singular: "Admin", plural: "Admins" },
  admin: { useAsTitle: "name" },
  detail: false,
  fields: [defineTextField({ name: "name", label: "Name" })],
});
