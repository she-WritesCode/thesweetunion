import type { CollectionConfig } from "@dyrected/core";

export const admins: CollectionConfig = {
  slug: "admins",
  auth: true,
  fields: [
    { name: "name", type: "text", label: "Name" },
    { name: "role", type: "select", label: "Role", options: ["admin"], defaultValue: "admin" },
  ],
};
