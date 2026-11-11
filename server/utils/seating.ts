import { SEATING_TABLES } from "~~/config/seating";

export interface TableMeta {
  number: number;
  label: string;
  capacity: number;
}

export const MAX_TABLE_CAPACITY = 24;

/** Raw override rows from the seating_settings global (defensively normalised). */
export async function loadTableOverrides(client: any): Promise<TableMeta[]> {
  try {
    const settings: any = await client.global("seating_settings").get({ depth: 0 });
    const rows = Array.isArray(settings?.tables) ? settings.tables : [];
    return rows
      .map((r: any) => ({
        number: Number(r?.number),
        label: typeof r?.label === "string" ? r.label : "",
        capacity: r?.capacity === null || r?.capacity === undefined || r?.capacity === "" ? NaN : Number(r.capacity),
      }))
      .filter((r: any) => Number.isFinite(r.number));
  } catch {
    return [];
  }
}

/** Default layout capacities merged with planner overrides. */
export async function loadTableMeta(client: any): Promise<TableMeta[]> {
  const overrides = new Map((await loadTableOverrides(client)).map((o) => [o.number, o]));
  return SEATING_TABLES.map((t) => {
    const o = overrides.get(t.number);
    return {
      number: t.number,
      label: o?.label || "",
      capacity: o && Number.isFinite(o.capacity) ? o.capacity : t.capacity,
    };
  });
}
