import { defineCollection, defineSelectField, defineTextField } from "@dyrected/core";
import { generalFields } from "./utils.ts";

/**
 * Roles
 * - admin: the couple / trusted delegates. Full access.
 * - usher: door staff. Can only use the Check-ins scanner (see dyrected.config.ts
 *   navigation + server/utils/require-admin.ts).
 *
 * Accounts with NO role (e.g. the original shared login) are treated as admin,
 * so everything written as `user.role != 'usher'` keeps working for them.
 */
export const ADMIN_ROLES = [
  { label: "Admin (full access)", value: "admin" },
  { label: "Usher (check-in only)", value: "usher" },
];

export const admins = defineCollection({
  slug: "admins",
  auth: true,
  labels: { singular: "Admin", plural: "Admins" },
  admin: { useAsTitle: "name" },
  detail: false,
  fields: [
    defineTextField({ name: "name", label: "Name" }),
    defineSelectField({
      name: "role",
      label: "Role",
      options: ADMIN_ROLES,
      defaultValue: "usher",
      admin: { description: "Ushers can only see the check-in scanner. Leave empty/Admin for full access." },
      // Only non-ushers may change roles (accounts with no role count as admin).
      access: { update: "user.role != 'usher'" },
    }),
    ...generalFields,
  ],
});
