<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useDyrected } from "@dyrected/vue";
import { useCachedDyrectedGlobal } from "~/composables/useCachedData";
import { adminAuthHeaders } from "~/utils/admin-auth";

const props = defineProps<{
  doc?: Record<string, any>;
  data?: Record<string, any>;
  record?: Record<string, any>;
  row?: Record<string, any>;
  ids?: string[];
  user?: any;
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
    doc?: Record<string, unknown>;
    row?: Record<string, unknown>;
    record?: Record<string, unknown>;
    data?: Record<string, unknown>;
    formData?: Record<string, unknown>;
    ids?: string[];
  };
}>();

const dyrected = useDyrected();
const loading = ref(false);
const loadingDoc = ref(false);
const error = ref("");
const customMessage = ref(typeof props.value === "string" ? props.value : "");
const isUserEdited = ref(Boolean(typeof props.value === "string" && props.value.trim()));
const fetchedDoc = ref<Record<string, any> | null>(null);

const ROUTE_SEGMENTS = new Set(["admin", "create", "collections", "globals"]);
function readIdFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const pathId = window.location.pathname.split("/").filter(Boolean).at(-1);
  if (pathId && !ROUTE_SEGMENTS.has(pathId)) return pathId;
  const hashId = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).at(-1);
  if (hashId && !ROUTE_SEGMENTS.has(hashId)) return hashId;
  return undefined;
}

const rsvpId = computed(() => {
  return (
    props.doc?.id ||
    props.context?.doc?.id ||
    props.context?.row?.id ||
    (props as any).row?.id ||
    (props as any).ids?.[0] ||
    props.context?.ids?.[0] ||
    readIdFromUrl()
  );
});

const record = computed<Record<string, any>>(() => {
  const ctx = props.context || {};
  return {
    ...(fetchedDoc.value || {}),
    ...(typeof props.value === "object" && props.value !== null ? props.value : {}),
    ...(ctx.formData || {}),
    ...(ctx.siblingData || {}),
    ...(ctx.data || {}),
    ...(ctx.record || {}),
    ...(ctx.row || {}),
    ...(ctx.doc || {}),
    ...((props as any).data || {}),
    ...((props as any).record || {}),
    ...((props as any).row || {}),
    ...(props.doc || {}),
  };
});

async function fetchRecordIfNeeded() {
  const current = record.value;
  // If we already have leadName and the asoebi fields, we're good
  const hasAsoebiFields =
    current.wantsAsoebi !== undefined ||
    current.wantsAsoOke !== undefined ||
    current.asoebiYards !== undefined ||
    current.asoOkeMaleQty !== undefined;

  if (current.leadName && hasAsoebiFields) {
    return;
  }

  const id = rsvpId.value;
  if (!id) return;

  loadingDoc.value = true;
  try {
    if (dyrected?.client) {
      const res = await dyrected.client.collection("rsvp_records").find({
        where: { id: { equals: id } },
        limit: 1,
      });
      if (res?.docs?.[0]) {
        fetchedDoc.value = res.docs[0];
        return;
      }
    }

    const data = await $fetch<any>(`/api/dyrected/api/collections/rsvp_records/${id}`, {
      headers: adminAuthHeaders(),
    });
    if (data?.id) {
      fetchedDoc.value = data;
    }
  } catch (err) {
    console.warn("Failed to fetch full RSVP record in Asoebi reminder:", err);
  } finally {
    loadingDoc.value = false;
  }
}

onMounted(() => {
  fetchRecordIfNeeded();
});

watch(rsvpId, () => {
  fetchRecordIfNeeded();
});

const leadName = computed(() => (record.value.leadName as string) ?? "");
const leadPhone = computed(() => (record.value.leadPhone as string) ?? "");

const wantsAsoebi = computed(() => {
  const val = record.value.wantsAsoebi;
  return val === true || val === "true" || val === 1 || val === "1";
});
const asoebiYards = computed(() => {
  const val = record.value.asoebiYards;
  return val ? String(val) : "";
});

const wantsAsoOke = computed(() => {
  const val = record.value.wantsAsoOke;
  return val === true || val === "true" || val === 1 || val === "1";
});
const asoOkeMaleQty = computed(() => Number(record.value.asoOkeMaleQty) || 0);
const asoOkeFemaleQty = computed(() => Number(record.value.asoOkeFemaleQty) || 0);

const hasOrder = computed(
  () =>
    Boolean(wantsAsoebi.value) ||
    Boolean(asoebiYards.value) ||
    Boolean(wantsAsoOke.value) ||
    asoOkeMaleQty.value > 0 ||
    asoOkeFemaleQty.value > 0,
);

const { data: asoebiSettings, refresh: refreshAsoebiSettings } = useCachedDyrectedGlobal("asoebi_settings");

const savingTemplate = ref(false);
const saveSuccess = ref(false);

const totalAmount = computed(() => {
  let total = 0;
  const ppy = (asoebiSettings.value as any)?.pricePerYard || 10000;
  const malePrice = (asoebiSettings.value as any)?.asoOkeMalePrice || 6000;
  const femalePrice = (asoebiSettings.value as any)?.asoOkeFemalePrice || 6000;

  if (wantsAsoebi.value && asoebiYards.value) {
    const yards = parseInt(asoebiYards.value, 10);
    if (!isNaN(yards)) total += yards * ppy;
  }
  if (wantsAsoOke.value) {
    total += asoOkeMaleQty.value * malePrice + asoOkeFemaleQty.value * femalePrice;
  }
  return total;
});

const summaryText = computed(() => {
  const parts: string[] = [];
  if (wantsAsoebi.value && asoebiYards.value) {
    parts.push(`${asoebiYards.value} Yds Fabric`);
  }
  if (wantsAsoOke.value && asoOkeMaleQty.value > 0) {
    parts.push(`${asoOkeMaleQty.value} Male Fila`);
  }
  if (wantsAsoOke.value && asoOkeFemaleQty.value > 0) {
    parts.push(`${asoOkeFemaleQty.value} Female Gele`);
  }
  return parts.join(" + ");
});

const defaultMessage = computed(() => {
  const settings = asoebiSettings.value as any;
  const bankName = settings?.bankName || "OPay Digital Services Limited(OPay)";
  const accountNumber = settings?.accountNumber || "8105733592";
  const accountName = settings?.accountName || "ADUNOLUWA ANUOLUWAPO OBADOFIN";
  const repName = settings?.representativeName || "Ololade";

  const items: string[] = [];
  if (wantsAsoebi.value && asoebiYards.value) {
    items.push(`${asoebiYards.value} yards of Asoebi fabric (Customised Adire)`);
  }
  if (wantsAsoOke.value && asoOkeMaleQty.value > 0) {
    items.push(`${asoOkeMaleQty.value} Male Aso Oke (Fila / Cap)`);
  }
  if (wantsAsoOke.value && asoOkeFemaleQty.value > 0) {
    items.push(`${asoOkeFemaleQty.value} Female Aso Oke (Gele)`);
  }

  const itemsStr = items.length > 0 ? items.join(" + ") : "Aso Ebi";
  const name = leadName.value || "there";
  const bank = bankName;
  const accNum = accountNumber;
  const accName = accountName;
  const totalStr = `₦${totalAmount.value.toLocaleString()}`;

  const defaultFallbackTemplate = `Hi [guest name] , my name is [rep name] a representative of the couple. 

Thank you for choosing to celebrate #thesweetunion and identifying with the fabric of the day. 
Kindly confirm your Asoebi request of; [items] order for #TheSweetUnion. Please pay the total of [total] to [bank] - [account number] ([account name]) and send proof of payment here. Thank you!`;

  const rawTemplate = settings?.whatsAppTemplate || defaultFallbackTemplate;

  return rawTemplate
    .replace(/\[guest name\]/gi, name)
    .replace(/\[guest_name\]/gi, name)
    .replace(/\{guestName\}/gi, name)
    .replace(/\[rep name\]/gi, repName)
    .replace(/\[rep_name\]/gi, repName)
    .replace(/\[representative name\]/gi, repName)
    .replace(/\[representative_name\]/gi, repName)
    .replace(/\{repName\}/gi, repName)
    .replace(/\{representativeName\}/gi, repName)
    .replace(/\[items\]/gi, itemsStr)
    .replace(/\[items_summary\]/gi, itemsStr)
    .replace(/\{items\}/gi, itemsStr)
    .replace(/\[total\]/gi, totalStr)
    .replace(/\[total_amount\]/gi, totalStr)
    .replace(/\{total\}/gi, totalStr)
    .replace(/\[bank\]/gi, bank)
    .replace(/\[bank_name\]/gi, bank)
    .replace(/\[bank name\]/gi, bank)
    .replace(/\{bank\}/gi, bank)
    .replace(/\[account number\]/gi, accNum)
    .replace(/\[account_number\]/gi, accNum)
    .replace(/\[accountno\]/gi, accNum)
    .replace(/\[account_no\]/gi, accNum)
    .replace(/\{accountNumber\}/gi, accNum)
    .replace(/\{account_number\}/gi, accNum)
    .replace(/\[account name\]/gi, accName)
    .replace(/\[account_name\]/gi, accName)
    .replace(/\{accountName\}/gi, accName)
    .replace(/\{account_name\}/gi, accName);
});

// Auto-fill message when data or asoebiSettings changes, unless user manually customized it
watch(
  defaultMessage,
  (newVal) => {
    if (!isUserEdited.value) {
      customMessage.value = newVal;
    }
  },
  { immediate: true },
);

// Sync current message to parent form state via onChange (if available)
watch(
  customMessage,
  (newMsg) => {
    if (props.onChange) {
      props.onChange(newMsg);
    }
  },
  { immediate: true },
);

function resetToDefault() {
  isUserEdited.value = false;
  customMessage.value = defaultMessage.value;
}

function extractTemplateFromMessage(msg: string): string {
  let template = msg;

  const name = leadName.value?.trim();
  const settings = asoebiSettings.value as any;
  const bank = settings?.bankName || "OPay Digital Services Limited(OPay)";
  const accNum = settings?.accountNumber || "8105733592";
  const accName = settings?.accountName || "ADUNOLUWA ANUOLUWAPO OBADOFIN";
  const repName = settings?.representativeName || "Ololade";
  const totalStr = `₦${totalAmount.value.toLocaleString()}`;

  const items: string[] = [];
  if (wantsAsoebi.value && asoebiYards.value) {
    items.push(`${asoebiYards.value} yards of Asoebi fabric (Customised Adire)`);
  }
  if (wantsAsoOke.value && asoOkeMaleQty.value > 0) {
    items.push(`${asoOkeMaleQty.value} Male Aso Oke (Fila / Cap)`);
  }
  if (wantsAsoOke.value && asoOkeFemaleQty.value > 0) {
    items.push(`${asoOkeFemaleQty.value} Female Aso Oke (Gele)`);
  }
  const itemsStr = items.length > 0 ? items.join(" + ") : "";

  // Convert guest-specific values back into dynamic placeholders
  if (itemsStr && template.includes(itemsStr)) {
    template = template.replaceAll(itemsStr, "[items]");
  }
  if (totalStr && template.includes(totalStr)) {
    template = template.replaceAll(totalStr, "[total]");
  }
  if (name && name !== "there" && template.includes(name)) {
    template = template.replaceAll(name, "[guest name]");
  }
  if (repName && template.includes(repName)) {
    template = template.replaceAll(repName, "[rep name]");
  }
  // Replace current settings and legacy fallbacks
  if (bank && template.includes(bank)) {
    template = template.replaceAll(bank, "[bank]");
  }
  if (template.includes("Premium Trust Bank")) {
    template = template.replaceAll("Premium Trust Bank", "[bank]");
  }
  if (accNum && template.includes(accNum)) {
    template = template.replaceAll(accNum, "[account number]");
  }
  if (template.includes("0101087193")) {
    template = template.replaceAll("0101087193", "[account number]");
  }
  if (accName && template.includes(accName)) {
    template = template.replaceAll(accName, "[account name]");
  }
  if (template.includes("Uchechukwu Ndu")) {
    template = template.replaceAll("Uchechukwu Ndu", "[account name]");
  }

  return template;
}

async function saveAsGlobalTemplate() {
  if (savingTemplate.value || !customMessage.value.trim()) return;
  savingTemplate.value = true;
  error.value = "";
  saveSuccess.value = false;

  try {
    const templateToSave = extractTemplateFromMessage(customMessage.value.trim());

    await $fetch("/api/asoebi/template", {
      method: "PATCH",
      headers: adminAuthHeaders(),
      body: {
        whatsAppTemplate: templateToSave,
      },
    });

    saveSuccess.value = true;
    if (typeof refreshAsoebiSettings === "function") {
      await refreshAsoebiSettings();
    }
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || "Failed to update global template.";
  } finally {
    savingTemplate.value = false;
  }
}

function sendReminder() {
  if (loading.value) return;
  loading.value = true;
  error.value = "";

  try {
    const textToSend = customMessage.value.trim() || defaultMessage.value;
    const cleanPhone = leadPhone.value.replace(/\+/g, "").replace(/[\s-()]/g, "");

    if (!cleanPhone) {
      throw new Error("No phone number found for this guest.");
    }

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textToSend)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  } catch (err: any) {
    error.value = err.message || "Failed to generate WhatsApp reminder link.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="asoebi-reminder-widget">
    <template v-if="loadingDoc">
      <p class="hint-text">Loading guest order details…</p>
    </template>
    <template v-else-if="!hasOrder">
      <p class="hint-text">Guest has not selected any Asoebi fabric or Aso Oke headwear yet.</p>
    </template>
    <template v-else-if="!leadPhone">
      <p class="error-text">No WhatsApp phone number available for this guest.</p>
    </template>
    <template v-else>
      <div class="message-box space-y-2">
        <div class="flex-header">
          <label class="widget-label">Customize WhatsApp Message</label>
          <div class="header-actions">
            <button
              type="button"
              class="btn-save-template"
              :disabled="savingTemplate || !customMessage.trim()"
              @click="saveAsGlobalTemplate"
              title="Save current message as the default template for all guests in Asoebi Settings"
            >
              {{ savingTemplate ? "Saving..." : saveSuccess ? "Saved Globally ✓" : "Save as Global Template 💾" }}
            </button>
            <button type="button" class="btn-reset" @click="resetToDefault">Reset Message</button>
          </div>
        </div>
        <textarea
          v-model="customMessage"
          @input="isUserEdited = true"
          rows="3"
          class="wa-textarea"
          placeholder="Enter custom reminder message to send on WhatsApp..."
        ></textarea>
      </div>

      <div class="row">
        <button type="button" class="btn-wa" :disabled="loading || !customMessage.trim()" @click="sendReminder">
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
          Send WhatsApp Reminder
        </button>
        <span class="order-summary-badge" v-if="summaryText">
          {{ summaryText }} (₦{{ totalAmount.toLocaleString() }})
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
  gap: 12px;
  padding: 6px 0;
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

.flex-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-save-template {
  background: rgba(134, 81, 114, 0.1);
  border: 1px solid rgba(134, 81, 114, 0.3);
  color: #865172;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 6px;
  transition:
    background 150ms,
    border-color 150ms;
}

.btn-save-template:hover:not(:disabled) {
  background: rgba(134, 81, 114, 0.2);
  border-color: #865172;
}

.btn-save-template:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.widget-label {
  font-size: 0.825rem;
  font-weight: 600;
  color: #4a3746;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-reset {
  background: none;
  border: none;
  color: #865172;
  font-size: 0.775rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.btn-reset:hover {
  color: #5c354e;
}

.wa-textarea {
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
  transition: border-color 150ms;
}

.wa-textarea:focus {
  border-color: #865172;
  background: #ffffff;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.order-summary-badge {
  font-size: 0.85rem;
  font-weight: 600;
  color: #865172;
  background: rgba(134, 81, 114, 0.08);
  border: 1px solid rgba(134, 81, 114, 0.18);
  padding: 6px 12px;
  border-radius: 8px;
}

.btn-wa {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  background: #25d366;
  color: #fff;
  border-color: #25d366;
  transition:
    background 150ms,
    opacity 150ms;
}

.btn-wa:hover:not(:disabled) {
  background: #1eb556;
}

.btn-wa:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
