import type { CollectionBeforeChangeHook, CollectionAfterDeleteHook } from "@dyrected/core";
import type { Reservations } from "~/dyrected-types";

export const reserveItem: CollectionBeforeChangeHook<Reservations> = async ({ data, operation }: any) => {
  if (operation === "create") {
    data.reservedAt = new Date().toISOString();
  }
  return data;
};

// NOTE: AfterDelete hook for releasing reservations is handled by the
// /api/reservations/release endpoint instead, because Dyrected hooks
// don't have access to the DB client directly.
export const releaseReservation: CollectionAfterDeleteHook = async ({ doc }: any) => {
  // The actual DB update is handled by the custom API route.
  // This hook is kept as a placeholder for the collection config.
};
