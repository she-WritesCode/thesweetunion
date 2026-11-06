<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { adminAuthHeaders } from "~/utils/admin-auth";

interface WahaSession {
  name: string;
  status: string;
  phone: string | null;
  pushName: string;
}

interface RsvpGroup {
  id: string;
  name: string;
  slug: string;
  maxCapacity: number;
}

interface CampaignGuest {
  id: string;
  passCode: string;
  leadName: string;
  leadPhone: string;
  hasSpouse: boolean;
  spouseName: string;
  groupId: string;
  groupName: string;
  invitationSent: boolean;
  invitationSentAt: string | null;
  invitationSentVia: string | null;
}

interface SenderConfig {
  id: "bride" | "groom" | "adun" | "me";
  label: string;
  subtitle: string;
  icon: string;
  session: string;
  assignedGroupIds: string[];
}

const DEFAULT_TEMPLATE = `[Greeting]

We can't wait to celebrate with you at #TheSweetUnion! 💍✨

🎟️ YOUR RECEPTION PASS:
Your digital pass code is [PASS_CODE].
Access your official entry card and itinerary here:
[PASS_URL]

⚠️ IMPORTANT VENUE & ENTRY INFO:
• Church Ceremony: [Church Venue & Time] (Open to all friends and family)
• Wedding Reception: [Reception Venue & Time]
  *Please note: The digital pass above is strictly required for entry at the reception venue. Kindly have it ready on your phone.*

❓ FREQUENTLY ASKED QUESTIONS:
• Colors / Dress Code: [Dress Code]
• Gifts & Registry: [Wishlist Link]

With love,
Adun & Uche`;

// State
const loading = ref(true);
const savingSettings = ref(false);
const saveSuccess = ref(false);
const error = ref("");
const successMsg = ref("");

const sessions = ref<WahaSession[]>([]);
const groups = ref<RsvpGroup[]>([]);
const allGuests = ref<CampaignGuest[]>([]);
const rawTemplate = ref(DEFAULT_TEMPLATE);
const attachImage = ref(true);
const intervalSeconds = ref(45);

// 4 Senders Config
const senders = ref<SenderConfig[]>([
  {
    id: "bride",
    label: "Bride's Phone",
    subtitle: "Bride's Family & Friends",
    icon: "👰",
    session: "",
    assignedGroupIds: [],
  },
  {
    id: "groom",
    label: "Groom's Phone",
    subtitle: "Groom's Family & Friends",
    icon: "🤵",
    session: "",
    assignedGroupIds: [],
  },
  {
    id: "adun",
    label: "Adun's Phone",
    subtitle: "VIPs & Church Groups",
    icon: "📱",
    session: "AdunsPhone",
    assignedGroupIds: [],
  },
  {
    id: "me",
    label: "My Phone",
    subtitle: "Colleagues & General Guests",
    icon: "🛠️",
    session: "",
    assignedGroupIds: [],
  },
]);

const activeSenderId = ref<"bride" | "groom" | "adun" | "me">("bride");
const currentSender = computed(() => senders.value.find((s) => s.id === activeSenderId.value) || senders.value[0]);

// Test Message State
const testPhone = ref("");
const sendingTest = ref(false);
const testSuccess = ref(false);
const testError = ref("");

// Automated Runner Engine
const engineStatus = ref<"idle" | "running" | "paused" | "finished">("idle");
const currentQueueIndex = ref(0);
const countdown = ref(0);
let timerHandle: any = null;

// Activity Log
interface LogItem {
  id: string;
  time: string;
  guestName: string;
  phone: string;
  passCode: string;
  status: "success" | "failed" | "skipped";
  session: string;
  notes?: string;
}
const activityLog = ref<LogItem[]>([]);

// Filter Guests for Active Sender
const senderGuests = computed(() => {
  const assigned = new Set(currentSender.value.assignedGroupIds);
  return allGuests.value.filter((g) => assigned.has(g.groupId));
});

const senderPendingGuests = computed(() => {
  return senderGuests.value.filter((g) => !g.invitationSent);
});

const senderSentGuests = computed(() => {
  return senderGuests.value.filter((g) => g.invitationSent);
});

// Overall Stats
const totalConfirmed = computed(() => allGuests.value.length);
const totalSent = computed(() => allGuests.value.filter((g) => g.invitationSent).length);
const totalRemaining = computed(() => allGuests.value.filter((g) => !g.invitationSent).length);

// Unassigned Groups
const unassignedGroups = computed(() => {
  const allAssigned = new Set(senders.value.flatMap((s) => s.assignedGroupIds));
  return groups.value.filter((g) => !allAssigned.has(g.id));
});

// Current Guest in Runner
const runnerTargetGuest = computed<CampaignGuest | null>(() => {
  if (currentQueueIndex.value < senderPendingGuests.value.length) {
    return senderPendingGuests.value[currentQueueIndex.value];
  }
  return null;
});

// Live Preview
const previewGuest = computed(() => {
  return senderPendingGuests.value[0] || senderGuests.value[0] || allGuests.value[0] || null;
});

const renderedPreviewText = computed(() => {
  const g = previewGuest.value;
  const name = g ? (g.hasSpouse && g.spouseName ? `${g.leadName} & ${g.spouseName}` : g.leadName) : "Guest Name";
  const passCode = g ? g.passCode : "K7P9X2";
  const passUrl = `https://thesweetunion.com/pass/${passCode.toLowerCase()}`;
  const church = "Saturday, Nov 21, 2026 @ 09:30 AM — RCCG Victory Center, No 58 Iju Road, Agege, Lagos";
  const reception = "Saturday, Nov 21, 2026 @ 02:00 PM — Agege, Lagos (Details on Pass Card)";
  const dressCode = "Strictly Formal / African Regal (Mauve & Gold)";
  const wishlist = "https://thesweetunion.com/wishlist";

  let text = rawTemplate.value || DEFAULT_TEMPLATE;
  text = text.replace(/\[Greeting[^\]]*\]/gi, `Dear ${name},`).replace(/\{Greeting[^\}]*\}/gi, `Dear ${name},`);
  text = text
    .replace(/\[Guest Name\]/gi, name)
    .replace(/\[PASS_CODE\]/gi, passCode)
    .replace(/\[PASS_URL\]/gi, passUrl)
    .replace(/\[Church Venue & Time\]/gi, church)
    .replace(/\[Reception Venue & Time\]/gi, reception)
    .replace(/\[Dress Code\]/gi, dressCode)
    .replace(/\[Wishlist Link\]/gi, wishlist);

  return text;
});

async function loadData() {
  loading.value = true;
  error.value = "";
  try {
    const res = await $fetch<any>("/api/pass-campaign/status", {
      headers: adminAuthHeaders(),
    });

    if (res.sessions) sessions.value = res.sessions;
    if (res.groups) groups.value = res.groups;
    if (res.guests) allGuests.value = res.guests;

    // Load saved config if any
    if (res.config) {
      if (res.config.template) rawTemplate.value = res.config.template;
      if (res.config.attachImage !== undefined) attachImage.value = res.config.attachImage;
      if (res.config.intervalSeconds) intervalSeconds.value = res.config.intervalSeconds;
      if (Array.isArray(res.config.senders) && res.config.senders.length > 0) {
        // Merge saved senders
        for (const s of senders.value) {
          const match = res.config.senders.find((saved: any) => saved.id === s.id);
          if (match) {
            s.session = match.session || "";
            s.assignedGroupIds = match.assignedGroupIds || [];
          }
        }
      }
    }
  } catch (err: any) {
    error.value = err?.data?.message || err.message || "Failed to load campaign data.";
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  savingSettings.value = true;
  saveSuccess.value = false;
  try {
    await $fetch("/api/pass-campaign/settings", {
      method: "POST",
      headers: adminAuthHeaders(),
      body: {
        template: rawTemplate.value,
        attachImage: attachImage.value,
        intervalSeconds: intervalSeconds.value,
        senders: senders.value.map((s) => ({
          id: s.id,
          session: s.session,
          assignedGroupIds: s.assignedGroupIds,
        })),
      },
    });
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (err: any) {
    alert("Failed to save settings: " + (err?.data?.message || err.message));
  } finally {
    savingSettings.value = false;
  }
}

function toggleGroupAssignment(groupId: string) {
  const current = currentSender.value.assignedGroupIds;
  const idx = current.indexOf(groupId);
  if (idx > -1) {
    current.splice(idx, 1);
  } else {
    // Remove from other senders first to keep routing 1-to-1
    for (const s of senders.value) {
      const otherIdx = s.assignedGroupIds.indexOf(groupId);
      if (otherIdx > -1) s.assignedGroupIds.splice(otherIdx, 1);
    }
    current.push(groupId);
  }
}

async function sendSingle(guest: CampaignGuest, mode: "automated" | "manual" = "manual") {
  try {
    const res = await $fetch<any>("/api/pass-campaign/send", {
      method: "POST",
      headers: adminAuthHeaders(),
      body: {
        rsvpId: guest.id,
        session: currentSender.value.session || undefined,
        customTemplate: rawTemplate.value,
        attachImage: attachImage.value,
        mode,
      },
    });

    // Mark locally
    guest.invitationSent = true;
    guest.invitationSentAt = res.sentAt;
    guest.invitationSentVia = "whatsapp";

    activityLog.value.unshift({
      id: Math.random().toString(),
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      guestName: guest.leadName,
      phone: guest.leadPhone,
      passCode: guest.passCode,
      status: "success",
      session: currentSender.value.session || "Manual",
      notes: mode === "manual" ? "Opened in WhatsApp (wa.me)" : "Dispatched via WAHA",
    });

    if (mode === "manual" && res.waUrl) {
      window.open(res.waUrl, "_blank", "noopener,noreferrer");
    }

    return true;
  } catch (err: any) {
    activityLog.value.unshift({
      id: Math.random().toString(),
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      guestName: guest.leadName,
      phone: guest.leadPhone,
      passCode: guest.passCode,
      status: "failed",
      session: currentSender.value.session || "Manual",
      notes: err?.data?.message || err.message,
    });
    return false;
  }
}

// Automated Runner
async function startAutomatedRunner() {
  if (senderPendingGuests.value.length === 0) {
    alert("No pending guests in this sender's assigned groups!");
    return;
  }
  if (!currentSender.value.session) {
    alert("Please select an active WAHA session for this sender profile before starting automated dispatch.");
    return;
  }

  engineStatus.value = "running";
  currentQueueIndex.value = 0;
  runNextAutomatedStep();
}

async function runNextAutomatedStep() {
  if (engineStatus.value !== "running") return;

  const guest = runnerTargetGuest.value;
  if (!guest) {
    engineStatus.value = "finished";
    return;
  }

  // Send current guest
  await sendSingle(guest, "automated");

  // Check if more remaining
  if (currentQueueIndex.value >= senderPendingGuests.value.length) {
    engineStatus.value = "finished";
    return;
  }

  // Random human jitter (e.g. intervalSeconds + 5 to 15s)
  const jitter = Math.floor(Math.random() * 12) + 4;
  countdown.value = intervalSeconds.value + jitter;

  clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    if (engineStatus.value !== "running") {
      clearInterval(timerHandle);
      return;
    }
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(timerHandle);
      runNextAutomatedStep();
    }
  }, 1000);
}

function pauseRunner() {
  engineStatus.value = "paused";
  clearInterval(timerHandle);
}

function resumeRunner() {
  engineStatus.value = "running";
  runNextAutomatedStep();
}

function stopRunner() {
  engineStatus.value = "idle";
  clearInterval(timerHandle);
  countdown.value = 0;
}

function skipCurrentGuest() {
  if (runnerTargetGuest.value) {
    activityLog.value.unshift({
      id: Math.random().toString(),
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      guestName: runnerTargetGuest.value.leadName,
      phone: runnerTargetGuest.value.leadPhone,
      passCode: runnerTargetGuest.value.passCode,
      status: "skipped",
      session: currentSender.value.session || "Manual",
      notes: "Skipped by admin",
    });
  }
  currentQueueIndex.value++;
}

async function sendTestMessage() {
  if (!testPhone.value) return;
  sendingTest.value = true;
  testError.value = "";
  testSuccess.value = false;

  try {
    await $fetch("/api/pass-campaign/test", {
      method: "POST",
      headers: adminAuthHeaders(),
      body: {
        phone: testPhone.value,
        session: currentSender.value.session || undefined,
        customTemplate: rawTemplate.value,
        attachImage: attachImage.value,
      },
    });
    testSuccess.value = true;
    setTimeout(() => {
      testSuccess.value = false;
    }, 4000);
  } catch (err: any) {
    testError.value = err?.data?.message || err.message || "Failed to send test message.";
  } finally {
    sendingTest.value = false;
  }
}

onMounted(() => {
  loadData();
});

onUnmounted(() => {
  clearInterval(timerHandle);
});
</script>

<template>
  <div class="pass-campaign-app">
    <!-- Header -->
    <header class="campaign-header">
      <div class="header-titles">
        <h1 class="header-title">🎉 Wedding Pass Distribution Campaign</h1>
        <p class="header-desc">
          Safely dispatch personalized VIP Access Cards and Reception FAQs across 4 phones to prevent WhatsApp bot detection.
        </p>
      </div>

      <div class="header-actions">
        <button type="button" class="btn-refresh" :disabled="loading" @click="loadData">
          <span v-if="loading" class="spin">↻</span>
          <span v-else>↻ Refresh Data</span>
        </button>
      </div>
    </header>

    <!-- Top KPI Row -->
    <section class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Confirmed Attending Guests</span>
        <span class="kpi-val">{{ totalConfirmed }}</span>
        <span class="kpi-sub">Total RSVP Confirmed</span>
      </div>
      <div class="kpi-card kpi-sent">
        <span class="kpi-label">Passes Dispatched</span>
        <span class="kpi-val">{{ totalSent }}</span>
        <span class="kpi-sub">{{ Math.round((totalSent / (totalConfirmed || 1)) * 100) }}% Completed</span>
      </div>
      <div class="kpi-card kpi-remaining">
        <span class="kpi-label">Pending Passes</span>
        <span class="kpi-val">{{ totalRemaining }}</span>
        <span class="kpi-sub">Ready to Dispatch</span>
      </div>
      <div class="kpi-card" :class="{ 'kpi-alert': unassignedGroups.length > 0 }">
        <span class="kpi-label">Group Assignment Health</span>
        <span class="kpi-val">{{ unassignedGroups.length === 0 ? "✓ 100%" : `${unassignedGroups.length} Unassigned` }}</span>
        <span class="kpi-sub">{{ unassignedGroups.length === 0 ? "All groups mapped to a phone" : "Assign remaining groups below" }}</span>
      </div>
    </section>

    <!-- 4 Senders Switcher Tabs -->
    <section class="sender-tabs-bar">
      <div class="tabs-list">
        <button
          v-for="s in senders"
          :key="s.id"
          type="button"
          class="sender-tab-btn"
          :class="{ active: activeSenderId === s.id }"
          @click="activeSenderId = s.id"
        >
          <span class="tab-icon">{{ s.icon }}</span>
          <div class="tab-info">
            <span class="tab-label">{{ s.label }}</span>
            <span class="tab-count">
              {{ allGuests.filter(g => new Set(s.assignedGroupIds).has(g.groupId) && !g.invitationSent).length }} pending /
              {{ allGuests.filter(g => new Set(s.assignedGroupIds).has(g.groupId)).length }} total
            </span>
          </div>
        </button>
      </div>
    </section>

    <!-- Main Workspace Grid -->
    <div class="campaign-workspace">
      <!-- Left Column: Sender Routing & Dispatch Controls -->
      <div class="workspace-col-main">
        <!-- Sender Configuration Card -->
        <div class="card-box">
          <div class="card-header">
            <div class="sender-pill">
              <span class="pill-icon">{{ currentSender.icon }}</span>
              <div>
                <h3 class="card-title">{{ currentSender.label }} Settings</h3>
                <p class="card-desc">{{ currentSender.subtitle }}</p>
              </div>
            </div>

            <div class="session-picker">
              <label class="session-label">WAHA Session:</label>
              <select v-model="currentSender.session" class="select-session">
                <option value="">Manual Only (wa.me)</option>
                <option v-for="sess in sessions" :key="sess.name" :value="sess.name">
                  {{ sess.name }} ({{ sess.status }})
                </option>
              </select>
            </div>
          </div>

          <!-- Group Assignment Checklist -->
          <div class="group-assignment-box">
            <div class="group-assignment-head">
              <h4 class="subhead">Assigned Invitation Groups for {{ currentSender.label }}</h4>
              <span class="assigned-counter">{{ currentSender.assignedGroupIds.length }} groups selected</span>
            </div>
            <p class="subdesc">
              Guests in these RSVP groups will be routed to this phone number.
            </p>

            <div class="groups-checkbox-grid">
              <label
                v-for="grp in groups"
                :key="grp.id"
                class="group-checkbox-pill"
                :class="{ selected: currentSender.assignedGroupIds.includes(grp.id) }"
              >
                <input
                  type="checkbox"
                  :checked="currentSender.assignedGroupIds.includes(grp.id)"
                  @change="toggleGroupAssignment(grp.id)"
                />
                <span class="grp-name">{{ grp.name }}</span>
                <span class="grp-count">({{ allGuests.filter(g => g.groupId === grp.id).length }} guests)</span>
              </label>
            </div>

            <div class="save-bar">
              <button
                type="button"
                class="btn-save-settings"
                :disabled="savingSettings"
                @click="saveSettings"
              >
                {{ savingSettings ? "Saving..." : saveSuccess ? "✓ Settings Saved!" : "💾 Save Group Routing & Template" }}
              </button>
            </div>
          </div>
        </div>

        <!-- Dispatcher Controls: Mode A & Mode B -->
        <div class="card-box">
          <h3 class="card-title">🚀 Dispatch Center for {{ currentSender.label }}</h3>
          <p class="card-desc">
            Choose whether to automate sending via WAHA with paced human delays, or tap through manually via WhatsApp Web.
          </p>

          <div class="dispatch-modes-grid">
            <!-- Mode A: Automated Runner -->
            <div class="mode-card">
              <div class="mode-head">
                <h4 class="mode-title">🤖 Mode A: Automated WAHA Runner</h4>
                <span v-if="currentSender.session" class="session-status-badge online">
                  ● Session: {{ currentSender.session }}
                </span>
                <span v-else class="session-status-badge offline">
                  Select a session above to automate
                </span>
              </div>
              <p class="mode-desc">
                Dispatches each pass sequentially with random human jitter delay (e.g. 45–60s) to keep this WhatsApp number completely safe.
              </p>

              <div class="runner-controls-row">
                <div class="timing-input">
                  <label>Base Delay (s):</label>
                  <input v-model.number="intervalSeconds" type="number" min="25" max="120" class="input-delay" />
                </div>

                <div class="runner-actions">
                  <button
                    v-if="engineStatus === 'idle' || engineStatus === 'finished'"
                    type="button"
                    class="btn-start"
                    :disabled="senderPendingGuests.length === 0 || !currentSender.session"
                    @click="startAutomatedRunner"
                  >
                    ▶ Start Automated Dispatch
                  </button>

                  <template v-else-if="engineStatus === 'running'">
                    <button type="button" class="btn-pause" @click="pauseRunner">⏸ Pause</button>
                    <button type="button" class="btn-skip" @click="skipCurrentGuest">⏭ Skip</button>
                    <button type="button" class="btn-stop" @click="stopRunner">⏹ Stop</button>
                  </template>

                  <template v-else-if="engineStatus === 'paused'">
                    <button type="button" class="btn-resume" @click="resumeRunner">▶ Resume</button>
                    <button type="button" class="btn-stop" @click="stopRunner">⏹ Stop</button>
                  </template>
                </div>
              </div>

              <!-- Live Runner Status Box -->
              <div v-if="engineStatus === 'running' || engineStatus === 'paused'" class="runner-live-box">
                <div class="live-pulse">
                  <span class="pulsing-dot" />
                  <strong>{{ engineStatus === 'running' ? `Sending next pass in ${countdown}s...` : 'Paused by operator' }}</strong>
                </div>
                <div v-if="runnerTargetGuest" class="target-guest-card">
                  <span class="tg-label">Current Target Guest:</span>
                  <div class="tg-info">
                    <strong>{{ runnerTargetGuest.leadName }}</strong>
                    <span>{{ runnerTargetGuest.leadPhone }}</span>
                    <span class="tg-code">Pass: {{ runnerTargetGuest.passCode }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Mode B: Manual Click-to-Send -->
            <div class="mode-card">
              <div class="mode-head">
                <h4 class="mode-title">💬 Mode B: Assisted Click-to-Send (wa.me)</h4>
                <span class="tag-safe">100% Ban-Proof</span>
              </div>
              <p class="mode-desc">
                Click to open each guest's pre-filled chat in WhatsApp Web/Desktop. The guest is marked as Sent automatically upon click.
              </p>

              <div class="manual-queue-container">
                <div v-if="senderPendingGuests.length === 0" class="empty-queue-msg">
                  🎉 All passes in this sender's groups have been dispatched!
                </div>
                <div v-else class="queue-list">
                  <div
                    v-for="guest in senderPendingGuests.slice(0, 15)"
                    :key="guest.id"
                    class="queue-item"
                  >
                    <div class="qi-info">
                      <div class="qi-name-row">
                        <strong class="qi-name">{{ guest.leadName }}</strong>
                        <span v-if="guest.hasSpouse" class="admits-pill">+ Spouse</span>
                        <span class="qi-code">{{ guest.passCode }}</span>
                      </div>
                      <div class="qi-sub">
                        <span>{{ guest.leadPhone }}</span>
                        <span>·</span>
                        <span>{{ guest.groupName }}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      class="btn-send-wame"
                      @click="sendSingle(guest, 'manual')"
                    >
                      <span>Send in WhatsApp ↗</span>
                    </button>
                  </div>
                </div>
                <p v-if="senderPendingGuests.length > 15" class="queue-more-text">
                  + {{ senderPendingGuests.length - 15 }} more guests remaining in queue
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity Log -->
        <div class="card-box">
          <div class="log-header">
            <h3 class="card-title">📜 Dispatch Delivery Log</h3>
            <span class="log-count">{{ activityLog.length }} events recorded</span>
          </div>

          <div v-if="activityLog.length === 0" class="empty-log">
            No activity yet in this session. Start automated dispatch or send via Mode B to view live delivery logs.
          </div>
          <div v-else class="log-table-wrapper">
            <table class="log-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Guest</th>
                  <th>Pass Code</th>
                  <th>Phone</th>
                  <th>Sender</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in activityLog" :key="log.id" :class="log.status">
                  <td class="cell-time">{{ log.time }}</td>
                  <td class="cell-name">{{ log.guestName }}</td>
                  <td class="cell-code">{{ log.passCode }}</td>
                  <td class="cell-phone">{{ log.phone }}</td>
                  <td class="cell-sess">{{ log.session }}</td>
                  <td class="cell-status">
                    <span :class="['status-pill', log.status]">{{ log.status }}</span>
                  </td>
                  <td class="cell-notes">{{ log.notes }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Right Column: Template Editor, Live Preview & Test Send -->
      <div class="workspace-col-side">
        <!-- Live Preview Card -->
        <div class="card-box">
          <div class="preview-header">
            <h3 class="card-title">📱 WhatsApp Message Preview</h3>
            <span class="badge-preview">Live Render</span>
          </div>

          <!-- Attach Image Option -->
          <div class="toggle-image-box">
            <label class="toggle-label">
              <input v-model="attachImage" type="checkbox" />
              <span>Attach Generated VIP Access Card (Image)</span>
            </label>
            <p class="toggle-desc">
              When checked, WAHA sends the personalized Gold Access Card image with the message text below as its caption!
            </p>
          </div>

          <!-- Image Card Thumbnail Preview -->
          <div v-if="attachImage && previewGuest" class="preview-image-container">
            <img
              :src="`/api/pass/card-image/${previewGuest.passCode.toLowerCase()}.png`"
              alt="Pass Card Preview"
              class="preview-card-img"
            />
          </div>

          <!-- Message Bubble Mockup -->
          <div class="whatsapp-mockup-bubble">
            <div class="bubble-content">
              <pre class="preview-text">{{ renderedPreviewText }}</pre>
            </div>
            <span class="bubble-time">12:00 PM ✓✓</span>
          </div>
        </div>

        <!-- Template Editor -->
        <div class="card-box">
          <h3 class="card-title">✏️ Message Template Editor</h3>
          <p class="card-desc">
            Available tags: <code class="tag-code">[Greeting]</code>, <code class="tag-code">[Guest Name]</code>, <code class="tag-code">[PASS_CODE]</code>, <code class="tag-code">[PASS_URL]</code>, <code class="tag-code">[Church Venue & Time]</code>, <code class="tag-code">[Reception Venue & Time]</code>, <code class="tag-code">[Dress Code]</code>, <code class="tag-code">[Wishlist Link]</code>
          </p>

          <textarea
            v-model="rawTemplate"
            class="template-textarea"
            rows="16"
            placeholder="Type your WhatsApp message template here..."
          />

          <div class="template-actions">
            <button
              type="button"
              class="btn-reset"
              @click="rawTemplate = DEFAULT_TEMPLATE"
            >
              Reset to Default Template
            </button>
            <button
              type="button"
              class="btn-save-sm"
              :disabled="savingSettings"
              @click="saveSettings"
            >
              {{ savingSettings ? "Saving..." : "Save Template" }}
            </button>
          </div>
        </div>

        <!-- Test Message Box -->
        <div class="card-box">
          <h3 class="card-title">🧪 Send Test Pass to Your Phone</h3>
          <p class="card-desc">
            Send a sample pass card and rendered message directly to your phone to preview how it arrives in WhatsApp.
          </p>

          <div class="test-row">
            <input
              v-model="testPhone"
              type="tel"
              placeholder="+2348012345678"
              class="input-test-phone"
            />
            <button
              type="button"
              class="btn-test"
              :disabled="sendingTest || !testPhone"
              @click="sendTestMessage"
            >
              {{ sendingTest ? "Sending..." : "Send Test" }}
            </button>
          </div>

          <p v-if="testSuccess" class="test-status success">✓ Test message sent successfully via {{ currentSender.session || "default session" }}!</p>
          <p v-if="testError" class="test-status error">✗ {{ testError }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pass-campaign-app {
  padding: 24px;
  background: #140c12;
  color: #faf5f8;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* Header */
.campaign-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
}

.header-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fce8b3;
  margin: 0 0 4px 0;
}

.header-desc {
  font-size: 0.875rem;
  color: rgba(250, 245, 248, 0.7);
  margin: 0;
}

.btn-refresh {
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(212, 175, 55, 0.15);
  border: 1px solid rgba(212, 175, 55, 0.35);
  color: #fce8b3;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover {
  background: rgba(212, 175, 55, 0.25);
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-card {
  background: #20121b;
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
}

.kpi-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(250, 245, 248, 0.6);
  margin-bottom: 8px;
}

.kpi-val {
  font-size: 1.85rem;
  font-weight: 800;
  color: #fce8b3;
  line-height: 1.1;
  margin-bottom: 4px;
}

.kpi-sub {
  font-size: 0.75rem;
  color: rgba(250, 245, 248, 0.5);
}

.kpi-sent .kpi-val {
  color: #4ade80;
}

.kpi-remaining .kpi-val {
  color: #facc15;
}

.kpi-alert {
  border-color: rgba(248, 113, 113, 0.4);
}

.kpi-alert .kpi-val {
  color: #f87171;
}

/* Sender Tabs */
.sender-tabs-bar {
  margin-bottom: 24px;
}

.tabs-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.sender-tab-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 12px;
  background: #1c1018;
  border: 1px solid rgba(212, 175, 55, 0.2);
  color: #faf5f8;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.sender-tab-btn:hover {
  background: #251620;
  border-color: rgba(212, 175, 55, 0.4);
}

.sender-tab-btn.active {
  background: #2b1725;
  border-color: #d4af37;
  box-shadow: 0 0 15px rgba(212, 175, 55, 0.15);
}

.tab-icon {
  font-size: 1.6rem;
}

.tab-label {
  display: block;
  font-weight: 700;
  font-size: 0.95rem;
  color: #fce8b3;
}

.tab-count {
  display: block;
  font-size: 0.75rem;
  color: rgba(250, 245, 248, 0.6);
}

/* Workspace Grid */
.campaign-workspace {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 24px;
}

@media (max-width: 1080px) {
  .campaign-workspace {
    grid-template-columns: 1fr;
  }
}

.workspace-col-main,
.workspace-col-side {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Card Box */
.card-box {
  background: #1c1018;
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 14px;
  padding: 22px;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fce8b3;
  margin: 0 0 4px 0;
}

.card-desc {
  font-size: 0.8rem;
  color: rgba(250, 245, 248, 0.65);
  margin: 0 0 16px 0;
  line-height: 1.4;
}

/* Sender Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.15);
}

.sender-pill {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pill-icon {
  font-size: 2rem;
}

.session-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.session-label {
  font-size: 0.8rem;
  color: #fce8b3;
  font-weight: 600;
}

.select-session {
  background: #251620;
  border: 1px solid rgba(212, 175, 55, 0.3);
  color: #faf5f8;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
}

/* Group Assignment Box */
.group-assignment-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.subhead {
  font-size: 0.9rem;
  font-weight: 700;
  color: #faf5f8;
  margin: 0;
}

.assigned-counter {
  font-size: 0.75rem;
  color: #d4af37;
  font-weight: 600;
}

.subdesc {
  font-size: 0.775rem;
  color: rgba(250, 245, 248, 0.5);
  margin: 0 0 12px 0;
}

.groups-checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.group-checkbox-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #251620;
  border: 1px solid rgba(212, 175, 55, 0.15);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.group-checkbox-pill.selected {
  background: rgba(212, 175, 55, 0.15);
  border-color: #d4af37;
}

.grp-name {
  font-weight: 600;
  color: #faf5f8;
}

.grp-count {
  font-size: 0.7rem;
  color: rgba(250, 245, 248, 0.5);
}

.save-bar {
  display: flex;
  justify-content: flex-end;
}

.btn-save-settings {
  padding: 8px 16px;
  background: linear-gradient(135deg, #fce8b3, #d4af37);
  color: #30222a;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save-settings:hover {
  filter: brightness(1.1);
}

/* Dispatch Modes Grid */
.dispatch-modes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 800px) {
  .dispatch-modes-grid {
    grid-template-columns: 1fr;
  }
}

.mode-card {
  background: #251620;
  border: 1px solid rgba(212, 175, 55, 0.15);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.mode-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.mode-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #fce8b3;
  margin: 0;
}

.mode-desc {
  font-size: 0.775rem;
  color: rgba(250, 245, 248, 0.6);
  margin: 0 0 14px 0;
  line-height: 1.4;
}

.session-status-badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
}

.session-status-badge.online {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.session-status-badge.offline {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}

.tag-safe {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  font-weight: 700;
}

.runner-controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.timing-input {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: #fce8b3;
}

.input-delay {
  width: 54px;
  background: #1c1018;
  border: 1px solid rgba(212, 175, 55, 0.3);
  color: #faf5f8;
  border-radius: 6px;
  padding: 4px;
  text-align: center;
}

.runner-actions {
  display: flex;
  gap: 8px;
}

.btn-start {
  padding: 8px 14px;
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-pause {
  padding: 8px 12px;
  background: #ca8a04;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-resume {
  padding: 8px 12px;
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-skip {
  padding: 8px 12px;
  background: #4b5563;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-stop {
  padding: 8px 12px;
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}

.runner-live-box {
  background: #1c1018;
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 10px;
  padding: 12px;
  margin-top: 10px;
}

.live-pulse {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #facc15;
  margin-bottom: 8px;
}

.pulsing-dot {
  width: 8px;
  height: 8px;
  background: #facc15;
  border-radius: 50%;
  box-shadow: 0 0 8px #facc15;
}

.target-guest-card {
  font-size: 0.775rem;
}

.tg-label {
  color: rgba(250, 245, 248, 0.5);
  display: block;
}

.tg-info {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #faf5f8;
  margin-top: 2px;
}

.tg-code {
  background: rgba(212, 175, 55, 0.2);
  color: #fce8b3;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

/* Manual Queue List */
.manual-queue-container {
  max-height: 280px;
  overflow-y: auto;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.queue-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: #1c1018;
  border: 1px solid rgba(212, 175, 55, 0.15);
  border-radius: 8px;
}

.qi-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.825rem;
}

.admits-pill {
  font-size: 0.65rem;
  padding: 1px 4px;
  background: #865172;
  color: #fff;
  border-radius: 4px;
}

.qi-code {
  font-family: monospace;
  font-size: 0.7rem;
  color: #d4af37;
}

.qi-sub {
  font-size: 0.725rem;
  color: rgba(250, 245, 248, 0.5);
  display: flex;
  gap: 4px;
}

.btn-send-wame {
  padding: 6px 12px;
  background: #25d366;
  color: #0b2212;
  font-weight: 700;
  font-size: 0.75rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-send-wame:hover {
  filter: brightness(1.1);
}

.empty-queue-msg {
  text-align: center;
  padding: 32px 16px;
  font-size: 0.85rem;
  color: #4ade80;
}

.queue-more-text {
  text-align: center;
  font-size: 0.75rem;
  color: rgba(250, 245, 248, 0.5);
  margin-top: 8px;
}

/* Activity Log Table */
.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.log-count {
  font-size: 0.75rem;
  color: rgba(250, 245, 248, 0.5);
}

.empty-log {
  text-align: center;
  padding: 24px;
  font-size: 0.8rem;
  color: rgba(250, 245, 248, 0.4);
}

.log-table-wrapper {
  max-height: 240px;
  overflow-y: auto;
}

.log-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}

.log-table th {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
  color: #fce8b3;
  font-weight: 600;
}

.log-table td {
  padding: 6px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.status-pill {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status-pill.success {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.status-pill.failed {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.status-pill.skipped {
  background: rgba(156, 163, 175, 0.2);
  color: #9ca3af;
}

/* Side Column: Preview & Editor */
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.badge-preview {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(212, 175, 55, 0.2);
  color: #fce8b3;
  font-weight: 600;
}

.toggle-image-box {
  background: #251620;
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #fce8b3;
  cursor: pointer;
}

.toggle-desc {
  font-size: 0.7rem;
  color: rgba(250, 245, 248, 0.55);
  margin: 4px 0 0 24px;
  line-height: 1.3;
}

.preview-image-container {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
  background: #140c12;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(212, 175, 55, 0.15);
}

.preview-card-img {
  max-width: 180px;
  height: auto;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.whatsapp-mockup-bubble {
  background: #005c4b;
  border-radius: 10px;
  padding: 12px 14px;
  color: #e9edef;
  font-size: 0.775rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.preview-text {
  white-space: pre-wrap;
  font-family: inherit;
  margin: 0;
  line-height: 1.45;
}

.bubble-time {
  display: block;
  text-align: right;
  font-size: 0.65rem;
  color: rgba(233, 237, 239, 0.6);
  margin-top: 6px;
}

/* Template Editor */
.tag-code {
  background: rgba(212, 175, 55, 0.15);
  color: #fce8b3;
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 0.72rem;
}

.template-textarea {
  width: 100%;
  background: #140c12;
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 8px;
  color: #faf5f8;
  padding: 10px;
  font-size: 0.775rem;
  line-height: 1.45;
  font-family: monospace;
  box-sizing: border-box;
  resize: vertical;
}

.template-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.btn-reset {
  background: none;
  border: none;
  color: rgba(250, 245, 248, 0.5);
  font-size: 0.75rem;
  text-decoration: underline;
  cursor: pointer;
}

.btn-save-sm {
  padding: 6px 12px;
  background: #d4af37;
  color: #30222a;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.75rem;
  cursor: pointer;
}

/* Test Row */
.test-row {
  display: flex;
  gap: 8px;
}

.input-test-phone {
  flex: 1;
  background: #140c12;
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 8px;
  color: #faf5f8;
  padding: 8px 12px;
  font-size: 0.8rem;
}

.btn-test {
  padding: 8px 16px;
  background: #4b5563;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-test:hover:not(:disabled) {
  background: #374151;
}

.test-status {
  font-size: 0.75rem;
  margin-top: 8px;
}

.test-status.success {
  color: #4ade80;
}

.test-status.error {
  color: #f87171;
}

.spin {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}
</style>
