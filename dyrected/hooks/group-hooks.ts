import type { CollectionBeforeChangeHook } from "@dyrected/core";

export const generateGroupSlug: CollectionBeforeChangeHook = async ({ data, operation }) => {
  if (operation === "create") {
    data.createdAt = new Date().toISOString();
    if (!data.slug && data.name) {
      data.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
  }
  return data;
};
