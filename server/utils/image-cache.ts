import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import type { H3Event } from "h3";
import { getHeader, setHeader, setResponseStatus } from "h3";

interface CacheEntry {
  buffer: Buffer;
  etag: string;
  timestamp: number;
}

// In-memory cache for ultra-fast instant hits (<1ms)
const memoryCache = new Map<string, CacheEntry>();
const MAX_MEMORY_ITEMS = 250;

// Disk cache folder in /tmp (persists across warm requests on serverless)
const TMP_CACHE_DIR = path.join(os.tmpdir() || "/tmp", "tsu-image-cache");
try {
  if (!fs.existsSync(TMP_CACHE_DIR)) {
    fs.mkdirSync(TMP_CACHE_DIR, { recursive: true });
  }
} catch {
  // ignore
}

export function computeCacheKey(prefix: string, id: string, params: Record<string, any> = {}): string {
  const cleanId = (id || "default").trim().toLowerCase();
  const sortedParams = Object.keys(params)
    .filter((k) => k !== "download" && params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort()
    .map((k) => `${k}=${String(params[k]).trim()}`)
    .join("&");

  const rawKey = `${prefix}:${cleanId}:${sortedParams}`;
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export function getCachedImage(event: H3Event, cacheKey: string): { buffer: Buffer; etag: string; is304: boolean } | null {
  let entry: CacheEntry | null = null;

  // 1. Check in-memory cache
  if (memoryCache.has(cacheKey)) {
    entry = memoryCache.get(cacheKey)!;
  } else {
    // 2. Check /tmp disk cache
    const filePath = path.join(TMP_CACHE_DIR, `${cacheKey}.png`);
    try {
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        if (buffer && buffer.length > 0) {
          const etag = crypto.createHash("md5").update(buffer).digest("hex");
          entry = { buffer, etag, timestamp: Date.now() };
          // Store in memory for next time
          if (memoryCache.size >= MAX_MEMORY_ITEMS) {
            const firstKey = memoryCache.keys().next().value;
            if (firstKey) memoryCache.delete(firstKey);
          }
          memoryCache.set(cacheKey, entry);
        }
      }
    } catch {
      // ignore disk read errors
    }
  }

  if (!entry) return null;

  // 3. Check browser/CDN ETag for 304 Not Modified
  const clientEtag = getHeader(event, "if-none-match");
  if (clientEtag) {
    const cleanClient = clientEtag.replace(/^W\//, "").replace(/"/g, "");
    if (cleanClient === entry.etag) {
      setResponseStatus(event, 304);
      return { buffer: entry.buffer, etag: entry.etag, is304: true };
    }
  }

  return { buffer: entry.buffer, etag: entry.etag, is304: false };
}

export function saveCachedImage(cacheKey: string, buffer: Buffer): string {
  const etag = crypto.createHash("md5").update(buffer).digest("hex");

  // Save to memory
  if (memoryCache.size >= MAX_MEMORY_ITEMS) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(cacheKey, { buffer, etag, timestamp: Date.now() });

  // Save to disk asynchronously
  const filePath = path.join(TMP_CACHE_DIR, `${cacheKey}.png`);
  try {
    fs.writeFile(filePath, buffer, () => {});
  } catch {
    // ignore disk write errors
  }

  return etag;
}

// In-memory cache for site settings (avoids DB hits for static couple/hashtag/date info)
let cachedSettings: { data: any; expiry: number } | null = null;

export async function getCachedSiteSettings(client: any): Promise<any> {
  if (cachedSettings && Date.now() < cachedSettings.expiry) {
    return cachedSettings.data;
  }
  try {
    const settings = await client.global("site_settings").get();
    cachedSettings = { data: settings, expiry: Date.now() + 10 * 60 * 1000 }; // 10 minutes TTL
    return settings;
  } catch {
    return null;
  }
}
