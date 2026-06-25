<script setup lang="ts">
import { ref, computed } from "vue";

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

const loading = ref(false);
const error = ref("");

const leadName = computed(() => (props.context?.siblingData?.leadName as string) ?? "");
const leadPhone = computed(() => (props.context?.siblingData?.leadPhone as string) ?? "");
const wantsAsoebi = computed(() => (props.context?.siblingData?.wantsAsoebi as boolean) ?? false);
const asoebiYards = computed(() => (props.context?.siblingData?.asoebiYards as string) ?? "");

const totalAmount = computed(() => {
  const yards = parseInt(asoebiYards.value, 10);
  return isNaN(yards) ? 0 : yards * 10000;
});

async function sendReminder() {
  if (loading.value) return;
  loading.value = true;
  error.value = "";

  try {
    const asoebiSettings = await $fetch<any>("/api/globals/asoebi_settings");
    if (!asoebiSettings) {
      throw new Error("Could not load Asoebi Settings from the database.");
    }

    const bankName = asoebiSettings.bankName || "";
    const accountNumber = asoebiSettings.accountNumber || "";
    const accountName = asoebiSettings.accountName || "";

    const text = `Hi ${leadName.value}, gentle reminder for the ${asoebiYards.value} yards of Asoebi you ordered for #TheSweetUnion. Please pay the total of ₦${totalAmount.value.toLocaleString()} to ${bankName} - ${accountNumber} (${accountName}) and send proof of payment here. Thank you!`;

    // Clean phone number (remove +, spaces, leading zeros if internationalized already, etc.)
    const cleanPhone = leadPhone.value.replace(/\+/g, "").replace(/[\s-()]/g, "");

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  } catch (err: any) {
    error.value = err.message || "Failed to fetch settings or generate reminder link.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="asoebi-reminder-widget">
    <template v-if="!wantsAsoebi">
      <p class="hint-text">Guest did not request Asoebi.</p>
    </template>
    <template v-else-if="!leadPhone">
      <p class="error-text">No WhatsApp number available for this guest.</p>
    </template>
    <template v-else>
      <div class="row">
        <button
          type="button"
          class="btn-wa"
          :disabled="loading"
          @click="sendReminder"
        >
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
          {{ loading ? "Loading Settings..." : "Send Asoebi Reminder" }}
        </button>
        <span class="order-summary-badge" v-if="asoebiYards">
          Order: {{ asoebiYards }} Yards (₦{{ totalAmount.toLocaleString() }})
        </span>
      </div>
      <p v-if="error" class="error-text">{{ error }}</p>
    </template>
  </div>
</template>

<style scoped>
.asoebi-reminder-widget {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hint-text {
  font-size: 0.85rem;
  color: #888;
  font-style: italic;
  margin: 0;
}

.error-text {
  font-size: 0.85rem;
  color: #c0514a;
  margin: 0;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.order-summary-badge {
  font-size: 0.85rem;
  font-weight: 500;
  color: #865172;
  background: rgba(134, 81, 114, 0.08);
  border: 1px solid rgba(134, 81, 114, 0.15);
  padding: 4px 10px;
  border-radius: 6px;
}

.btn-wa {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  background: #25d366;
  color: #fff;
  border-color: #25d366;
  transition: background 150ms, opacity 150ms;
}

.btn-wa:hover:not(:disabled) {
  background: #1eb556;
}

.btn-wa:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
