import { DyrectedClient } from "@dyrected/sdk";

type Client = DyrectedClient;

export function isAttending(val: any): boolean {
  return val === true || val === "true" || val === 1 || val === "1";
}

export function hasSpouse(val: any): boolean {
  return val === true || val === "true" || val === 1 || val === "1";
}

export function extractGroupId(val: any): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed?.id) return String(parsed.id);
      } catch {
        // Not valid JSON
      }
    }
    return trimmed;
  }
  if (typeof val === "object" && val !== null && val.id) {
    return String(val.id);
  }
  return null;
}

/**
 * Accurately calculates and updates confirmed and declined counts for a single group.
 */
export async function syncGroupCounts(client: Client, groupId: string) {
  if (!groupId) return { confirmedCount: 0, declinedCount: 0, totalResponses: 0 };

  // Fetch responses with depth: 0 so group relation is a raw ID (or extractGroupId handles both)
  let records: any[] = [];
  try {
    const res = await client.collection("rsvp_records").find({
      where: { group: { equals: groupId } },
      limit: 1000,
      depth: 0,
    });
    records = (res.docs || []).filter((r: any) => extractGroupId(r.group) === groupId);

    // Fallback: if WHERE filter returned 0, load records and filter in JS
    if (records.length === 0) {
      const allRes = await client.collection("rsvp_records").find({ limit: 1000, depth: 0 });
      records = (allRes.docs || []).filter((r: any) => extractGroupId(r.group) === groupId);
    }
  } catch {
    const allRes = await client.collection("rsvp_records").find({ limit: 1000, depth: 0 });
    records = (allRes.docs || []).filter((r: any) => extractGroupId(r.group) === groupId);
  }

  const confirmedCount = records
    .filter((r: any) => isAttending(r.attending))
    .reduce((n: number, r: any) => n + (hasSpouse(r.hasSpouse) ? 2 : 1), 0);

  const declinedCount = records.filter((r: any) => !isAttending(r.attending)).length;

  await client.collection("rsvp_groups").update(groupId, {
    confirmedCount,
    declinedCount,
  });

  return { confirmedCount, declinedCount, totalResponses: records.length };
}

/**
 * Recalculates confirmed and declined counts for ALL groups in a single, efficient pass.
 */
export async function recalculateAllGroupCounts(client: Client) {
  // 1. Fetch all groups
  const groupsRes = await client.collection("rsvp_groups").find({ limit: 200, depth: 0 });
  const groups = groupsRes.docs || [];

  // 2. Fetch all guest responses
  const recordsRes = await client.collection("rsvp_records").find({ limit: 2000, depth: 0 });
  const records = recordsRes.docs || [];

  // 3. Map group stats
  const statsMap = new Map<
    string,
    {
      confirmedCount: number;
      declinedCount: number;
      confirmedLeads: number;
      spouseCount: number;
      totalResponses: number;
    }
  >();

  for (const group of groups) {
    statsMap.set(group.id, {
      confirmedCount: 0,
      declinedCount: 0,
      confirmedLeads: 0,
      spouseCount: 0,
      totalResponses: 0,
    });
  }

  for (const record of records) {
    const gid = extractGroupId(record.group);
    if (!gid || !statsMap.has(gid)) continue;

    const stats = statsMap.get(gid)!;
    stats.totalResponses += 1;

    if (isAttending(record.attending)) {
      stats.confirmedLeads += 1;
      if (hasSpouse(record.hasSpouse)) {
        stats.spouseCount += 1;
        stats.confirmedCount += 2;
      } else {
        stats.confirmedCount += 1;
      }
    } else {
      stats.declinedCount += 1;
    }
  }

  // 4. Update each group
  let updatedCount = 0;
  const results: Array<{
    id: string;
    name: string;
    confirmedCount: number;
    declinedCount: number;
    totalResponses: number;
    changed: boolean;
  }> = [];

  for (const group of groups) {
    const stats = statsMap.get(group.id)!;
    const prevConfirmed = Number(group.confirmedCount) || 0;
    const prevDeclined = Number(group.declinedCount) || 0;
    const changed = prevConfirmed !== stats.confirmedCount || prevDeclined !== stats.declinedCount;

    await client.collection("rsvp_groups").update(group.id, {
      confirmedCount: stats.confirmedCount,
      declinedCount: stats.declinedCount,
    });

    if (changed) {
      updatedCount++;
    }

    results.push({
      id: group.id,
      name: group.name,
      confirmedCount: stats.confirmedCount,
      declinedCount: stats.declinedCount,
      totalResponses: stats.totalResponses,
      changed,
    });
  }

  return {
    totalGroups: groups.length,
    updatedCount,
    totalRecords: records.length,
    results,
  };
}
