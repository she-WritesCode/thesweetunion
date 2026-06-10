<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";

/**
 * Props passed by Dyrected's field-renderer. This component is registered as
 * "check_ins.checkInScanner" and renders inside the check_ins collection create
 * form. All check-in logic happens via the /api/check-in/scan endpoint — staff
 * do not need to click the form's Save button; the API creates the record directly.
 */
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

type ScanState = "idle" | "scanning" | "loading" | "success" | "duplicate" | "error";

const scanState = ref<ScanState>("idle");
const scannerMode = ref<"camera" | "manual">("camera");
const manualInput = ref("");
const selectedEventId = ref<string>("");
const scannedBy = ref("");
const lastResult = ref<any>(null);
const errorMessage = ref("");
const stats = ref({ totalExpected: 0, totalCheckedIn: 0, percentage: 0 });
const events = ref<any[]>([]);
const scannerInstance = ref<any>(null);
const cameraError = ref("");

// ── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  await fetchStats();
  await fetchEvents();
});

onUnmounted(() => {
  stopCamera();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchStats() {
  try {
    const data = await $fetch<any>("/api/check-in/stats");
    stats.value = data;
  } catch {}
}

async function fetchEvents() {
  try {
    const data = await $fetch<any>("/api/dyrected/events?limit=10");
    events.value = data?.docs || [];
  } catch {}
}

async function startCamera() {
  scanState.value = "scanning";
  cameraError.value = "";

  await nextTick();

  try {
    const { Html5QrcodeScanner } = await import("html5-qrcode");
    scannerInstance.value = new Html5QrcodeScanner(
      "checkin-qr-reader",
      { fps: 10, qrbox: { width: 240, height: 240 }, rememberLastUsedCamera: true },
      false
    );
    scannerInstance.value.render(
      (code: string) => handleScanResult(code),
      (_err: any) => {} // suppress per-frame decode errors
    );
  } catch (err: any) {
    cameraError.value = "Camera unavailable. Please use manual entry below.";
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
  const code = manualInput.value.trim();
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
      body: {
        rsvpRecordId,
        eventId: selectedEventId.value || undefined,
        scannedBy: scannedBy.value || undefined,
      },
    });

    lastResult.value = data;
    scanState.value = "success";
    manualInput.value = "";
    await fetchStats();

    // Populate form fields via onChange so the record pre-fills if staff click Save
    if (props.onChange) {
      props.onChange({ checkInId: data.checkIn?.id });
    }
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

const progressBarWidth = computed(() =>
  `${Math.min(stats.value.percentage, 100)}%`
);

// nextTick import for Vue
import { nextTick } from "vue";
</script>

<template>
  <div class="ci-scanner">

    <!-- ── Stats Bar ───────────────────────────────────────────────── -->
    <div class="ci-stats">
      <div class="ci-stats__label">
        Checked in:
        <strong>{{ stats.totalCheckedIn }}</strong> /
        <strong>{{ stats.totalExpected }}</strong> guests
        <span class="ci-stats__pct">({{ stats.percentage }}%)</span>
      </div>
      <div class="ci-stats__bar-track">
        <div class="ci-stats__bar-fill" :style="{ width: progressBarWidth }" />
      </div>
    </div>

    <!-- ── Config Row ──────────────────────────────────────────────── -->
    <div class="ci-config">
      <div class="ci-config__field">
        <label class="ci-label">Event</label>
        <select v-model="selectedEventId" class="ci-select">
          <option value="">— All events —</option>
          <option v-for="ev in events" :key="ev.id" :value="ev.id">{{ ev.name }}</option>
        </select>
      </div>
      <div class="ci-config__field">
        <label class="ci-label">Scanned by</label>
        <input v-model="scannedBy" class="ci-input" placeholder="Staff name (optional)" />
      </div>
    </div>

    <!-- ── Mode Toggle ─────────────────────────────────────────────── -->
    <div class="ci-mode-toggle">
      <button
        type="button"
        :class="['ci-tab', scannerMode === 'camera' && 'ci-tab--active']"
        @click="switchToCamera"
      >Camera</button>
      <button
        type="button"
        :class="['ci-tab', scannerMode === 'manual' && 'ci-tab--active']"
        @click="switchToManual"
      >Manual Entry</button>
    </div>

    <!-- ── Camera Scanner ─────────────────────────────────────────── -->
    <template v-if="scannerMode === 'camera'">
      <template v-if="scanState === 'idle'">
        <div class="ci-camera-prompt">
          <button type="button" class="ci-btn ci-btn--primary" @click="startCamera">
            Activate Camera Scanner
          </button>
          <p v-if="cameraError" class="ci-error-text">{{ cameraError }}</p>
        </div>
      </template>

      <div
        v-show="scanState === 'scanning'"
        id="checkin-qr-reader"
        class="ci-camera-view"
      />
    </template>

    <!-- ── Manual Entry ───────────────────────────────────────────── -->
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
          >Check In</button>
        </div>
      </div>
    </template>

    <!-- ── Loading ────────────────────────────────────────────────── -->
    <div v-if="scanState === 'loading'" class="ci-status ci-status--loading">
      Looking up guest…
    </div>

    <!-- ── Success ────────────────────────────────────────────────── -->
    <div v-if="scanState === 'success'" class="ci-status ci-status--success">
      <div class="ci-status__icon">✓</div>
      <div class="ci-status__body">
        <p class="ci-status__headline">{{ lastResult?.welcomeMessage }}</p>
        <p class="ci-status__detail">
          Party of {{ lastResult?.guest?.partySize }}
          <template v-if="lastResult?.guest?.tableLabel">
            · {{ lastResult?.guest?.tableLabel }}
          </template>
        </p>
      </div>
      <button type="button" class="ci-btn ci-btn--ghost" @click="resetScanner">
        Scan next guest
      </button>
    </div>

    <!-- ── Duplicate ──────────────────────────────────────────────── -->
    <div v-if="scanState === 'duplicate'" class="ci-status ci-status--warning">
      <div class="ci-status__icon">!</div>
      <div class="ci-status__body">
        <p class="ci-status__headline">Already checked in</p>
        <p class="ci-status__detail">{{ errorMessage }}</p>
      </div>
      <button type="button" class="ci-btn ci-btn--ghost" @click="resetScanner">
        Scan next guest
      </button>
    </div>

    <!-- ── Error ──────────────────────────────────────────────────── -->
    <div v-if="scanState === 'error'" class="ci-status ci-status--error">
      <div class="ci-status__icon">✕</div>
      <div class="ci-status__body">
        <p class="ci-status__headline">Check-in failed</p>
        <p class="ci-status__detail">{{ errorMessage }}</p>
      </div>
      <button type="button" class="ci-btn ci-btn--ghost" @click="resetScanner">
        Try again
      </button>
    </div>

  </div>
</template>

<style scoped>
.ci-scanner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0 16px;
}

/* Stats */
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
  background: #b54e24;
  border-radius: 4px;
  transition: width 0.4s ease;
}

/* Config */
.ci-config {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.ci-config__field {
  flex: 1;
  min-width: 160px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Labels, inputs, selects */
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
.ci-input:focus { border-color: #b54e24; }
.ci-input--mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
.ci-select {
  padding: 7px 10px;
  border: 1px solid #d5cac6;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #30222a;
  background: #fff;
  outline: none;
}

/* Mode toggle */
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
  transition: background 150ms, color 150ms;
}
.ci-tab + .ci-tab { border-left: 1px solid #d5cac6; }
.ci-tab--active { background: #30222a; color: #fff; }

/* Camera prompt */
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

/* Manual entry */
.ci-manual {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ci-manual__row {
  display: flex;
  gap: 8px;
}
.ci-manual__row .ci-input { flex: 1; }

/* Buttons */
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
  transition: background 150ms, opacity 150ms;
  white-space: nowrap;
}
.ci-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ci-btn--primary { background: #b54e24; color: #fff; border-color: #b54e24; }
.ci-btn--primary:hover:not(:disabled) { background: #a04520; }
.ci-btn--ghost {
  background: transparent;
  border-color: #d5cac6;
  color: #30222a;
  flex-shrink: 0;
}
.ci-btn--ghost:hover { background: #f5f0ee; }

/* Status panels */
.ci-status {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 10px;
  border: 1px solid;
}
.ci-status--loading { border-color: #d5cac6; background: #faf7f5; color: #6b5060; font-style: italic; font-size: 0.9rem; }
.ci-status--success { border-color: #7aad86; background: #edf7ee; }
.ci-status--warning { border-color: #d4a020; background: #fdf8ec; }
.ci-status--error   { border-color: #c0514a; background: #fdf0ef; }

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
.ci-status--success .ci-status__icon { background: #7aad86; color: #fff; }
.ci-status--warning .ci-status__icon { background: #d4a020; color: #fff; }
.ci-status--error   .ci-status__icon { background: #c0514a; color: #fff; }

.ci-status__body { flex: 1; }
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
</style>
