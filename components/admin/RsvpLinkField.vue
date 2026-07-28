<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRuntimeConfig } from "#imports";
import QRCode from "qrcode";

/**
 * Props passed by Dyrected's field-renderer.tsx:
 *   value     — current stored value (null for a virtual field)
 *   onChange  — no-op for a readOnly field, but always available
 *   field     — the field schema object
 *   path      — dot-path of the field in the form
 *   disabled  — true when the field is readOnly
 *   collection — slug of the parent collection
 *   context    — { user, schemas, siblingData }
 */
const props = defineProps<{
  value?: string | null;
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

const config = useRuntimeConfig();
const appUrl = computed(() => (typeof window !== "undefined" ? window.location.origin : config.public.appUrl));

/** The RSVP URL is: <appUrl>/rsvp?group=<slug> */
const slug = computed(() => props.context?.siblingData?.slug as string | undefined);
const groupName = computed(() => (props.context?.siblingData?.name as string) || "RSVP Group");

const rsvpUrl = computed(() => {
  if (!slug.value) return null;
  return `${appUrl.value}/rsvp?group=${slug.value}`;
});

const linkCopied = ref(false);
const qrCopied = ref(false);
const qrDataUrl = ref<string>("");

// Generate Mauve (#865172) QR Code whenever rsvpUrl changes
watch(
  rsvpUrl,
  async (url) => {
    if (!url) {
      qrDataUrl.value = "";
      return;
    }
    try {
      qrDataUrl.value = await QRCode.toDataURL(url, {
        color: {
          dark: "#865172",  // Mauve primary color
          light: "#FFFFFF", // Clean white background
        },
        margin: 2,
        width: 320,
      });
    } catch (err) {
      console.error("Failed to generate Mauve QR code:", err);
    }
  },
  { immediate: true }
);

async function copyLink() {
  if (!rsvpUrl.value) return;
  try {
    await navigator.clipboard.writeText(rsvpUrl.value);
    linkCopied.value = true;
    setTimeout(() => {
      linkCopied.value = false;
    }, 2000);
  } catch {
    const el = document.createElement("input");
    el.value = rsvpUrl.value;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    linkCopied.value = true;
    setTimeout(() => {
      linkCopied.value = false;
    }, 2000);
  }
}

async function copyQrCode() {
  if (!qrDataUrl.value) return;
  try {
    const res = await fetch(qrDataUrl.value);
    const blob = await res.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ]);
    qrCopied.value = true;
    setTimeout(() => {
      qrCopied.value = false;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy QR code image to clipboard:", err);
  }
}

function downloadQrCode() {
  if (!qrDataUrl.value) return;
  const link = document.createElement("a");
  link.href = qrDataUrl.value;
  link.download = `rsvp-qr-${slug.value || "group"}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<template>
  <div class="rsvp-link-field">
    <p v-if="!slug" class="rsvp-link-field__empty">Save the group first to generate the RSVP link &amp; QR Code.</p>

    <template v-else>
      <!-- Link display & copy -->
      <div class="rsvp-link-field__row">
        <span class="rsvp-link-field__url" :title="rsvpUrl ?? ''">{{ rsvpUrl }}</span>

        <button
          type="button"
          class="rsvp-link-field__btn"
          :class="{ 'rsvp-link-field__btn--copied': linkCopied }"
          @click="copyLink"
          :aria-label="linkCopied ? 'Copied!' : 'Copy RSVP link'"
        >
          <svg
            v-if="!linkCopied"
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{{ linkCopied ? "Copied!" : "Copy Link" }}</span>
        </button>
      </div>

      <!-- Mauve QR Code Card -->
      <div class="rsvp-qr-card">
        <div class="rsvp-qr-card__preview">
          <img v-if="qrDataUrl" :src="qrDataUrl" :alt="`RSVP QR Code for ${groupName}`" class="rsvp-qr-card__img" />
          <div v-else class="rsvp-qr-card__loading">Generating QR Code...</div>
        </div>

        <div class="rsvp-qr-card__actions">
          <div class="rsvp-qr-card__meta">
            <span class="rsvp-qr-card__badge">Mauve QR Code</span>
            <span class="rsvp-qr-card__sub">Scan to open RSVP page</span>
          </div>

          <div class="rsvp-qr-card__btns">
            <button
              type="button"
              class="rsvp-link-field__btn rsvp-link-field__btn--mauve"
              :class="{ 'rsvp-link-field__btn--copied': qrCopied }"
              @click="copyQrCode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{{ qrCopied ? "QR Copied!" : "Copy QR Image" }}</span>
            </button>

            <button
              type="button"
              class="rsvp-link-field__btn rsvp-link-field__btn--download"
              @click="downloadQrCode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download QR</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.rsvp-link-field {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

.rsvp-link-field__empty {
  font-size: 0.85rem;
  color: #888;
  font-style: italic;
}

.rsvp-link-field__row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #faf7f5;
  border: 1px solid #d9c9c4;
  border-radius: 8px;
  padding: 8px 12px;
}

.rsvp-link-field__url {
  flex: 1;
  font-family: ui-monospace, "Cascadia Code", monospace;
  font-size: 0.82rem;
  color: #462137;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rsvp-qr-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  background: #ffffff;
  border: 1px solid #e0d0ca;
  border-radius: 10px;
  padding: 14px 16px;
  box-shadow: 0 2px 6px rgba(134, 81, 114, 0.05);
}

.rsvp-qr-card__preview {
  width: 110px;
  height: 110px;
  border-radius: 8px;
  border: 2px solid #865172;
  overflow: hidden;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rsvp-qr-card__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.rsvp-qr-card__loading {
  font-size: 0.75rem;
  color: #865172;
  text-align: center;
  padding: 8px;
}

.rsvp-qr-card__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 200px;
}

.rsvp-qr-card__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rsvp-qr-card__badge {
  font-size: 0.85rem;
  font-weight: 700;
  color: #865172;
  letter-spacing: 0.3px;
}

.rsvp-qr-card__sub {
  font-size: 0.78rem;
  color: #666;
}

.rsvp-qr-card__btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rsvp-link-field__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 7px 14px;
  border: 1px solid #865172;
  border-radius: 6px;
  background: #ffffff;
  color: #865172;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
  line-height: 1;
}

.rsvp-link-field__btn:hover {
  background: #faf0f6;
  border-color: #6b3f5b;
  color: #6b3f5b;
}

.rsvp-link-field__btn--mauve {
  background: #865172;
  color: #ffffff;
  border-color: #865172;
}

.rsvp-link-field__btn--mauve:hover {
  background: #70415f;
  border-color: #70415f;
  color: #ffffff;
}

.rsvp-link-field__btn--download {
  background: #faf7f5;
  color: #462137;
  border-color: #d9c9c4;
}

.rsvp-link-field__btn--download:hover {
  background: #f0e6e2;
  border-color: #865172;
  color: #865172;
}

.rsvp-link-field__btn--copied {
  background: #edf7ee !important;
  border-color: #5a9e6f !important;
  color: #2d7a47 !important;
}
</style>
