import type { CollectionBeforeChangeHook } from "@dyrected/core";
import type { Rsvp_groups } from "~/dyrected-types";

export const generateGroupSlug: CollectionBeforeChangeHook<Rsvp_groups> = async ({ data, operation }) => {
  if (operation === "create") {
    data.createdAt = new Date().toISOString();
    if (!data.slug && data.name) {
      data.slug = (data.name ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
  }
  return data;
};
