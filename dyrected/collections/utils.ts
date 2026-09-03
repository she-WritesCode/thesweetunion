import { defineDateTimeField, defineRelationshipField } from "@dyrected/core";

export const generalFields = [
  defineDateTimeField({
    name: "createdAt",
    label: "Created At",
    admin: { readOnly: true },
  }),
  defineDateTimeField({
    name: "updatedAt",
    label: "Updated At",
    admin: { readOnly: true },
  }),
  defineRelationshipField({
    name: "createdBy",
    label: "Created By",
    relationTo: "admins",
    admin: { readOnly: true, hidden: true },
  }),
  defineRelationshipField({
    name: "updatedBy",
    label: "Updated By",
    relationTo: "admins",
    admin: { readOnly: true, hidden: true },
  }),
];
