import { useAsyncData } from "#app";
import { useDyrectedClient } from "#imports";
import type { RegisteredSchema } from "@dyrected/sdk";

type CollectionSlug = keyof RegisteredSchema["collections"] & string;
type GlobalSlug = keyof RegisteredSchema["globals"] & string;

/**
 * Non-blocking, cached collection fetch for Dyrected CMS.
 * Navigates routes instantly (lazy: true) and re-uses client-side payload cache
 * (getCachedData) so switching between pages has zero lag.
 */
export function useCachedDyrectedCollection<K extends CollectionSlug>(collection: K, options?: any) {
  const client = useDyrectedClient();
  const key = `dyrected:coll:${collection}:${JSON.stringify(options || {})}`;

  return useAsyncData(
    key,
    () =>
      client
        .collection(collection)
        .find(options as any)
        .exec() as Promise<any>,
    {
      lazy: true,
      getCachedData: (key, nuxtApp) => {
        return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
      },
    },
  );
}

/**
 * Non-blocking, cached global fetch for Dyrected CMS.
 */
export function useCachedDyrectedGlobal<K extends GlobalSlug>(slug: K, options?: any) {
  const client = useDyrectedClient();
  const key = `dyrected:global:${slug}:${JSON.stringify(options || {})}`;
  const { watch, ...clientOptions } = (options || {}) as any;

  return useAsyncData(key, () => client.global(slug).get(clientOptions) as Promise<any>, {
    lazy: true,
    watch,
    getCachedData: (key, nuxtApp) => {
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  });
}
