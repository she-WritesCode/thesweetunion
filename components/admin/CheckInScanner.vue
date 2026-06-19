<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { adminAuthHeaders } from "~/utils/admin-auth";

const props = defineProps<{
  value?: any;
  onChange?: (...args: any[]) => void;
  field?: Record<string, any>;
  path?: string;
  disabled?: boolean;
  collection?: string;
  context?: {
    user?: Record<string, unknown> | null;
    schemas?: Record<string, unknown>;
    siblingData?: Record<string, unknown>;
  };
}>();

// ── State ────────────────────────────────────────────────────────────────────

type Step = "pick-event" | "scanning" | "confirmed";
type ScanState = "idle" | "scanning" | "loading" | "success" | "duplicate" | "error";

const step = ref<Step>("pick-event");
const scanState = ref<ScanState>("idle");
const scannerMode = ref<"camera" | "manual">("camera");
const manualInput = ref("");
const selectedEvent = ref<{ id: string; name: string } | null>(null);
const scannedBy = ref("");
const lastResult = ref<any>(null);
const errorMessage = ref("");
const stats = ref({ totalExpected: 0, totalCheckedIn: 0, percentage: 0 });
const events = ref<any[]>([]);
const scannerInstance = ref<any>(null);
const cameraError = ref("");

// ── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  const user = props.context?.user;
  if (user) {
    scannedBy.value = (user.name || user.email || user.username || "") as string;
  }
  await Promise.all([fetchStats(), fetchEvents()]);

  // Restore previously selected event — skip step 1 if still valid
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const ev = JSON.parse(stored) as { id: string; name: string };
      // Verify the event still exists in the fetched list
      if (events.value.some((e) => e.id === ev.id)) {
        selectedEvent.value = ev;
        step.value = "scanning";
      } else {
        localStorage.removeItem(LS_KEY);
      }
    }
  } catch {}
});

onUnmounted(() => {
  stopCamera();
});

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchStats() {
  try {
    const data = await $fetch<any>("/api/check-in/stats", { headers: adminAuthHeaders() });
    stats.value = data;
  } catch {}
}

async function fetchEvents() {
  try {
    const data = await $fetch<any>("/api/dyrected/api/collections/events?limit=10");
    events.value = data?.docs || [];
  } catch {}
}

// ── Step 1 — Event selection ──────────────────────────────────────────────────

const LS_KEY = "checkin_selected_event";

function selectEvent(ev: { id: string; name: string }) {
  selectedEvent.value = ev;
  localStorage.setItem(LS_KEY, JSON.stringify(ev));
  step.value = "scanning";
}

function changeEvent() {
  stopCamera();
  scanState.value = "idle";
  lastResult.value = null;
  errorMessage.value = "";
  localStorage.removeItem(LS_KEY);
  step.value = "pick-event";
}

// ── Step 2 — Scanner ──────────────────────────────────────────────────────────

async function startCamera() {
  scanState.value = "scanning";
  cameraError.value = "";
  await nextTick();
  try {
    const { Html5QrcodeScanner } = await import("html5-qrcode");
    scannerInstance.value = new Html5QrcodeScanner(
      "checkin-qr-reader",
      { fps: 10, qrbox: { width: 240, height: 240 }, rememberLastUsedCamera: true },
      false,
    );
    scannerInstance.value.render(
      (code: string) => handleScanResult(code),
      (_err: any) => {},
    );
  } catch {
    cameraError.value = "Camera unavailable. Use manual entry below.";
    scanState.value = "idle";
  }
}

function stopCamera() {
  if (scannerInstance.value) {
    try {
      scannerInstance.value.clear();
    } catch {}
    scannerInstance.value = null;
  }
}

function switchToManual() {
  stopCamera();
  scannerMode.value = "manual";
  scanState.value = "idle";
}

function switchToCamera() {
  scannerMode.value = "camera";
  scanState.value = "idle";
}

async function handleManualSubmit() {
  const code = manualInput.value.trim().toLowerCase();
  if (!code) return;
  await handleScanResult(code);
}

async function handleScanResult(rsvpRecordId: string) {
  stopCamera();
  scanState.value = "loading";
  errorMessage.value = "";
  try {
    const data = await $fetch<any>("/api/check-in/scan", {
      method: "POST",
      headers: adminAuthHeaders(),
      body: {
        rsvpRecordId,
        eventId: selectedEvent.value?.id || undefined,
        scannedBy: scannedBy.value || undefined,
      },
    });
    lastResult.value = data;
    scanState.value = "idle";
    manualInput.value = "";
    await fetchStats();
    if (props.onChange) props.onChange({ checkInId: data.checkIn?.id });
    step.value = "confirmed";
  } catch (err: any) {
    const status = err?.response?.status || err?.statusCode;
    if (status === 409) {
      scanState.value = "duplicate";
      errorMessage.value = err?.data?.message || err.message;
      lastResult.value = { guest: { name: err?.data?.data?.guestName } };
    } else {
      scanState.value = "error";
      errorMessage.value = err?.data?.message || err.message || "Scan failed. Please try again.";
    }
  }
}

function resetScanner() {
  scanState.value = "idle";
  lastResult.value = null;
  errorMessage.value = "";
  manualInput.value = "";
}

function nextGuest() {
  resetScanner();
  step.value = "scanning";
}

const progressBarWidth = computed(() => `${Math.min(stats.value.percentage, 100)}%`);
</script>

<template>
  <div class="ci-scanner">
    <!-- ── Stats Bar (always visible) ───────────────────────────────── -->
    <div class="ci-stats">
      <div class="ci-stats__label">
        Checked in:
        <strong>{{ stats.totalCheckedIn }}</strong> / <strong>{{ stats.totalExpected }}</strong> guests
        <span class="ci-stats__pct">({{ stats.percentage }}%)</span>
      </div>
      <div class="ci-stats__bar-track">
        <div class="ci-stats__bar-fill" :style="{ width: progressBarWidth }" />
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════
         STEP 1 — Pick Event
    ════════════════════════════════════════════════════════════════ -->
    <template v-if="step === 'pick-event'">
      <div class="ci-step-header">
        <p class="ci-step-title">Which event are you checking in for?</p>
        <p class="ci-step-sub">Choose before scanning. This locks the scanner to one event.</p>
      </div>

      <div v-if="events.length" class="ci-event-grid">
        <button v-for="ev in events" :key="ev.id" type="button" class="ci-event-card" @click="selectEvent(ev)">
          <span class="ci-event-card__name">{{ ev.name }}</span>
          <span class="ci-event-card__arrow">→</span>
        </button>
      </div>
      <p v-else class="ci-muted">Loading events…</p>

      <!-- Scanned by — set here so it persists into step 2 -->
      <div class="ci-scanned-by">
        <label class="ci-label">Scanned by</label>
        <input v-model="scannedBy" class="ci-input" placeholder="Your name" />
      </div>
    </template>

    <!-- ════════════════════════════════════════════════════════════════
         STEP 2 — Scanner
    ════════════════════════════════════════════════════════════════ -->
    <template v-else-if="step === 'scanning'">
      <!-- Active event banner -->
      <div class="ci-event-banner">
        <div class="ci-event-banner__info">
          <span class="ci-event-banner__label">Scanning for</span>
          <span class="ci-event-banner__name">{{ selectedEvent?.name }}</span>
        </div>
        <button type="button" class="ci-btn ci-btn--ghost-light ci-btn--sm" @click="changeEvent">Change</button>
      </div>

      <!-- Mode toggle -->
      <div class="ci-mode-toggle">
        <button type="button" :class="['ci-tab', scannerMode === 'camera' && 'ci-tab--active']" @click="switchToCamera">
          Camera
        </button>
        <button type="button" :class="['ci-tab', scannerMode === 'manual' && 'ci-tab--active']" @click="switchToManual">
          Manual Entry
        </button>
      </div>

      <!-- Camera -->
      <template v-if="scannerMode === 'camera'">
        <div v-if="scanState === 'idle'" class="ci-camera-prompt">
          <button type="button" class="ci-btn ci-btn--primary" @click="startCamera">Activate Camera</button>
          <p v-if="cameraError" class="ci-error-text">{{ cameraError }}</p>
        </div>
        <div v-show="scanState === 'scanning'" id="checkin-qr-reader" class="ci-camera-view" />
      </template>

      <!-- Manual -->
      <template v-if="scannerMode === 'manual'">
        <div class="ci-manual">
          <label class="ci-label">Enter or paste QR code value</label>
          <div class="ci-manual__row">
            <input
              v-model="manualInput"
              class="ci-input ci-input--mono"
              placeholder="Paste rsvp_record_id here…"
              @keydown.enter="handleManualSubmit"
            />
            <button
              type="button"
              class="ci-btn ci-btn--primary"
              :disabled="!manualInput.trim() || scanState === 'loading'"
              @click="handleManualSubmit"
            >
              Check In
            </button>
          </div>
        </div>
      </template>

      <!-- Loading -->
      <div v-if="scanState === 'loading'" class="ci-status ci-status--loading">Looking up guest…</div>

      <!-- Duplicate -->
      <div v-if="scanState === 'duplicate'" class="ci-status ci-status--warning">
        <div class="ci-status__icon">!</div>
        <div class="ci-status__body">
          <p class="ci-status__headline">Already checked in</p>
          <p class="ci-status__detail">{{ errorMessage }}</p>
        </div>
        <button type="button" class="ci-btn ci-btn--ghost" @click="resetScanner">Next guest</button>
      </div>

      <!-- Error -->
      <div v-if="scanState === 'error'" class="ci-status ci-status--error">
        <div class="ci-status__icon">✕</div>
        <div class="ci-status__body">
          <p class="ci-status__headline">Check-in failed</p>
          <p class="ci-status__detail">{{ errorMessage }}</p>
        </div>
        <button type="button" class="ci-btn ci-btn--ghost" @click="resetScanner">Try again</button>
      </div>
    </template>

    <!-- ════════════════════════════════════════════════════════════════
         STEP 3 — Confirmed
    ════════════════════════════════════════════════════════════════ -->
    <template v-if="step === 'confirmed' && lastResult">
      <div class="ci-event-banner">
        <div class="ci-event-banner__info">
          <span class="ci-event-banner__label">Scanning for</span>
          <span class="ci-event-banner__name">{{ selectedEvent?.name }}</span>
        </div>
      </div>

      <div class="ci-confirmed">
        <div class="ci-confirmed__check">✓</div>

        <div class="ci-confirmed__names">
          <p class="ci-confirmed__lead">{{ lastResult.guest.leadName }}</p>
          <div v-if="lastResult.guest.hasSpouse && lastResult.guest.spouseName" class="ci-confirmed__plus">
            <span class="ci-confirmed__plus-icon">+</span>
            <p class="ci-confirmed__spouse">{{ lastResult.guest.spouseName }}</p>
          </div>
        </div>

        <div class="ci-confirmed__badges">
          <span v-if="lastResult.guest.hasSpouse" class="ci-badge ci-badge--seats">
            Admits 2 &nbsp;·&nbsp; 2 seats
          </span>
          <span v-else class="ci-badge ci-badge--solo"> Admits 1 &nbsp;·&nbsp; 1 seat </span>
          <span v-if="lastResult.guest.groupName" class="ci-badge ci-badge--group">
            {{ lastResult.guest.groupName }}
          </span>
        </div>

        <button type="button" class="ci-btn ci-btn--primary ci-btn--full" @click="nextGuest">Next guest →</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ci-scanner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0 16px;
}

/* ── Stats ─────────────────────────────────────────────────────────── */
.ci-stats {
  background: #f5f0ee;
  border: 1px solid #e5ddd8;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ci-stats__label {
  font-size: 0.875rem;
  color: #30222a;
}
.ci-stats__pct {
  color: #9a7b8e;
  margin-left: 4px;
}
.ci-stats__bar-track {
  height: 8px;
  border-radius: 4px;
  background: #e5ddd8;
  overflow: hidden;
}
.ci-stats__bar-fill {
  height: 100%;
  background: #8A627C;
  border-radius: 4px;
  transition: width 0.4s ease;
}

/* ── Step 1 ────────────────────────────────────────────────────────── */
.ci-step-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ci-step-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #30222a;
}
.ci-step-sub {
  margin: 0;
  font-size: 0.8rem;
  color: #9a7b8e;
}

.ci-event-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ci-event-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #fff;
  border: 1.5px solid #d5cac6;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 150ms,
    background 150ms;
}
.ci-event-card:hover {
  border-color: #8A627C;
  background: #fdf8f6;
}
.ci-event-card__name {
  font-size: 1rem;
  font-weight: 600;
  color: #30222a;
}
.ci-event-card__arrow {
  font-size: 1.1rem;
  color: #8A627C;
}

.ci-scanned-by {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 4px;
  border-top: 1px solid #e5ddd8;
}

/* ── Step 2 ────────────────────────────────────────────────────────── */
.ci-event-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #30222a;
  border-radius: 8px;
  color: #fff;
}
.ci-event-banner__info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.ci-event-banner__label {
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #b5a0a8;
}
.ci-event-banner__name {
  font-size: 0.95rem;
  font-weight: 600;
}

/* ── Shared ────────────────────────────────────────────────────────── */
.ci-muted {
  font-size: 0.85rem;
  color: #9a7b8e;
  font-style: italic;
  margin: 0;
}

.ci-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b5060;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ci-input {
  padding: 7px 10px;
  border: 1px solid #d5cac6;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #30222a;
  background: #fff;
  outline: none;
  transition: border-color 150ms;
}
.ci-input:focus {
  border-color: #8A627C;
}
.ci-input--mono {
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
}

.ci-mode-toggle {
  display: flex;
  border: 1px solid #d5cac6;
  border-radius: 8px;
  overflow: hidden;
  width: fit-content;
}
.ci-tab {
  padding: 7px 20px;
  font-size: 0.85rem;
  font-weight: 500;
  background: #fff;
  color: #6b5060;
  border: none;
  cursor: pointer;
  transition:
    background 150ms,
    color 150ms;
}
.ci-tab + .ci-tab {
  border-left: 1px solid #d5cac6;
}
.ci-tab--active {
  background: #30222a;
  color: #fff;
}

.ci-camera-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  border: 2px dashed #d5cac6;
  border-radius: 10px;
  text-align: center;
}
.ci-camera-view {
  border-radius: 10px;
  overflow: hidden;
}

.ci-manual {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ci-manual__row {
  display: flex;
  gap: 8px;
}
.ci-manual__row .ci-input {
  flex: 1;
}

.ci-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    background 150ms,
    opacity 150ms;
  white-space: nowrap;
}
.ci-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ci-btn--primary {
  background: #8A627C;
  color: #fff;
  border-color: #8A627C;
}
.ci-btn--primary:hover:not(:disabled) {
  background: #6e4f63;
}
.ci-btn--ghost {
  background: transparent;
  border-color: #d5cac6;
  color: #30222a;
  flex-shrink: 0;
}
.ci-btn--ghost:hover {
  background: #f5f0ee;
}

.ci-btn--ghost-light {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.35);
  color: #fff;
  flex-shrink: 0;
}
.ci-btn--ghost-light:hover {
  background: rgba(255, 255, 255, 0.12);
}
.ci-btn--sm {
  padding: 5px 12px;
  font-size: 0.78rem;
}

.ci-status {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 10px;
  border: 1px solid;
}
.ci-status--loading {
  border-color: #d5cac6;
  background: #faf7f5;
  color: #6b5060;
  font-style: italic;
  font-size: 0.9rem;
}
.ci-status--success {
  border-color: #7aad86;
  background: #edf7ee;
}
.ci-status--warning {
  border-color: #d4a020;
  background: #fdf8ec;
}
.ci-status--error {
  border-color: #c0514a;
  background: #fdf0ef;
}

.ci-status__icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  flex-shrink: 0;
}
.ci-status--success .ci-status__icon {
  background: #7aad86;
  color: #fff;
}
.ci-status--warning .ci-status__icon {
  background: #d4a020;
  color: #fff;
}
.ci-status--error .ci-status__icon {
  background: #c0514a;
  color: #fff;
}

.ci-status__body {
  flex: 1;
}
.ci-status__headline {
  margin: 0 0 2px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #30222a;
}
.ci-status__detail {
  margin: 0;
  font-size: 0.83rem;
  color: #6b5060;
}

.ci-error-text {
  font-size: 0.82rem;
  color: #c0514a;
  margin: 0;
}

/* ── Step 3 — Confirmed ────────────────────────────────────────────── */
.ci-confirmed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 28px 20px;
  background: #edf7ee;
  border: 1.5px solid #7aad86;
  border-radius: 12px;
  text-align: center;
}
.ci-confirmed__check {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #7aad86;
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ci-confirmed__names {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.ci-confirmed__lead {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: #30222a;
}
.ci-confirmed__plus {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ci-confirmed__plus-icon {
  font-size: 1.1rem;
  font-weight: 700;
  color: #7aad86;
}
.ci-confirmed__spouse {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
  color: #30222a;
}
.ci-confirmed__badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.ci-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.ci-badge--seats {
  background: #30222a;
  color: #fff;
}
.ci-badge--solo {
  background: #f5f0ee;
  color: #6b5060;
  border: 1px solid #d5cac6;
}
.ci-badge--group {
  background: #f3edeb;
  color: #8a627c;
  border: 1px solid #d9c9c4;
}
.ci-btn--full {
  width: 100%;
  justify-content: center;
}
</style>
