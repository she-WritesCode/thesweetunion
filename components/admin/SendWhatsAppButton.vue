<script setup lang="ts">
import { ref, computed } from "vue";

/**
 * Renders a "Send WhatsApp" button inside the rsvp_records detail view.
 * Registered as "rsvp_records.sendWhatsApp".
 *
 * On click:
 *   1. Calls /api/invitations/send-single/[rsvpId] to mark the record as sent
 *      and receive a wa.me URL.
 *   2. Opens the wa.me URL in a new tab — staff completes the send manually
 *      in WhatsApp. (Full Business API can be wired in later.)
 *   3. Updates the button to "Sent ✓" state.
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

const sending = ref(false);
const error = ref("");

// id is not in siblingData — read from hash (/admin#/collections/rsvp_records/<id>)
const rsvpId = computed(() => {
  const segments = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const id = segments.at(-1);
  return id && id !== "create" ? id : undefined;
});
const leadName = computed(() => (props.context?.siblingData?.leadName as string) ?? "");
const leadPhone = computed(() => (props.context?.siblingData?.leadPhone as string) ?? "");
const attending = computed(() => (props.context?.siblingData?.attending as boolean) ?? false);
const invitationSent = computed(() => (props.context?.siblingData?.invitationSent as boolean) ?? false);
const invitationSentAt = computed(() => (props.context?.siblingData?.invitationSentAt as string) ?? "");
const invitationSentVia = computed(() => (props.context?.siblingData?.invitationSentVia as string) ?? "");

const sentLabel = computed(() => {
  if (!invitationSent.value) return null;
  const time = invitationSentAt.value
    ? new Date(invitationSentAt.value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return `Sent via ${invitationSentVia.value || "WhatsApp"}${time ? ` · ${time}` : ""}`;
});

async function send() {
  if (!rsvpId.value || sending.value) return;
  sending.value = true;
  error.value = "";

  try {
    const data = await $fetch<any>(`/api/invitations/send-single/${rsvpId.value}`, {
      method: "POST",
    });

    // Open WhatsApp in a new tab
    if (data.waUrl) {
      window.open(data.waUrl, "_blank", "noopener,noreferrer");
    }

    // Notify Dyrected to refresh this record's field values
    if (props.onChange) {
      props.onChange({ invitationSent: true });
    }
  } catch (err: any) {
    error.value = err?.data?.message || err.message || "Failed to send. Please try again.";
  } finally {
    sending.value = false;
  }
}

async function resend() {
  await send();
}
</script>

<template>
  <div class="swb">
    <p v-if="!rsvpId" class="swb__empty">Save this record first.</p>

    <template v-else-if="!attending">
      <p class="swb__declined">Guest has declined — no invitation needed.</p>
    </template>

    <template v-else>
      <!-- Already sent state -->
      <template v-if="invitationSent">
        <div class="swb__sent-row">
          <span class="swb__sent-badge">✓ {{ sentLabel }}</span>
          <button type="button" class="swb__btn swb__btn--ghost" @click="resend" :disabled="sending">Resend</button>
        </div>
      </template>

      <!-- Not yet sent state -->
      <template v-else>
        <div class="swb__row">
          <button type="button" class="swb__btn swb__btn--wa" :disabled="!leadPhone || sending" @click="send">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
              />
            </svg>
            {{ sending ? "Opening WhatsApp…" : "Send via WhatsApp" }}
          </button>
          <p v-if="!leadPhone" class="swb__no-phone">No phone number on record.</p>
        </div>
      </template>

      <p v-if="error" class="swb__error">{{ error }}</p>

      <p class="swb__hint">
        Opens WhatsApp with a pre-filled message. The guest receives their access code. Full Business API can be
        configured separately for image sending.
      </p>
    </template>
  </div>
</template>

<style scoped>
.swb {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.swb__empty,
.swb__declined {
  font-size: 0.85rem;
  color: #888;
  font-style: italic;
}

.swb__row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.swb__sent-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.swb__sent-badge {
  font-size: 0.85rem;
  font-weight: 500;
  color: #2d7a47;
}

.swb__btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    background 150ms,
    opacity 150ms;
}
.swb__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.swb__btn--wa {
  background: #25d366;
  color: #fff;
  border-color: #25d366;
}
.swb__btn--wa:hover:not(:disabled) {
  background: #1eb556;
}

.swb__btn--ghost {
  background: #fff;
  border-color: #d5cac6;
  color: #30222a;
}
.swb__btn--ghost:hover:not(:disabled) {
  background: #f5f0ee;
}

.swb__no-phone {
  margin: 0;
  font-size: 0.8rem;
  color: #c0514a;
}

.swb__error {
  margin: 0;
  font-size: 0.82rem;
  color: #c0514a;
}

.swb__hint {
  margin: 0;
  font-size: 0.76rem;
  color: #b5a0a8;
  line-height: 1.4;
}
</style>
