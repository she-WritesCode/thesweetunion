<template>
  <div class="space-y-3 text-slate-800">
    <!-- Header / stats -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
      <div class="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <div>
          <span class="text-2xl font-bold text-purple-900">{{ seatedSeats }}</span>
          <span class="text-slate-500"> / {{ totalSeats }} guests seated</span>
        </div>
        <div class="text-slate-600">
          <strong>{{ unseatedGuests.length }}</strong> parties still need a table
        </div>
        <div class="text-slate-500 text-xs">
          {{ tablesInUse }} of {{ tables.length }} tables in use · {{ freeSeats }} free seats
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="lastUndo"
          type="button"
          class="px-3 py-1.5 text-xs font-semibold rounded border border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"
          @click="undoLast"
        >
          ↶ Undo
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-semibold rounded border border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100"
          :disabled="!unseatedGuests.length"
          @click="autoOpen = !autoOpen; autoPlan = null"
        >
          ✨ Auto-seat
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50"
          :disabled="loading"
          @click="load"
        >
          {{ loading ? "Loading…" : "Refresh" }}
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-semibold rounded bg-purple-900 text-white hover:bg-purple-800"
          @click="printList"
        >
          Print seating list
        </button>
      </div>
    </div>

    <div v-if="error" class="p-3 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700">{{ error }}</div>

    <!-- Auto-seat panel -->
    <div v-if="autoOpen" class="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
      <div class="flex flex-wrap items-end gap-2">
        <label class="text-xs font-semibold text-purple-900">
          Which guests?
          <select v-model="autoGroup" class="block mt-1 px-2 py-1.5 text-sm border border-purple-300 rounded bg-white font-normal" @change="autoPlan = null">
            <option value="">All unseated groups</option>
            <option v-for="g in groupsWithUnseated" :key="g.name" :value="g.name">{{ g.name }} ({{ g.seats }} seats)</option>
          </select>
        </label>
        <button type="button" class="px-3 py-1.5 text-xs font-semibold rounded bg-purple-900 text-white hover:bg-purple-800" @click="planAutoSeat(autoGroup)">
          Preview
        </button>
        <button type="button" class="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900" @click="autoOpen = false">Close</button>
      </div>
      <p class="text-[11px] text-purple-900/80">
        Keeps each group together on neighbouring tables, never splits a couple, and fills tables that already have free seats. Nothing is saved until you apply it, and you can undo afterwards.
      </p>
      <div v-if="autoPlan" class="text-sm space-y-2">
        <p>
          Will seat <strong>{{ autoPlan.parties }}</strong> parties (<strong>{{ autoPlan.seats }}</strong> guests) across
          <strong>{{ autoPlan.tablesUsed }}</strong> tables.
          <span v-if="autoPlan.unplaced.length" class="text-red-700">
            {{ autoPlan.unplaced.length }} part{{ autoPlan.unplaced.length > 1 ? "ies" : "y" }} won't fit.
          </span>
        </p>
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50"
          :disabled="!autoPlan.assignments.length"
          @click="applyAutoSeat"
        >
          Apply seating
        </button>
      </div>
    </div>
    <div
      v-if="toast"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg"
      :class="toast.kind === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'"
    >
      {{ toast.text }}
    </div>

    <div class="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
      <!-- Guest list -->
      <aside class="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col max-h-[80vh]">
        <div class="p-3 space-y-2 border-b border-slate-200">
          <input
            v-model="search"
            type="search"
            placeholder="Search guests…"
            class="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          <div class="flex gap-2">
            <select v-model="groupFilter" class="flex-1 min-w-0 px-2 py-1.5 text-xs border border-slate-300 rounded bg-white">
              <option value="">All groups</option>
              <option v-for="g in groupNames" :key="g" :value="g">{{ g }}</option>
            </select>
            <div class="inline-flex rounded border border-slate-300 overflow-hidden text-xs">
              <button
                type="button"
                class="px-2.5 py-1.5"
                :class="view === 'unseated' ? 'bg-purple-900 text-white' : 'bg-white text-slate-600'"
                @click="view = 'unseated'"
              >
                Unseated
              </button>
              <button
                type="button"
                class="px-2.5 py-1.5 border-l border-slate-300"
                :class="view === 'all' ? 'bg-purple-900 text-white' : 'bg-white text-slate-600'"
                @click="view = 'all'"
              >
                All
              </button>
            </div>
          </div>
          <p class="text-[11px] text-slate-500 leading-snug">
            Drag a guest onto a table, or click a guest and then click a table. Couples are seated together.
          </p>
        </div>

        <div v-if="armedGuest" class="px-3 py-2 text-xs bg-amber-50 border-b border-amber-200 text-amber-900 flex items-center justify-between gap-2">
          <span>Now click a table to seat <strong>{{ armedGuest.leadName }}</strong></span>
          <button type="button" class="underline" @click="armedId = null">Cancel</button>
        </div>

        <ul class="overflow-y-auto divide-y divide-slate-100">
          <li v-if="!visibleGuests.length" class="p-4 text-sm text-center text-slate-500">
            {{ loading ? "Loading guests…" : view === "unseated" ? "Everyone is seated 🎉" : "No guests match." }}
          </li>
          <li
            v-for="g in visibleGuests"
            :key="g.id"
            draggable="true"
            class="px-3 py-2 cursor-grab active:cursor-grabbing select-none hover:bg-purple-50"
            :class="armedId === g.id ? 'bg-amber-50 ring-1 ring-inset ring-amber-400' : ''"
            @dragstart="onDragStart($event, g)"
            @dragend="dragId = null; hoverTable = null"
            @click="armedId = armedId === g.id ? null : g.id"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">
                  {{ g.leadName }}<span v-if="g.hasSpouse" class="text-slate-500"> + {{ g.spouseName || "Partner" }}</span>
                </p>
                <p class="text-[11px] text-slate-500 truncate">{{ g.groupName || "No group" }}</p>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                <span
                  class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  :class="g.seats === 2 ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'"
                >
                  {{ g.seats }} seat{{ g.seats > 1 ? "s" : "" }}
                </span>
                <button
                  v-if="g.tableNumber"
                  type="button"
                  class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  title="Show this table"
                  @click.stop="selectedTable = g.tableNumber"
                >
                  Table {{ g.tableNumber }}<template v-if="labelOf(g.tableNumber)"> · {{ labelOf(g.tableNumber) }}</template>
                </button>
              </div>
            </div>
          </li>
        </ul>
      </aside>

      <!-- Floor plan + table detail -->
      <section class="space-y-3 min-w-0">
        <div class="bg-white rounded-lg border border-slate-200 shadow-xs p-2 overflow-x-auto">
          <div class="flex flex-wrap items-center gap-3 px-1 pb-2 text-[11px] text-slate-600">
            <span class="inline-flex items-center gap-1"><i class="w-3 h-3 rounded-full border border-slate-400 bg-slate-100"></i>Empty</span>
            <span class="inline-flex items-center gap-1"><i class="w-3 h-3 rounded-full border border-purple-500 bg-purple-200"></i>Filling</span>
            <span class="inline-flex items-center gap-1"><i class="w-3 h-3 rounded-full bg-purple-800"></i>Full</span>
            <span class="inline-flex items-center gap-1"><i class="w-3 h-3 rounded-full border border-red-500 bg-red-200"></i>Over capacity</span>
          </div>

          <svg
            :viewBox="`0 0 ${SEATING_VIEWBOX.w} ${SEATING_VIEWBOX.h}`"
            class="w-full min-w-[640px] h-auto"
            role="img"
            aria-label="Reception floor plan"
          >
            <rect x="15" y="62" width="1935" height="1176" fill="#fff" stroke="#0f172a" stroke-width="8" />

            <!-- Landmarks -->
            <g v-for="l in SEATING_LANDMARKS" :key="l.label">
              <rect
                :x="l.x"
                :y="l.y"
                :width="l.w"
                :height="l.h"
                :fill="l.tone === 'accent' ? '#d8b4ee' : '#fff'"
                :stroke="l.tone === 'accent' ? 'none' : '#64748b'"
                stroke-width="2"
              />
              <text
                :x="l.x + l.w / 2"
                :y="l.y + l.h / 2"
                text-anchor="middle"
                dominant-baseline="middle"
                font-size="30"
                fill="#1e293b"
                :transform="l.rotate ? `rotate(-90 ${l.x + l.w / 2} ${l.y + l.h / 2})` : undefined"
              >
                {{ l.label }}
              </text>
            </g>

            <!-- Tables -->
            <g
              v-for="t in tables"
              :key="t.number"
              class="cursor-pointer"
              @click="onTableClick(t.number)"
              @dragover.prevent="hoverTable = t.number"
              @dragleave="hoverTable === t.number && (hoverTable = null)"
              @drop.prevent="onDrop(t.number)"
            >
              <title>Table {{ t.number }}{{ t.label ? ` · ${t.label}` : "" }} — {{ used(t) }}/{{ t.capacity }} seats</title>
              <!-- hit area -->
              <rect
                :x="t.x - (t.shape === 'round' ? 54 : (t.w || 0) / 2 + 6)"
                :y="t.y - (t.shape === 'round' ? 54 : 40)"
                :width="t.shape === 'round' ? 108 : (t.w || 0) + 12"
                :height="t.shape === 'round' ? 108 : 80"
                fill="transparent"
              />

              <template v-if="t.shape === 'round'">
                <circle
                  v-for="(c, i) in chairs(t)"
                  :key="i"
                  :cx="c.x"
                  :cy="c.y"
                  r="6"
                  :fill="i < used(t) ? '#3b0764' : '#fff'"
                  stroke="#334155"
                  stroke-width="2"
                />
                <circle
                  :cx="t.x"
                  :cy="t.y"
                  r="32"
                  :fill="fillFor(t).fill"
                  :stroke="selectedTable === t.number || hoverTable === t.number ? '#f59e0b' : fillFor(t).stroke"
                  :stroke-width="selectedTable === t.number || hoverTable === t.number ? 6 : 3"
                />
              </template>
              <template v-else>
                <circle
                  v-for="(c, i) in chairs(t)"
                  :key="i"
                  :cx="c.x"
                  :cy="c.y"
                  r="7"
                  :fill="i < used(t) ? '#3b0764' : '#fff'"
                  stroke="#334155"
                  stroke-width="2"
                />
                <rect
                  :x="t.x - (t.w || 0) / 2"
                  :y="t.y - 18"
                  :width="t.w"
                  height="36"
                  rx="4"
                  :fill="fillFor(t).fill"
                  :stroke="selectedTable === t.number || hoverTable === t.number ? '#f59e0b' : fillFor(t).stroke"
                  :stroke-width="selectedTable === t.number || hoverTable === t.number ? 7 : 3"
                />
              </template>

              <text
                :x="t.x"
                :y="t.y - 5"
                text-anchor="middle"
                dominant-baseline="middle"
                font-size="22"
                font-weight="700"
                :fill="fillFor(t).text"
                pointer-events="none"
              >
                {{ t.number }}
              </text>
              <text
                :x="t.x"
                :y="t.y + 12"
                text-anchor="middle"
                dominant-baseline="middle"
                font-size="13"
                :fill="fillFor(t).text"
                pointer-events="none"
              >
                {{ used(t) }}/{{ t.capacity }}
              </text>
            </g>
          </svg>
        </div>

        <!-- Selected table -->
        <div v-if="selected" class="bg-white rounded-lg border border-slate-200 shadow-xs p-3 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-semibold">
              Table {{ selected.number }}<span v-if="selected.label" class="font-normal text-slate-600"> · {{ selected.label }}</span>
              <span class="text-sm font-normal text-slate-500"> · {{ used(selected) }} of {{ selected.capacity }} seats taken</span>
            </h3>
            <div class="flex items-center gap-2">
              <button
                v-if="selectedGuests.length"
                type="button"
                class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
                @click="clearTable(selected.number)"
              >
                Empty table
              </button>
              <button type="button" class="text-xs px-2 py-1 text-slate-500 hover:text-slate-800" @click="selectedTable = null">
                Close
              </button>
            </div>
          </div>

          <!-- Name + seats -->
          <div class="flex flex-wrap items-end gap-2 p-2 rounded bg-slate-50 border border-slate-200">
            <label class="text-[11px] font-semibold text-slate-600 flex-1 min-w-[140px]">
              Table name
              <input
                v-model="editLabel"
                type="text"
                maxlength="40"
                placeholder="e.g. Family, VIP"
                class="block w-full mt-1 px-2 py-1.5 text-sm font-normal border border-slate-300 rounded bg-white"
              />
            </label>
            <label class="text-[11px] font-semibold text-slate-600 w-20">
              Seats
              <input
                v-model.number="editCapacity"
                type="number"
                min="0"
                max="24"
                class="block w-full mt-1 px-2 py-1.5 text-sm font-normal border border-slate-300 rounded bg-white"
              />
            </label>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded bg-purple-900 text-white hover:bg-purple-800 disabled:opacity-40"
              :disabled="!tableDirty || savingTable"
              @click="saveTable"
            >
              {{ savingTable ? "Saving…" : "Save" }}
            </button>
          </div>

          <!-- Seat a whole group here -->
          <div v-if="groupsWithUnseated.length" class="flex flex-wrap items-end gap-2">
            <label class="text-[11px] font-semibold text-slate-600 flex-1 min-w-[180px]">
              Seat a whole group here
              <select v-model="groupToSeat" class="block w-full mt-1 px-2 py-1.5 text-sm font-normal border border-slate-300 rounded bg-white">
                <option value="">Choose a group…</option>
                <option v-for="g in groupsWithUnseated" :key="g.name" :value="g.name">
                  {{ g.name }} · {{ g.parties }} unseated ({{ g.seats }} seats)
                </option>
              </select>
            </label>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded border border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100 disabled:opacity-40"
              :disabled="!groupToSeat || selectedFree <= 0"
              @click="seatGroupHere"
            >
              Seat them ({{ Math.max(0, selectedFree) }} free)
            </button>
          </div>

          <p v-if="!selectedGuests.length" class="text-sm text-slate-500">No one is seated here yet.</p>
          <ul v-else class="divide-y divide-slate-100">
            <li v-for="g in selectedGuests" :key="g.id" class="py-1.5 flex items-center justify-between gap-2 text-sm">
              <span class="truncate">
                {{ g.leadName }}<span v-if="g.hasSpouse" class="text-slate-500"> + {{ g.spouseName || "Partner" }}</span>
                <span class="text-[11px] text-slate-500"> · {{ g.groupName || "No group" }}</span>
              </span>
              <button type="button" class="text-xs text-red-600 hover:underline shrink-0" @click="assign([g], null)">Unseat</button>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { adminAuthHeaders } from "~/utils/admin-auth";
import { SEATING_TABLES as BASE_TABLES, SEATING_LANDMARKS, SEATING_VIEWBOX, type SeatingTable } from "~~/config/seating";

interface TableView extends SeatingTable {
  label: string;
}

interface Guest {
  id: string;
  leadName: string;
  spouseName: string;
  hasSpouse: boolean;
  seats: number;
  groupName: string;
  tableNumber: number | null;
  checkedIn: boolean;
}

const guests = ref<Guest[]>([]);
const tableMeta = ref<Record<number, { label: string; capacity: number }>>({});
const tables = computed<TableView[]>(() =>
  BASE_TABLES.map((t) => ({
    ...t,
    capacity: tableMeta.value[t.number]?.capacity ?? t.capacity,
    label: tableMeta.value[t.number]?.label ?? "",
  })),
);
const labelOf = (n: number | null) => (n ? tables.value.find((t) => t.number === n)?.label || "" : "");
const loading = ref(false);
const error = ref<string | null>(null);
const search = ref("");
const groupFilter = ref("");
const view = ref<"unseated" | "all">("unseated");
const armedId = ref<string | null>(null);
const dragId = ref<string | null>(null);
const hoverTable = ref<number | null>(null);
const selectedTable = ref<number | null>(null);
const toast = ref<{ text: string; kind: "ok" | "error" } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;

function notify(text: string, kind: "ok" | "error" = "ok") {
  toast.value = { text, kind };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = null), 3500);
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res: any = await $fetch(`/api/seating/state?_t=${Date.now()}`, { headers: adminAuthHeaders() });
    guests.value = res.guests || [];
    const meta: Record<number, { label: string; capacity: number }> = {};
    for (const t of res.tables || []) meta[t.number] = { label: t.label || "", capacity: t.capacity };
    tableMeta.value = meta;
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || "Could not load guests.";
  } finally {
    loading.value = false;
  }
}

// ── Derived data ──────────────────────────────────────────────────────────
const seatsByTable = computed(() => {
  const map = new Map<number, number>();
  for (const g of guests.value) {
    if (g.tableNumber) map.set(g.tableNumber, (map.get(g.tableNumber) || 0) + g.seats);
  }
  return map;
});
const used = (t: SeatingTable) => seatsByTable.value.get(t.number) || 0;

const totalSeats = computed(() => guests.value.reduce((s, g) => s + g.seats, 0));
const seatedSeats = computed(() => guests.value.filter((g) => g.tableNumber).reduce((s, g) => s + g.seats, 0));
const unseatedGuests = computed(() => guests.value.filter((g) => !g.tableNumber));
const tablesInUse = computed(() => tables.value.filter((t) => used(t) > 0).length);
const freeSeats = computed(() => tables.value.reduce((s, t) => s + Math.max(0, t.capacity - used(t)), 0));

const groupNames = computed(() =>
  Array.from(new Set(guests.value.map((g) => g.groupName).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
);

const visibleGuests = computed(() => {
  const q = search.value.trim().toLowerCase();
  return guests.value.filter((g) => {
    if (view.value === "unseated" && g.tableNumber) return false;
    if (groupFilter.value && g.groupName !== groupFilter.value) return false;
    if (!q) return true;
    return `${g.leadName} ${g.spouseName} ${g.groupName}`.toLowerCase().includes(q);
  });
});

const armedGuest = computed(() => guests.value.find((g) => g.id === armedId.value) || null);
const selected = computed(() => tables.value.find((t) => t.number === selectedTable.value) || null);
const selectedGuests = computed(() => guests.value.filter((g) => g.tableNumber === selectedTable.value));

// ── Table rendering ───────────────────────────────────────────────────────
function fillFor(t: SeatingTable) {
  const n = used(t);
  if (n > t.capacity) return { fill: "#fecaca", stroke: "#dc2626", text: "#7f1d1d" };
  if (n === t.capacity) return { fill: "#6b21a8", stroke: "#3b0764", text: "#ffffff" };
  if (n > 0) return { fill: "#e9d5ff", stroke: "#a855f7", text: "#3b0764" };
  return { fill: "#f1f5f9", stroke: "#94a3b8", text: "#334155" };
}

function chairs(t: SeatingTable) {
  if (t.shape === "round") {
    const n = Math.min(t.capacity, 24);
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      return { x: t.x + Math.cos(a) * 44, y: t.y + Math.sin(a) * 44 };
    });
  }
  const cap = Math.min(t.capacity, 24);
  const perSide = Math.max(1, Math.ceil(cap / 2));
  const w = t.w || 108;
  const xs = (i: number) => t.x - w / 2 + ((i + 0.5) * w) / perSide;
  const top = Array.from({ length: perSide }, (_, i) => ({ x: xs(i), y: t.y - 28 }));
  const bottom = Array.from({ length: Math.max(0, cap - perSide) }, (_, i) => ({ x: xs(i), y: t.y + 28 }));
  return [...top, ...bottom];
}

// ── Assigning ─────────────────────────────────────────────────────────────
function onDragStart(e: DragEvent, g: Guest) {
  dragId.value = g.id;
  e.dataTransfer?.setData("text/plain", g.id);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
}

function onDrop(tableNumber: number) {
  const g = guests.value.find((x) => x.id === dragId.value);
  hoverTable.value = null;
  dragId.value = null;
  if (g) assign([g], tableNumber);
}

function onTableClick(tableNumber: number) {
  if (armedGuest.value) {
    const g = armedGuest.value;
    armedId.value = null;
    assign([g], tableNumber);
  }
  selectedTable.value = tableNumber;
}

type Assignment = { guests: Guest[]; tableNumber: number | null };
const lastUndo = ref<{ guest: Guest; tableNumber: number | null }[] | null>(null);

async function submit(assignments: Assignment[], force = false): Promise<boolean> {
  try {
    await $fetch("/api/seating/assign", {
      method: "POST",
      headers: adminAuthHeaders(),
      body: {
        assignments: assignments.map((a) => ({ guestIds: a.guests.map((g) => g.id), tableNumber: a.tableNumber })),
        force,
      },
    });
    for (const a of assignments) for (const g of a.guests) g.tableNumber = a.tableNumber;
    return true;
  } catch (err: any) {
    if (err?.statusCode === 409 || err?.status === 409) {
      const msg = err?.data?.message || err?.message || "Table is full.";
      if (!force && confirm(`${msg}\n\nSeat anyway?`)) return submit(assignments, true);
      return false;
    }
    notify(err?.data?.message || err?.message || "Could not update seating.", "error");
    return false;
  }
}

/** Run assignments and remember how to undo them. */
async function run(assignments: Assignment[], message: string) {
  const prev = assignments.flatMap((a) => a.guests.map((guest) => ({ guest, tableNumber: guest.tableNumber })));
  if (!(await submit(assignments))) return false;
  lastUndo.value = prev;
  notify(message);
  return true;
}

function assign(list: Guest[], tableNumber: number | null) {
  const names = list.map((g) => g.leadName).join(", ");
  return run([{ guests: list, tableNumber }], tableNumber ? `${names} → Table ${tableNumber}` : `${names} unseated`);
}

async function undoLast() {
  if (!lastUndo.value) return;
  const byTable = new Map<number | null, Guest[]>();
  for (const { guest, tableNumber } of lastUndo.value) {
    byTable.set(tableNumber, [...(byTable.get(tableNumber) || []), guest]);
  }
  const ok = await submit([...byTable].map(([tableNumber, gs]) => ({ guests: gs, tableNumber })), true);
  if (ok) {
    lastUndo.value = null;
    notify("Undone");
  }
}

// ── Seat a whole group at the selected table ──────────────────────────────
const groupToSeat = ref("");
const groupsWithUnseated = computed(() => {
  const map = new Map<string, { name: string; parties: number; seats: number }>();
  for (const g of unseatedGuests.value) {
    const name = g.groupName || "No group";
    const e = map.get(name) || { name, parties: 0, seats: 0 };
    e.parties++;
    e.seats += g.seats;
    map.set(name, e);
  }
  return [...map.values()].sort((a, b) => b.seats - a.seats);
});

const selectedFree = computed(() => (selected.value ? selected.value.capacity - used(selected.value) : 0));

async function seatGroupHere() {
  const t = selected.value;
  if (!t || !groupToSeat.value) return;
  const parties = unseatedGuests.value
    .filter((g) => (g.groupName || "No group") === groupToSeat.value)
    .sort((a, b) => b.seats - a.seats);
  let free = selectedFree.value;
  const fit: Guest[] = [];
  for (const p of parties) {
    if (p.seats <= free) {
      fit.push(p);
      free -= p.seats;
    }
  }
  if (!fit.length) return notify(`No room at Table ${t.number} for ${groupToSeat.value}.`, "error");
  const left = parties.length - fit.length;
  await run(
    [{ guests: fit, tableNumber: t.number }],
    `${fit.length} ${groupToSeat.value} part${fit.length > 1 ? "ies" : "y"} → Table ${t.number}` +
      (left ? ` (${left} didn't fit)` : ""),
  );
}

// ── Table name / seat count editor ────────────────────────────────────────
const editLabel = ref("");
const editCapacity = ref<number>(0);
const savingTable = ref(false);
watch(
  selected,
  (t) => {
    editLabel.value = t?.label || "";
    editCapacity.value = t?.capacity ?? 0;
    groupToSeat.value = "";
  },
  { immediate: true },
);
const tableDirty = computed(
  () => !!selected.value && (editLabel.value !== selected.value.label || Number(editCapacity.value) !== selected.value.capacity),
);

async function saveTable() {
  const t = selected.value;
  if (!t) return;
  savingTable.value = true;
  try {
    const res: any = await $fetch("/api/seating/settings", {
      method: "POST",
      headers: adminAuthHeaders(),
      body: { number: t.number, label: editLabel.value, capacity: editCapacity.value },
    });
    tableMeta.value = {
      ...tableMeta.value,
      [t.number]: { label: res.table.label || "", capacity: res.table.capacity },
    };
    notify(`Table ${t.number} saved`);
  } catch (err: any) {
    notify(err?.data?.message || err?.message || "Could not save table.", "error");
  } finally {
    savingTable.value = false;
  }
}

// ── Auto-seat by group ────────────────────────────────────────────────────
const autoOpen = ref(false);
const autoGroup = ref("");
const autoPlan = ref<null | {
  assignments: Assignment[];
  parties: number;
  seats: number;
  tablesUsed: number;
  unplaced: Guest[];
}>(null);

function planAutoSeat(onlyGroup: string) {
  const free = new Map(tables.value.map((t) => [t.number, t.capacity - used(t)]));
  const pos = new Map(tables.value.map((t) => [t.number, t]));
  const dist = (a: number, b: number) => {
    const A = pos.get(a)!;
    const B = pos.get(b)!;
    return Math.hypot(A.x - B.x, A.y - B.y);
  };

  const byGroup = new Map<string, Guest[]>();
  for (const g of unseatedGuests.value) {
    const name = g.groupName || "No group";
    if (onlyGroup && name !== onlyGroup) continue;
    byGroup.set(name, [...(byGroup.get(name) || []), g]);
  }
  const groups = [...byGroup.entries()].sort(
    (a, b) => b[1].reduce((s, g) => s + g.seats, 0) - a[1].reduce((s, g) => s + g.seats, 0),
  );

  const placed = new Map<number, Guest[]>();
  const unplaced: Guest[] = [];

  for (const [name, parties] of groups) {
    // Tables this group already sits at (so stragglers join their own people)
    const own = guests.value.filter((g) => g.tableNumber && (g.groupName || "No group") === name).map((g) => g.tableNumber!);
    let anchor: number | null = own.length ? own[own.length - 1] : null;
    let remaining = parties.reduce((s, g) => s + g.seats, 0);

    for (const party of [...parties].sort((a, b) => b.seats - a.seats)) {
      const candidates = [...free].filter(([, f]) => f >= party.seats).map(([n]) => n);
      if (!candidates.length) {
        unplaced.push(party);
        continue;
      }
      let pick: number;
      if (anchor !== null) {
        pick = candidates.sort((a, b) => dist(a, anchor!) - dist(b, anchor!) || a - b)[0];
      } else {
        const roomy = candidates.filter((n) => free.get(n)! >= remaining);
        pick = roomy.length
          ? roomy.sort((a, b) => free.get(a)! - free.get(b)! || a - b)[0] // tightest table that holds everyone
          : candidates.sort((a, b) => free.get(b)! - free.get(a)! || a - b)[0]; // else the emptiest
      }
      free.set(pick, free.get(pick)! - party.seats);
      placed.set(pick, [...(placed.get(pick) || []), party]);
      remaining -= party.seats;
      anchor = pick;
    }
  }

  const assignments = [...placed].map(([tableNumber, gs]) => ({ guests: gs, tableNumber }));
  autoPlan.value = {
    assignments,
    parties: assignments.reduce((s, a) => s + a.guests.length, 0),
    seats: assignments.reduce((s, a) => s + a.guests.reduce((x, g) => x + g.seats, 0), 0),
    tablesUsed: assignments.length,
    unplaced,
  };
}

async function applyAutoSeat() {
  const plan = autoPlan.value;
  if (!plan || !plan.assignments.length) return;
  if (await run(plan.assignments, `Auto-seated ${plan.parties} parties across ${plan.tablesUsed} tables`)) {
    autoPlan.value = null;
    autoOpen.value = false;
  }
}

function clearTable(tableNumber: number) {
  const list = guests.value.filter((g) => g.tableNumber === tableNumber);
  if (list.length && confirm(`Remove all ${list.length} parties from Table ${tableNumber}?`)) assign(list, null);
}

// ── Print ─────────────────────────────────────────────────────────────────
function printList() {
  const rows = tables.value.map((t) => {
    const at = guests.value.filter((g) => g.tableNumber === t.number);
    if (!at.length) return "";
    const names = at
      .map((g) => `<li>${esc(g.leadName)}${g.hasSpouse ? ` + ${esc(g.spouseName || "Partner")}` : ""}</li>`)
      .join("");
    return `<section><h2>Table ${t.number}${t.label ? ` · ${esc(t.label)}` : ""} <small>${used(t)}/${t.capacity}</small></h2><ul>${names}</ul></section>`;
  }).join("");
  const unseated = unseatedGuests.value
    .map((g) => `<li>${esc(g.leadName)}${g.hasSpouse ? ` + ${esc(g.spouseName || "Partner")}` : ""}</li>`)
    .join("");
  const w = window.open("", "_blank");
  if (!w) return notify("Allow pop-ups to print.", "error");
  w.document.write(`<!doctype html><title>Seating list</title>
    <style>body{font:14px Georgia,serif;margin:24px;columns:3;column-gap:24px}
    section{break-inside:avoid;margin:0 0 16px}h2{font-size:15px;margin:0 0 4px;border-bottom:1px solid #999}
    small{font-weight:normal;color:#666}ul{margin:0;padding-left:16px}h1{column-span:all;font-size:20px}</style>
    <h1>The Sweet Union · Seating list</h1>${rows}
    ${unseated ? `<section><h2>Not yet seated</h2><ul>${unseated}</ul></section>` : ""}`);
  w.document.close();
  w.print();
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

onMounted(load);
</script>
