<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { adminAuthHeaders } from "~/utils/admin-auth";

interface WahaSession {
  name: string;
  status: string;
  phone: string | null;
  pushName: string;
}

interface UnpaidGuest {
  id: string;
  leadName: string;
  leadPhone: string;
  itemsSummary: string;
  totalAmount: number;
  paymentStatus: string;
  asoebiSent: boolean;
  asoebiSentAt: string | null;
  sentThisMonth?: boolean;
}

const loading = ref(true);
const error = ref("");
const successMsg = ref("");

// Sessions
const sessions = ref<WahaSession[]>([]);
const selectedSession = ref("AdunsPhone");
const loadingSessions = ref(false);

// Test Message State
const testPhone = ref("");
const sendingTest = ref(false);
const testSuccess = ref(false);
const testError = ref("");

// Settings & Template
const rawTemplate = ref("");
const savingTemplate = ref(false);
const saveSuccess = ref(false);
const bankName = ref("OPay Digital Services Limited");
const accountNumber = ref("8105733592");
const accountName = ref("ADUNOLUWA ANUOLUWAPO OBADOFIN");
const repName = ref("Ololade");

// Guests & Scope
const allUnpaidGuests = ref<UnpaidGuest[]>([]);
const scopeFilter = ref<"not_sent_this_month" | "never_sent" | "all">("not_sent_this_month");
const intervalMinutes = ref(5);

// Campaign Engine State
const campaignStatus = ref<"idle" | "running" | "paused" | "finished">("idle");
const currentIndex = ref(0);
const secondsRemaining = ref(0);
let timerHandle: any = null;

interface LogEntry {
  id: string;
  time: string;
  guestName: string;
  phone: string;
  status: "success" | "failed" | "skipped";
  session: string;
  notes?: string;
}
const activityLog = ref<LogEntry[]>([]);

// Filtered Queue
const eligibleQueue = computed(() => {
  if (scopeFilter.value === "never_sent") {
    return allUnpaidGuests.value.filter((g) => !g.asoebiSent);
  }
  if (scopeFilter.value === "not_sent_this_month") {
    return allUnpaidGuests.value.filter((g) => !g.sentThisMonth);
  }
  return allUnpaidGuests.value;
});

const currentGuest = computed<UnpaidGuest | null>(() => {
  if (currentIndex.value < eligibleQueue.value.length) {
    return eligibleQueue.value[currentIndex.value];
  }
  return null;
});

// Preview Guest
const previewGuestId = ref<string>("");
const previewGuest = computed(() => {
  if (previewGuestId.value) {
    return eligibleQueue.value.find((g) => g.id === previewGuestId.value) || eligibleQueue.value[0];
  }
  return eligibleQueue.value[0] || null;
});

const renderedPreview = computed(() => {
  const g = previewGuest.value;
  if (!g) return "No guests in queue.";
  const name = g.leadName || "Guest";
  const items = g.itemsSummary || "Aso Ebi";
  const total = `₦${g.totalAmount.toLocaleString()}`;

  const tpl =
    rawTemplate.value ||
    `Good day Mr/Mrs/Miss [guest name] , my name is [rep name] a representative of the couple. \n\nThank you for choosing to celebrate #thesweetunion and identifying with the fabric of the day. \n\nKindly confirm your Asoebi request of; [items] order for #TheSweetUnion. \n\nPlease pay the total of [total] to [bank] - [account number] ([account name]) and send proof of payment here as production of fabrics has begun, so you can get your fabrics without delay. Thank you!`;

  return tpl
    .replace(/\[guest name\]/gi, name)
    .replace(/\[guest_name\]/gi, name)
    .replace(/\{guestName\}/gi, name)
    .replace(/\[rep name\]/gi, repName.value)
    .replace(/\[rep_name\]/gi, repName.value)
    .replace(/\[representative name\]/gi, repName.value)
    .replace(/\[representative_name\]/gi, repName.value)
    .replace(/\{repName\}/gi, repName.value)
    .replace(/\[items\]/gi, items)
    .replace(/\[items_summary\]/gi, items)
    .replace(/\{items\}/gi, items)
    .replace(/\[total\]/gi, total)
    .replace(/\[total_amount\]/gi, total)
    .replace(/\{total\}/gi, total)
    .replace(/\[bank\]/gi, bankName.value)
    .replace(/\[bank_name\]/gi, bankName.value)
    .replace(/\[bank name\]/gi, bankName.value)
    .replace(/\{bank\}/gi, bankName.value)
    .replace(/\[account number\]/gi, accountNumber.value)
    .replace(/\[account_number\]/gi, accountNumber.value)
    .replace(/\[accountno\]/gi, accountNumber.value)
    .replace(/\[account_no\]/gi, accountNumber.value)
    .replace(/\{accountNumber\}/gi, accountNumber.value)
    .replace(/\[account name\]/gi, accountName.value)
    .replace(/\[account_name\]/gi, accountName.value)
    .replace(/\{accountName\}/gi, accountName.value);
});

async function loadData() {
  loading.value = true;
  error.value = "";
  try {
    // 1. Load Sessions
    const sessRes = await $fetch<any>("/api/asoebi/reminders/sessions", {
      headers: adminAuthHeaders(),
    }).catch(() => null);

    if (sessRes?.sessions) {
      sessions.value = sessRes.sessions;
      const hasAduns = sessRes.sessions.some((s: any) => s.name === "AdunsPhone");
      if (hasAduns) {
        selectedSession.value = "AdunsPhone";
      } else if (sessRes.sessions.length > 0) {
        selectedSession.value = sessRes.sessions[0].name;
      }
    }

    // 2. Load Status & Unpaid Guests
    const statusRes = await $fetch<any>("/api/asoebi/reminders/status", {
      headers: adminAuthHeaders(),
    });

    if (statusRes?.success) {
      allUnpaidGuests.value = statusRes.unpaidGuests || [];
      rawTemplate.value = statusRes.settings?.whatsAppTemplate || "";
      bankName.value = statusRes.settings?.bankName || "OPay Digital Services Limited";
      accountNumber.value = statusRes.settings?.accountNumber || "8105733592";
      accountName.value = statusRes.settings?.accountName || "ADUNOLUWA ANUOLUWAPO OBADOFIN";
      repName.value = statusRes.settings?.representativeName || "Ololade";

      if (statusRes.settings?.wahaSession) {
        selectedSession.value = statusRes.settings.wahaSession;
      }
    }
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || "Failed to load reminder data.";
  } finally {
    loading.value = false;
  }
}

async function saveTemplate() {
  if (savingTemplate.value || !rawTemplate.value.trim()) return;
  savingTemplate.value = true;
  saveSuccess.value = false;
  error.value = "";

  try {
    await $fetch("/api/asoebi/template", {
      method: "PATCH",
      headers: adminAuthHeaders(),
      body: {
        whatsAppTemplate: rawTemplate.value.trim(),
      },
    });
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || "Failed to save template.";
  } finally {
    savingTemplate.value = false;
  }
}

function insertPlaceholder(token: string) {
  rawTemplate.value = (rawTemplate.value || "") + " " + token + " ";
}

async function sendTestMessage() {
  if (sendingTest.value || !testPhone.value.trim()) return;
  sendingTest.value = true;
  testSuccess.value = false;
  testError.value = "";

  try {
    await $fetch("/api/asoebi/reminders/test", {
      method: "POST",
      headers: adminAuthHeaders(),
      body: {
        phone: testPhone.value.trim(),
        session: selectedSession.value,
        text: `🔔 [Sweet Union Test]\nThis is a test notification from WAHA session "${selectedSession.value}". Ready to dispatch Asoebi reminders!`,
      },
    });
    testSuccess.value = true;
    setTimeout(() => {
      testSuccess.value = false;
    }, 4000);
  } catch (err: any) {
    testError.value = err?.data?.message || err?.message || "Failed to send test message.";
  } finally {
    sendingTest.value = false;
  }
}

// Dispatch single reminder
async function dispatchCurrentGuest(): Promise<boolean> {
  const guest = currentGuest.value;
  if (!guest) return false;

  const timeStr = new Date().toLocaleTimeString();

  try {
    const res = await $fetch<any>("/api/asoebi/reminders/send", {
      method: "POST",
      headers: adminAuthHeaders(),
      body: {
        rsvpId: guest.id,
        session: selectedSession.value,
      },
    });

    if (res?.success) {
      guest.asoebiSent = true;
      guest.asoebiSentAt = res.sentAt || new Date().toISOString();
      guest.sentThisMonth = true;

      activityLog.value.unshift({
        id: guest.id,
        time: timeStr,
        guestName: guest.leadName,
        phone: guest.leadPhone,
        status: "success",
        session: selectedSession.value,
        notes: `₦${guest.totalAmount.toLocaleString()} (${guest.itemsSummary})`,
      });
      return true;
    }
    throw new Error("Send returned unsuccessful.");
  } catch (err: any) {
    activityLog.value.unshift({
      id: guest.id,
      time: timeStr,
      guestName: guest.leadName,
      phone: guest.leadPhone,
      status: "failed",
      session: selectedSession.value,
      notes: err?.data?.message || err?.message || "Send failed",
    });
    return false;
  }
}

// Campaign Runner
function startCampaign() {
  if (campaignStatus.value === "running") return;
  if (currentIndex.value >= eligibleQueue.value.length) {
    currentIndex.value = 0;
  }
  campaignStatus.value = "running";
  runStep();
}

function pauseCampaign() {
  campaignStatus.value = "paused";
  if (timerHandle) clearInterval(timerHandle);
}

function resetCampaign() {
  pauseCampaign();
  currentIndex.value = 0;
  campaignStatus.value = "idle";
  secondsRemaining.value = 0;
}

async function triggerNextNow() {
  if (timerHandle) clearInterval(timerHandle);
  await executeSendAndScheduleNext();
}

function skipCurrentGuest() {
  const g = currentGuest.value;
  if (g) {
    activityLog.value.unshift({
      id: g.id,
      time: new Date().toLocaleTimeString(),
      guestName: g.leadName,
      phone: g.leadPhone,
      status: "skipped",
      session: selectedSession.value,
      notes: "Skipped by admin",
    });
  }
  currentIndex.value++;
  if (currentIndex.value >= eligibleQueue.value.length) {
    finishCampaign();
  } else if (campaignStatus.value === "running") {
    startCountdown();
  }
}

async function executeSendAndScheduleNext() {
  if (currentIndex.value >= eligibleQueue.value.length) {
    finishCampaign();
    return;
  }

  await dispatchCurrentGuest();
  currentIndex.value++;

  if (currentIndex.value >= eligibleQueue.value.length) {
    finishCampaign();
    return;
  }

  if (campaignStatus.value === "running") {
    startCountdown();
  }
}

function runStep() {
  // Dispatch immediate first message if just starting from fresh
  executeSendAndScheduleNext();
}

function startCountdown() {
  if (timerHandle) clearInterval(timerHandle);
  secondsRemaining.value = Math.round(intervalMinutes.value * 60);

  timerHandle = setInterval(() => {
    if (campaignStatus.value !== "running") {
      clearInterval(timerHandle);
      return;
    }

    secondsRemaining.value--;
    if (secondsRemaining.value <= 0) {
      clearInterval(timerHandle);
      executeSendAndScheduleNext();
    }
  }, 1000);
}

function finishCampaign() {
  campaignStatus.value = "finished";
  if (timerHandle) clearInterval(timerHandle);
  secondsRemaining.value = 0;
}

const formattedCountdown = computed(() => {
  const s = secondsRemaining.value;
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
});

const progressPercent = computed(() => {
  const total = eligibleQueue.value.length;
  if (!total) return 0;
  return Math.min(100, Math.round((currentIndex.value / total) * 100));
});

onMounted(() => {
  loadData();
});

onUnmounted(() => {
  if (timerHandle) clearInterval(timerHandle);
});
</script>

<template>
  <div class="asoebi-campaign-card">
    <!-- Header -->
    <div class="card-header">
      <div class="header-title-box">
        <h3 class="header-title">👗 Automated Asoebi WhatsApp Reminder Manager</h3>
        <p class="header-subtitle">
          Configure message, select your sender session, and automatically dispatch reminders spaced out every 5 minutes.
        </p>
      </div>
      <button type="button" class="btn-refresh" :disabled="loading" @click="loadData">
        {{ loading ? "Refreshing…" : "↻ Refresh Queue" }}
      </button>
    </div>

    <!-- Error / Alert -->
    <div v-if="error" class="alert-box error-alert">{{ error }}</div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading WhatsApp sessions & unpaid orders…</p>
    </div>

    <div v-else class="campaign-body">
      <!-- Top Row: Session Selector & Test Ping -->
      <div class="settings-grid">
        <!-- WAHA Session Picker -->
        <div class="setting-col">
          <label class="section-label">1. Sender WhatsApp Session</label>
          <div class="session-picker-box">
            <select v-model="selectedSession" class="select-session" :disabled="campaignStatus === 'running'">
              <option v-for="s in sessions" :key="s.name" :value="s.name">
                {{ s.name }} ({{ s.phone ? `+${s.phone}` : "No number" }} · {{ s.pushName }})
                {{ s.status === "WORKING" ? "🟢" : "⚠️" }}
              </option>
            </select>
            <span class="session-badge" :class="selectedSession === 'AdunsPhone' ? 'badge-primary' : 'badge-neutral'">
              Using: <strong>{{ selectedSession }}</strong>
            </span>
          </div>
          <p class="help-text">
            Messages will be delivered directly from the phone connected to this session.
          </p>
        </div>

        <!-- Test Send Box -->
        <div class="setting-col">
          <label class="section-label">2. Send Quick Test to Yourself</label>
          <div class="test-input-row">
            <input
              v-model="testPhone"
              type="tel"
              class="input-test-phone"
              placeholder="+2348012345678"
              :disabled="sendingTest"
            />
            <button
              type="button"
              class="btn-test"
              :disabled="sendingTest || !testPhone.trim()"
              @click="sendTestMessage"
            >
              {{ sendingTest ? "Sending…" : "Test Ping 📲" }}
            </button>
          </div>
          <p v-if="testSuccess" class="success-note">✓ Test WhatsApp delivered from {{ selectedSession }}!</p>
          <p v-if="testError" class="error-note">{{ testError }}</p>
          <p v-else class="help-text">Verify your phone receives the message from {{ selectedSession }} before starting.</p>
        </div>
      </div>

      <!-- Message Editor & Live Preview -->
      <div class="editor-section">
        <div class="editor-header">
          <label class="section-label">3. Reminder Message Template</label>
          <div class="template-actions">
            <button
              type="button"
              class="btn-save-tpl"
              :disabled="savingTemplate || !rawTemplate.trim()"
              @click="saveTemplate"
            >
              {{ savingTemplate ? "Saving…" : saveSuccess ? "Saved ✓" : "Save as Global Template 💾" }}
            </button>
          </div>
        </div>

        <div class="chips-row">
          <span class="chips-label">Insert:</span>
          <button type="button" class="chip-btn" @click="insertPlaceholder('[guest name]')">[guest name]</button>
          <button type="button" class="chip-btn" @click="insertPlaceholder('[items]')">[items]</button>
          <button type="button" class="chip-btn" @click="insertPlaceholder('[total]')">[total]</button>
          <button type="button" class="chip-btn" @click="insertPlaceholder('[bank]')">[bank]</button>
          <button type="button" class="chip-btn" @click="insertPlaceholder('[account number]')">[account number]</button>
          <button type="button" class="chip-btn" @click="insertPlaceholder('[account name]')">[account name]</button>
          <button type="button" class="chip-btn" @click="insertPlaceholder('[rep name]')">[rep name]</button>
        </div>

        <textarea
          v-model="rawTemplate"
          rows="4"
          class="tpl-textarea"
          placeholder="Enter custom reminder message..."
        ></textarea>

        <!-- Live Preview Previewer -->
        <div class="preview-box">
          <div class="preview-header">
            <span class="preview-title">👁 Live Preview for Guest:</span>
            <select v-model="previewGuestId" class="select-preview-guest">
              <option v-for="g in eligibleQueue" :key="g.id" :value="g.id">
                {{ g.leadName }} ({{ g.leadPhone }}) — ₦{{ g.totalAmount.toLocaleString() }}
              </option>
            </select>
          </div>
          <div class="preview-bubble">
            <pre class="preview-text">{{ renderedPreview }}</pre>
          </div>
        </div>
      </div>

      <!-- Campaign Controller Panel -->
      <div class="controller-panel">
        <div class="controller-top">
          <!-- Audience & Cadence -->
          <div class="control-group">
            <label class="section-label">4. Audience Scope</label>
            <div class="scope-radios">
              <label class="radio-label">
                <input
                  v-model="scopeFilter"
                  type="radio"
                  value="not_sent_this_month"
                  :disabled="campaignStatus === 'running'"
                />
                Not Reminded This Month ({{ allUnpaidGuests.filter((g) => !g.sentThisMonth).length }})
              </label>
              <label class="radio-label">
                <input
                  v-model="scopeFilter"
                  type="radio"
                  value="never_sent"
                  :disabled="campaignStatus === 'running'"
                />
                Never Reminded ({{ allUnpaidGuests.filter((g) => !g.asoebiSent).length }})
              </label>
              <label class="radio-label">
                <input
                  v-model="scopeFilter"
                  type="radio"
                  value="all"
                  :disabled="campaignStatus === 'running'"
                />
                All Unpaid Guests ({{ allUnpaidGuests.length }})
              </label>
            </div>
          </div>

          <div class="control-group">
            <label class="section-label">5. Pacing Interval</label>
            <div class="interval-box">
              <select v-model.number="intervalMinutes" class="select-interval" :disabled="campaignStatus === 'running'">
                <option :value="1">1 minute (Quick testing)</option>
                <option :value="3">3 minutes</option>
                <option :value="5">5 minutes (Default / Recommended)</option>
                <option :value="10">10 minutes</option>
                <option :value="15">15 minutes</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Status & Progress Dashboard -->
        <div class="campaign-dashboard">
          <div class="status-banner" :class="`status-${campaignStatus}`">
            <div class="status-left">
              <span class="status-indicator"></span>
              <span class="status-text">
                Status:
                <strong v-if="campaignStatus === 'idle'">Idle (Ready to Start)</strong>
                <strong v-else-if="campaignStatus === 'running'">Sending Reminders (Every {{ intervalMinutes }}m)</strong>
                <strong v-else-if="campaignStatus === 'paused'">Campaign Paused</strong>
                <strong v-else-if="campaignStatus === 'finished'">🎉 All Reminders Delivered!</strong>
              </span>
            </div>
            <div v-if="campaignStatus === 'running'" class="countdown-badge">
              Next send in: <strong>{{ formattedCountdown }}</strong>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="progress-container">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" :style="{ width: `${progressPercent}%` }"></div>
            </div>
            <div class="progress-info">
              <span>Progress: {{ currentIndex }} / {{ eligibleQueue.length }} guests processed</span>
              <span>{{ progressPercent }}%</span>
            </div>
          </div>

          <!-- Next Guest in Line Card -->
          <div v-if="currentGuest && campaignStatus !== 'finished'" class="next-guest-card">
            <div class="next-guest-details">
              <div class="next-guest-badge">Next in Queue</div>
              <h4 class="next-guest-name">{{ currentGuest.leadName }} ({{ currentGuest.leadPhone }})</h4>
              <p class="next-guest-order">
                {{ currentGuest.itemsSummary }} · <strong>₦{{ currentGuest.totalAmount.toLocaleString() }}</strong>
                <span v-if="currentGuest.asoebiSent" class="prev-sent-tag">
                  (Previously sent: {{ new Date(currentGuest.asoebiSentAt!).toLocaleDateString() }})
                </span>
              </p>
            </div>

            <div class="next-guest-actions">
              <button
                type="button"
                class="btn-send-now"
                @click="triggerNextNow"
                title="Send to this guest immediately without waiting out the timer"
              >
                Send Now ⚡
              </button>
              <button
                type="button"
                class="btn-skip"
                @click="skipCurrentGuest"
                title="Skip this guest and move to the next person"
              >
                Skip ⏭
              </button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons-row">
            <button
              v-if="campaignStatus !== 'running'"
              type="button"
              class="btn-start-campaign"
              :disabled="eligibleQueue.length === 0"
              @click="startCampaign"
            >
              {{ campaignStatus === 'paused' ? 'Resume Campaign ▶' : 'Start 5-Min Campaign 🚀' }}
            </button>

            <button
              v-if="campaignStatus === 'running'"
              type="button"
              class="btn-pause-campaign"
              @click="pauseCampaign"
            >
              Pause Campaign ⏸
            </button>

            <button
              v-if="campaignStatus !== 'idle'"
              type="button"
              class="btn-reset-campaign"
              @click="resetCampaign"
            >
              Reset ↺
            </button>
          </div>
        </div>

        <!-- Activity Feed / Live Log -->
        <div v-if="activityLog.length > 0" class="activity-log-section">
          <h5 class="log-title">Recent Activity Log (This Session)</h5>
          <div class="log-list">
            <div
              v-for="(item, idx) in activityLog"
              :key="idx"
              class="log-item"
              :class="`log-${item.status}`"
            >
              <span class="log-time">{{ item.time }}</span>
              <span class="log-guest"><strong>{{ item.guestName }}</strong> ({{ item.phone }})</span>
              <span class="log-status-pill" :class="`pill-${item.status}`">
                {{ item.status.toUpperCase() }}
              </span>
              <span class="log-notes">{{ item.notes }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.asoebi-campaign-card {
  background: #ffffff;
  border: 1px solid #e8dfe6;
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0;
  box-shadow: 0 4px 16px rgba(74, 55, 70, 0.05);
  font-family: inherit;
  color: #2b1c28;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #f0e6ed;
  padding-bottom: 14px;
  margin-bottom: 18px;
}

.header-title {
  margin: 0 0 4px 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #4a3746;
}

.header-subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: #7a6375;
}

.btn-refresh {
  background: #fdfafc;
  border: 1px solid #d4c5cf;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #5c354e;
  cursor: pointer;
  transition: all 150ms;
}

.btn-refresh:hover:not(:disabled) {
  background: #f3ebf1;
}

.alert-box {
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 0.85rem;
}

.error-alert {
  background: #fef0ef;
  border: 1px solid #f8c9c7;
  color: #b33934;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  color: #888;
  gap: 12px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #ebdbe5;
  border-top-color: #865172;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  background: #faf6f9;
  border: 1px solid #eedee8;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
}

.section-label {
  display: block;
  font-size: 0.825rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #5c354e;
  margin-bottom: 8px;
}

.session-picker-box {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.select-session {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #d4c5cf;
  background: #fff;
  font-size: 0.875rem;
  color: #2b1c28;
}

.session-badge {
  font-size: 0.775rem;
  padding: 4px 8px;
  border-radius: 6px;
  background: #e8dfe6;
  color: #5c354e;
}

.badge-primary {
  background: #25d36622;
  color: #17803d;
  border: 1px solid #25d36655;
}

.test-input-row {
  display: flex;
  gap: 8px;
}

.input-test-phone {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #d4c5cf;
  font-size: 0.875rem;
  background: #fff;
}

.btn-test {
  padding: 8px 14px;
  background: #4a3746;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms;
}

.btn-test:hover:not(:disabled) {
  background: #372834;
}

.btn-test:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.success-note {
  font-size: 0.8rem;
  color: #1eb556;
  margin: 4px 0 0 0;
  font-weight: 600;
}

.error-note {
  font-size: 0.8rem;
  color: #b33934;
  margin: 4px 0 0 0;
}

.help-text {
  font-size: 0.775rem;
  color: #887483;
  margin: 6px 0 0 0;
}

.editor-section {
  background: #fff;
  border: 1px solid #ebdbe5;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.btn-save-tpl {
  background: rgba(134, 81, 114, 0.1);
  border: 1px solid rgba(134, 81, 114, 0.3);
  color: #865172;
  padding: 4px 10px;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
}

.btn-save-tpl:hover:not(:disabled) {
  background: rgba(134, 81, 114, 0.2);
}

.chips-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.chips-label {
  font-size: 0.75rem;
  color: #887483;
  font-weight: 600;
}

.chip-btn {
  background: #f4ecf1;
  border: 1px solid #dec8d7;
  color: #643956;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: monospace;
  cursor: pointer;
}

.chip-btn:hover {
  background: #ebdbe5;
}

.tpl-textarea {
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 0.875rem;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d4c5cf;
  background: #fdfafc;
  color: #2b1c28;
  resize: vertical;
  outline: none;
  line-height: 1.45;
}

.preview-box {
  margin-top: 12px;
  border-top: 1px dashed #ebdbe5;
  padding-top: 12px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.preview-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #5c354e;
}

.select-preview-guest {
  font-size: 0.8rem;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #d4c5cf;
  background: #fff;
  max-width: 320px;
}

.preview-bubble {
  background: #eef8f2;
  border: 1px solid #cce8d5;
  border-radius: 8px;
  padding: 12px;
}

.preview-text {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 0.85rem;
  color: #174226;
  line-height: 1.45;
}

.controller-panel {
  background: #fcf9fb;
  border: 1px solid #ecdde7;
  border-radius: 10px;
  padding: 18px;
}

.controller-top {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.scope-radios {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.radio-label {
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.select-interval {
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #d4c5cf;
  background: #fff;
  font-size: 0.875rem;
}

.status-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 14px;
}

.status-idle {
  background: #f0edf0;
  color: #4a3746;
}

.status-running {
  background: #e7f8ee;
  color: #136631;
  border: 1px solid #b7e8c6;
}

.status-paused {
  background: #fef7e7;
  color: #925f09;
  border: 1px solid #f5dd9e;
}

.status-finished {
  background: #e8f3fc;
  color: #175a96;
  border: 1px solid #b3d7f5;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.status-running .status-indicator {
  animation: pulse 1.2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.7; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.7; }
}

.countdown-badge {
  font-size: 0.85rem;
  background: #fff;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.progress-container {
  margin-bottom: 14px;
}

.progress-bar-bg {
  height: 8px;
  background: #ebdbe5;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-bar-fill {
  height: 100%;
  background: #25d366;
  transition: width 300ms ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #7a6375;
}

.next-guest-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border: 1px solid #e5d6e1;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.next-guest-badge {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #865172;
  margin-bottom: 2px;
}

.next-guest-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #2b1c28;
}

.next-guest-order {
  margin: 2px 0 0 0;
  font-size: 0.825rem;
  color: #644f5f;
}

.prev-sent-tag {
  color: #925f09;
  font-weight: 600;
}

.next-guest-actions {
  display: flex;
  gap: 8px;
}

.btn-send-now {
  background: #25d366;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-send-now:hover:not(:disabled) {
  background: #1eb556;
}

.btn-skip {
  background: #fdfafc;
  border: 1px solid #d4c5cf;
  color: #5c354e;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
}

.action-buttons-row {
  display: flex;
  gap: 12px;
  margin-top: 14px;
}

.btn-start-campaign {
  background: #25d366;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(37, 211, 102, 0.3);
  transition: all 150ms;
}

.btn-start-campaign:hover:not(:disabled) {
  background: #1eb556;
}

.btn-pause-campaign {
  background: #d97706;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-reset-campaign {
  background: #fdfafc;
  border: 1px solid #d4c5cf;
  color: #5c354e;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}

.activity-log-section {
  margin-top: 18px;
  border-top: 1px solid #ebdbe5;
  padding-top: 14px;
}

.log-title {
  font-size: 0.825rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #5c354e;
  margin: 0 0 10px 0;
}

.log-list {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #fff;
  font-size: 0.8rem;
  border: 1px solid #ebdbe5;
}

.log-time {
  color: #887483;
  font-family: monospace;
}

.log-guest {
  color: #2b1c28;
}

.log-status-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.pill-success {
  background: #e7f8ee;
  color: #17803d;
}

.pill-failed {
  background: #fee2e2;
  color: #b91c1c;
}

.pill-skipped {
  background: #f3f4f6;
  color: #4b5563;
}

.log-notes {
  color: #6b7280;
  margin-left: auto;
}
</style>
