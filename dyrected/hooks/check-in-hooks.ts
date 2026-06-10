import type { CollectionBeforeChangeHook } from "@dyrected/core";

export const stampCheckInTime: CollectionBeforeChangeHook = ({ data, operation }) => {
  if (operation === "create" && !data.createdAt) {
    data.createdAt = new Date().toISOString();
  }
  return data;
};
