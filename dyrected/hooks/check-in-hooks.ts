import type { CollectionBeforeChangeHook } from "@dyrected/core";
import type { Check_ins } from "~/dyrected-types";

export const stampCheckInTime: CollectionBeforeChangeHook<Check_ins> = ({ data, operation }) => {
  if (operation === "create" && !data.createdAt) {
    data.createdAt = new Date().toISOString();
  }
  return data;
};
