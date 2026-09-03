import { defineCollection, defineTextField } from "@dyrected/core";
import { generalFields } from "./utils";

export const admins = defineCollection({
  slug: "admins",
  auth: true,
  labels: { singular: "Admin", plural: "Admins" },
  admin: { useAsTitle: "name" },
  detail: false,
  fields: [defineTextField({ name: "name", label: "Name" }), ...generalFields],
});
