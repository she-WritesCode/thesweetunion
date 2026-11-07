<template>
  <div class="space-y-4 text-slate-800">
    <!-- Top Bar: Sender Segmented Controls + Actions -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <!-- Senders Tabs -->
      <div class="flex flex-wrap items-center gap-1">
        <button
          type="button"
          @click="activeSenderTab = 'all'"
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
          :class="activeSenderTab === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
        >
          All Senders
          <span class="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full" :class="activeSenderTab === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'">
            {{ totalGuests }}
          </span>
        </button>

        <button
          v-for="s in config.senders"
          :key="s.id"
          type="button"
          @click="activeSenderTab = s.id"
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
          :class="activeSenderTab === s.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
        >
          <span>{{ s.name }}</span>
          <span
            class="px-1.5 py-0.2 rounded-full text-[10px]"
            :class="activeSenderTab === s.id ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'"
          >
            {{ senderPendingCount(s.id) }}
          </span>
        </button>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="showSettings = !showSettings"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white hover:bg-slate-50 text-slate-700 transition"
        >
          <svg class="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{{ showSettings ? "Hide Settings" : "Configure Routing" }}</span>
        </button>

        <button
          type="button"
          @click="fetchData"
          :disabled="loading"
          class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white hover:bg-slate-50 text-slate-700 transition disabled:opacity-50"
          title="Refresh Data"
        >
          <svg class="w-3.5 h-3.5 text-slate-500" :class="{ 'animate-spin': loading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Collapsible Settings Panel -->
    <div v-if="showSettings" class="p-4 border border-slate-200 bg-slate-50 rounded-lg space-y-4">
      <div class="flex items-center justify-between border-b border-slate-200 pb-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-700">Campaign Routing & Dispatch Settings</h3>
        <span class="text-xs text-slate-500">Divides send volume across 4 phones to prevent WhatsApp rate limits</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Phone Senders -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-slate-700 block">Dispatch Phones</label>
          <div class="space-y-2">
            <div
              v-for="s in config.senders"
              :key="s.id"
              class="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded text-xs"
            >
              <span class="w-20 font-medium text-slate-800">{{ s.name }}</span>
              <input
                type="text"
                v-model="s.phone"
                placeholder="23480..."
                class="flex-1 px-2 py-1 border border-slate-200 rounded text-xs text-slate-800 font-mono focus:border-slate-400 focus:outline-none"
              />
              <span class="text-[10px] text-slate-400 font-mono">{{ s.wahaSession }}</span>
            </div>
          </div>
        </div>

        <!-- RSVP Group Mappings -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-slate-700 block">Group Routing to Senders</label>
          <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
            <div
              v-for="grp in rsvpGroups"
              :key="grp.id"
              class="flex items-center justify-between p-2 bg-white border border-slate-200 rounded text-xs"
            >
              <div class="flex flex-col">
                <span class="font-medium text-slate-800">{{ grp.name }}</span>
                <span class="text-[10px] text-slate-400">{{ grp.guestCount || 0 }} confirmed guests</span>
              </div>
              <select
                v-model="config.groupSenderMap[grp.id]"
                class="px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 focus:border-slate-400 focus:outline-none"
              >
                <option v-for="s in config.senders" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Test Send Bar -->
      <div class="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-slate-700">Test Send:</span>
          <input
            type="text"
            v-model="testPhone"
            placeholder="2348012345678"
            class="px-2.5 py-1 text-xs border border-slate-200 rounded font-mono bg-white text-slate-800 w-44 focus:border-slate-400 focus:outline-none"
          />
          <button
            type="button"
            @click="sendTestPass"
            :disabled="testing || !testPhone"
            class="px-3 py-1 text-xs font-medium bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <svg v-if="testing" class="w-3 h-3 animate-spin text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" class="opacity-25"/>
              <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75"/>
            </svg>
            <span>Send Test Pass</span>
          </button>
        </div>

        <button
          type="button"
          @click="saveSettings"
          :disabled="savingSettings"
          class="px-4 py-1 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-1"
        >
          <svg v-if="savingSettings" class="w-3 h-3 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" class="opacity-25"/>
            <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75"/>
          </svg>
          <span>Save Routing Configuration</span>
        </button>
      </div>
    </div>

    <!-- Execution Bar / Progress Stats -->
    <div class="p-3 border border-slate-200 rounded-lg bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div class="space-y-1 flex-1">
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-slate-900">
              {{ sentCount }} / {{ totalGuests }} passes dispatched
            </span>
            <span class="text-slate-400">·</span>
            <span class="text-slate-600">{{ progressPercent }}% completed</span>
          </div>
          <span class="text-[11px] text-slate-500 font-mono">
            Active view: {{ activeSenderLabel }} ({{ filteredGuests.length }} guests)
          </span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            class="bg-slate-900 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
      </div>

      <!-- Auto-dispatch Controls -->
      <div class="flex items-center gap-2">
        <template v-if="!isDispatching">
          <button
            type="button"
            @click="startAutoDispatch"
            :disabled="pendingGuestsInView.length === 0"
            class="px-3.5 py-1.5 text-xs font-medium rounded-md bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5 transition"
          >
            <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Start Auto-Send ({{ pendingGuestsInView.length }})</span>
          </button>
        </template>
        <template v-else>
          <button
            type="button"
            @click="pauseAutoDispatch"
            class="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 hover:bg-amber-700 text-white inline-flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            <span>{{ isPaused ? "Resume" : "Pause" }}</span>
          </button>
          <button
            type="button"
            @click="stopAutoDispatch"
            class="px-3 py-1.5 text-xs font-medium rounded-md bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="4" width="16" height="16" />
            </svg>
            <span>Stop</span>
          </button>
        </template>
      </div>
    </div>

    <!-- Table Search & Filter Bar -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-2">
      <div class="relative w-full sm:w-72">
        <svg class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Filter by name, pass code, or phone..."
          class="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
        />
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
        <select
          v-model="statusFilter"
          class="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:border-slate-400"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending Only ({{ pendingTotalCount }})</option>
          <option value="sent">Sent Only ({{ sentCount }})</option>
        </select>
        <span class="text-xs text-slate-500">{{ displayedGuests.length }} of {{ filteredGuests.length }}</span>
      </div>
    </div>

    <!-- Guests Table -->
    <div class="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th class="px-3.5 py-2.5">Guest</th>
              <th class="px-3.5 py-2.5">Pass Code</th>
              <th class="px-3.5 py-2.5">Phone Number</th>
              <th class="px-3.5 py-2.5">Group</th>
              <th class="px-3.5 py-2.5">Assigned Sender</th>
              <th class="px-3.5 py-2.5">Delivery Status</th>
              <th class="px-3.5 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="displayedGuests.length === 0">
              <td colspan="7" class="px-4 py-8 text-center text-slate-400">
                No confirmed guests found matching criteria.
              </td>
            </tr>
            <tr
              v-for="guest in displayedGuests"
              :key="guest.id"
              class="hover:bg-slate-50/75 transition-colors"
              :class="{ 'bg-emerald-50/30': currentProcessingId === guest.id }"
            >
              <!-- Guest Name -->
              <td class="px-3.5 py-2.5 font-medium text-slate-900">
                <div class="flex items-center gap-1.5">
                  <span>{{ guest.leadName }}</span>
                  <span
                    v-if="guest.hasSpouse && guest.spouseName"
                    class="text-[10px] px-1 py-0.2 bg-slate-100 text-slate-600 rounded font-normal"
                  >
                    + {{ guest.spouseName }}
                  </span>
                </div>
              </td>

              <!-- Pass Code -->
              <td class="px-3.5 py-2.5 font-mono font-semibold text-slate-800">
                <span class="px-1.5 py-0.5 bg-slate-100 rounded text-[11px] border border-slate-200/60">
                  {{ guest.passCode || "—" }}
                </span>
              </td>

              <!-- Phone -->
              <td class="px-3.5 py-2.5 font-mono text-slate-600">
                {{ formatPhoneDisplay(guest.leadPhone) }}
              </td>

              <!-- Group -->
              <td class="px-3.5 py-2.5 text-slate-600">
                {{ getGroupName(guest.group) }}
              </td>

              <!-- Assigned Sender -->
              <td class="px-3.5 py-2.5">
                <span class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  {{ getAssignedSenderName(guest.group) }}
                </span>
              </td>

              <!-- Status -->
              <td class="px-3.5 py-2.5">
                <span
                  v-if="guest.invitationSent"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  <svg class="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Sent</span>
                  <span v-if="guest.invitationSentAt" class="text-emerald-500 font-mono">
                    ({{ formatDate(guest.invitationSentAt) }})
                  </span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>Pending</span>
                </span>
              </td>

              <!-- Actions -->
              <td class="px-3.5 py-2.5 text-right space-x-1.5">
                <!-- Direct WhatsApp Click-to-Send Link -->
                <a
                  :href="buildWaLink(guest)"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium border border-slate-200 rounded hover:bg-slate-50 text-slate-700 transition"
                  title="Open direct WhatsApp conversation"
                >
                  <span>Open WhatsApp</span>
                  <svg class="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>

                <!-- Automated Send via WAHA -->
                <button
                  type="button"
                  @click="sendSinglePass(guest)"
                  :disabled="sendingId === guest.id || isDispatching"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  <svg v-if="sendingId === guest.id" class="w-3 h-3 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" class="opacity-25"/>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75"/>
                  </svg>
                  <span>{{ guest.invitationSent ? "Resend" : "Send Pass" }}</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="px-3.5 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
        <div>
          Showing {{ paginationStart }} - {{ paginationEnd }} of {{ filteredGuests.length }} guests
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            @click="currentPage--"
            :disabled="currentPage <= 1"
            class="px-2 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span class="px-2 font-mono text-[11px]">Page {{ currentPage }} of {{ totalPages || 1 }}</span>
          <button
            type="button"
            @click="currentPage++"
            :disabled="currentPage >= totalPages"
            class="px-2 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

interface SenderConfig {
  id: string;
  name: string;
  phone: string;
  wahaSession: string;
}

interface CampaignSettings {
  senders: SenderConfig[];
  groupSenderMap: Record<string, string>;
  paceSeconds: number;
  messageTemplate: string;
}

interface RSVPGroup {
  id: string;
  name: string;
  guestCount?: number;
}

interface GuestRecord {
  id: string;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  hasSpouse?: boolean;
  spouseName?: string;
  passCode?: string;
  group?: any;
  attending?: boolean;
  invitationSent?: boolean;
  invitationSentAt?: string;
  invitationSentVia?: string;
}

const loading = ref(false);
const savingSettings = ref(false);
const testing = ref(false);
const showSettings = ref(false);

const activeSenderTab = ref<string>("all");
const searchQuery = ref("");
const statusFilter = ref<"all" | "pending" | "sent">("all");
const testPhone = ref("");

const sendingId = ref<string | null>(null);
const currentProcessingId = ref<string | null>(null);

const isDispatching = ref(false);
const isPaused = ref(false);

const currentPage = ref(1);
const pageSize = ref(25);

const config = ref<CampaignSettings>({
  senders: [
    { id: "groom", name: "Groom", phone: "2348000000001", wahaSession: "groom" },
    { id: "bride", name: "Bride", phone: "2348000000002", wahaSession: "bride" },
    { id: "adun", name: "Adun", phone: "2348000000003", wahaSession: "adun" },
    { id: "busola", name: "My Phone", phone: "2348000000004", wahaSession: "default" },
  ],
  groupSenderMap: {},
  paceSeconds: 8,
  messageTemplate: "",
});

const rsvpGroups = ref<RSVPGroup[]>([]);
const guests = ref<GuestRecord[]>([]);

const totalGuests = computed(() => guests.value.length);
const sentCount = computed(() => guests.value.filter((g) => g.invitationSent).length);
const pendingTotalCount = computed(() => guests.value.filter((g) => !g.invitationSent).length);
const progressPercent = computed(() => {
  if (totalGuests.value === 0) return 0;
  return Math.round((sentCount.value / totalGuests.value) * 100);
});

const activeSenderLabel = computed(() => {
  if (activeSenderTab.value === "all") return "All Senders";
  const s = config.value.senders.find((s) => s.id === activeSenderTab.value);
  return s ? s.name : "Assigned Sender";
});

function senderPendingCount(senderId: string): number {
  return guests.value.filter((g) => {
    if (g.invitationSent) return false;
    const assigned = resolveSenderForGuest(g);
    return assigned === senderId;
  }).length;
}

function resolveSenderForGuest(guest: GuestRecord): string {
  const groupId = typeof guest.group === "object" && guest.group ? guest.group.id : guest.group;
  if (groupId && config.value.groupSenderMap[groupId]) {
    return config.value.groupSenderMap[groupId];
  }
  return "default";
}

function getAssignedSenderName(group: any): string {
  const groupId = typeof group === "object" && group ? group.id : group;
  const senderId = groupId ? config.value.groupSenderMap[groupId] : undefined;
  const s = config.value.senders.find((x) => x.id === senderId);
  return s ? s.name : "Default";
}

function getGroupName(group: any): string {
  if (!group) return "General";
  if (typeof group === "object") return group.name || "General";
  const match = rsvpGroups.value.find((g) => g.id === group);
  return match ? match.name : "General";
}

function formatPhoneDisplay(phone?: string): string {
  if (!phone) return "—";
  return phone.replace(/[^\d+]/g, "");
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

const filteredGuests = computed(() => {
  let list = guests.value;

  // Sender tab filter
  if (activeSenderTab.value !== "all") {
    list = list.filter((g) => resolveSenderForGuest(g) === activeSenderTab.value);
  }

  // Status filter
  if (statusFilter.value === "pending") {
    list = list.filter((g) => !g.invitationSent);
  } else if (statusFilter.value === "sent") {
    list = list.filter((g) => g.invitationSent);
  }

  // Search filter
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter((g) => {
      const name = (g.leadName || "").toLowerCase();
      const spouse = (g.spouseName || "").toLowerCase();
      const code = (g.passCode || "").toLowerCase();
      const phone = (g.leadPhone || "").toLowerCase();
      return name.includes(q) || spouse.includes(q) || code.includes(q) || phone.includes(q);
    });
  }

  return list;
});

const pendingGuestsInView = computed(() => {
  return filteredGuests.value.filter((g) => !g.invitationSent);
});

const totalPages = computed(() => Math.ceil(filteredGuests.value.length / pageSize.value));
const paginationStart = computed(() => {
  if (filteredGuests.value.length === 0) return 0;
  return (currentPage.value - 1) * pageSize.value + 1;
});
const paginationEnd = computed(() => {
  return Math.min(currentPage.value * pageSize.value, filteredGuests.value.length);
});

const displayedGuests = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredGuests.value.slice(start, start + pageSize.value);
});

function buildWaLink(guest: GuestRecord): string {
  const phone = (guest.leadPhone || "").replace(/[^\d]/g, "");
  const passCode = guest.passCode || guest.id;
  const guestName = guest.hasSpouse && guest.spouseName ? `${guest.leadName} & ${guest.spouseName}` : guest.leadName;
  const passUrl = `https://thesweetunion.com/pass/${passCode}`;

  const text = [
    `Dear ${guestName},`,
    ``,
    `We are delighted to confirm your RSVP for our wedding celebration!`,
    ``,
    `Your VIP Reception Access Pass is ready:`,
    `Pass Code: ${passCode}`,
    `Digital Pass & Entry Card: ${passUrl}`,
    ``,
    `CHURCH CEREMONY: 10:00 AM (Open to all friends & family)`,
    `RECEPTION: Strictly by digital access card or pass code.`,
    `DRESS CODE: Mauve & Gold / African Regal`,
    ``,
    `We can't wait to celebrate with you!`,
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

async function fetchData() {
  loading.value = true;
  try {
    const res: any = await $fetch("/api/pass-campaign/status");
    if (res.success) {
      if (res.config) config.value = { ...config.value, ...res.config };
      rsvpGroups.value = res.rsvpGroups || [];
      guests.value = res.guests || [];
    }
  } catch (err: any) {
    console.error("Failed to load pass campaign data:", err);
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  savingSettings.value = true;
  try {
    await $fetch("/api/pass-campaign/settings", {
      method: "POST",
      body: {
        senders: config.value.senders,
        groupSenderMap: config.value.groupSenderMap,
        paceSeconds: config.value.paceSeconds,
      },
    });
    showSettings.value = false;
  } catch (err: any) {
    alert("Failed to save settings: " + (err.data?.message || err.message));
  } finally {
    savingSettings.value = false;
  }
}

async function sendTestPass() {
  if (!testPhone.value) return;
  testing.value = true;
  try {
    const res: any = await $fetch("/api/pass-campaign/test", {
      method: "POST",
      body: { phone: testPhone.value },
    });
    if (res.success) {
      alert(`Test pass sent to ${testPhone.value}`);
    } else {
      alert("Test send failed: " + (res.message || "Unknown error"));
    }
  } catch (err: any) {
    alert("Test send failed: " + (err.data?.message || err.message));
  } finally {
    testing.value = false;
  }
}

async function sendSinglePass(guest: GuestRecord) {
  sendingId.value = guest.id;
  try {
    const res: any = await $fetch("/api/pass-campaign/send", {
      method: "POST",
      body: { guestId: guest.id },
    });
    if (res.success) {
      guest.invitationSent = true;
      guest.invitationSentAt = new Date().toISOString();
      guest.invitationSentVia = "whatsapp";
    } else {
      alert("Failed to dispatch pass: " + (res.message || "Error"));
    }
  } catch (err: any) {
    alert("Failed to dispatch: " + (err.data?.message || err.message));
  } finally {
    sendingId.value = null;
  }
}

async function startAutoDispatch() {
  if (pendingGuestsInView.value.length === 0) return;
  isDispatching.value = true;
  isPaused.value = false;

  const targetList = [...pendingGuestsInView.value];

  for (const guest of targetList) {
    if (!isDispatching.value) break;

    while (isPaused.value) {
      await new Promise((r) => setTimeout(r, 500));
      if (!isDispatching.value) break;
    }
    if (!isDispatching.value) break;

    currentProcessingId.value = guest.id;
    try {
      const res: any = await $fetch("/api/pass-campaign/send", {
        method: "POST",
        body: { guestId: guest.id },
      });
      if (res.success) {
        guest.invitationSent = true;
        guest.invitationSentAt = new Date().toISOString();
        guest.invitationSentVia = "whatsapp";
      }
    } catch (e) {
      console.error(`Failed to send to ${guest.leadName}:`, e);
    }

    // Pacing delay (8-15 seconds)
    const delay = (config.value.paceSeconds || 8) * 1000;
    await new Promise((r) => setTimeout(r, delay));
  }

  currentProcessingId.value = null;
  isDispatching.value = false;
  isPaused.value = false;
}

function pauseAutoDispatch() {
  isPaused.value = !isPaused.value;
}

function stopAutoDispatch() {
  isDispatching.value = false;
  isPaused.value = false;
  currentProcessingId.value = null;
}

onMounted(() => {
  fetchData();
});
</script>
