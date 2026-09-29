<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useDyrected } from "@dyrected/vue";
import { useCachedDyrectedGlobal } from "~/composables/useCachedData";
import { adminAuthHeaders } from "~/utils/admin-auth";
import { buildWhatsAppReminderText } from "~~/dyrected/reminder-message";

/**
 * "Send Reminder" action dialog for a wishlist reservation. Lets the admin
 * choose WhatsApp or Email (defaulting to what the guest originally chose),
 * preview the message that will be sent, edit it freely, then send.
 *
 * Registered as "reservations.sendReminder" in pages/admin.vue.
 */
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
const sent = ref(false);
const error = ref("");
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

const reservationId = computed(() => {
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
  // Need the populated item relation (for its name) — siblingData usually only has the raw ID.
  if (current.guestName && current.item && typeof current.item === "object") {
    return;
  }
  const id = reservationId.value;
  if (!id) return;

  loadingDoc.value = true;
  try {
    if (dyrected?.client) {
      const res = await dyrected.client.collection("reservations").find({
        where: { id: { equals: id } },
        limit: 1,
        depth: 1,
      });
      if (res?.docs?.[0]) {
        fetchedDoc.value = res.docs[0];
        return;
      }
    }
    const data = await $fetch<any>(`/api/dyrected/api/collections/reservations/${id}?depth=1`, {
      headers: adminAuthHeaders(),
    });
    if (data?.id) fetchedDoc.value = data;
  } catch (err) {
    console.warn("Failed to fetch reservation record in Send Reminder dialog:", err);
  } finally {
    loadingDoc.value = false;
  }
}

onMounted(fetchRecordIfNeeded);
watch(reservationId, fetchRecordIfNeeded);

const guestName = computed(() => (record.value.guestName as string) ?? "");
const itemName = computed(() => (record.value.item?.name as string) ?? "Gift item");
const contributionAmount = computed(() => Number(record.value.contributionAmount) || 0);
const storedChannel = computed<"whatsapp" | "email">(
  () => (record.value.reminderChannel === "email" ? "email" : "whatsapp"),
);
const storedContact = computed(() => (record.value.reminderContact as string) ?? "");
const reminderSentAt = computed(() => (record.value.reminderSentAt as string) ?? "");

const sentLabel = computed(() => {
  if (!reminderSentAt.value) return null;
  return `Already sent · ${new Date(reminderSentAt.value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
});

// ─── Channel + contact — default to what the guest chose, editable ─────────
const channel = ref<"whatsapp" | "email">(storedChannel.value);
const contact = ref(storedContact.value);
let initialized = false;
watch(
  [storedChannel, storedContact],
  ([ch, ct]) => {
    if (initialized) return; // only seed once the real record has loaded
    channel.value = ch;
    contact.value = ct;
    if (ct) initialized = true;
  },
  { immediate: true },
);

// ─── Message preview + edit ─────────────────────────────────────────────────
const { data: siteSettings } = useCachedDyrectedGlobal("site_settings");

const defaultMessage = computed(() => {
  const settings = siteSettings.value as any;
  const coupleNames = [settings?.partnerOneName, settings?.partnerTwoName].filter(Boolean).join(" & ") || "the couple";
  const senderName = settings?.whatsappSenderName || "the wedding team";
  return buildWhatsAppReminderText(guestName.value || "there", [{ name: itemName.value, amount: contributionAmount.value }], {
    coupleNames,
    senderName,
    bankName: settings?.bankName || "",
    accountNumber: settings?.accountNumber || "",
    accountName: settings?.accountName || "",
  });
});

const customMessage = ref("");
const isUserEdited = ref(false);
watch(
  defaultMessage,
  (val) => {
    if (!isUserEdited.value) customMessage.value = val;
  },
  { immediate: true },
);

function onMessageInput(val: string) {
  customMessage.value = val;
  isUserEdited.value = val.trim() !== defaultMessage.value.trim();
}

function resetToDefault() {
  isUserEdited.value = false;
  customMessage.value = defaultMessage.value;
}

async function sendReminder() {
  if (loading.value) return;
  if (!contact.value.trim()) {
    error.value = "Please enter a phone number or email to send to.";
    return;
  }
  if (!customMessage.value.trim()) {
    error.value = "Message cannot be empty.";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const id = reservationId.value;
    if (!id) throw new Error("Could not determine which reservation this is.");

    await $fetch(`/api/reminders/send/${id}`, {
      method: "POST",
      headers: adminAuthHeaders(),
      body: {
        channel: channel.value,
        contact: contact.value.trim(),
        message: customMessage.value.trim(),
        subject: `A reminder about your gift — ${itemName.value}`,
      },
    });

    sent.value = true;
    fetchedDoc.value = { ...record.value, reminderSentAt: new Date().toISOString() };
    if (props.onChange) props.onChange(true);
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || "Failed to send reminder.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="p-3 border border-gray-200 rounded-lg bg-white space-y-3 text-sm">
    <div v-if="loadingDoc" class="text-gray-500">Loading reservation…</div>

    <template v-else>
      <div v-if="sentLabel" class="text-xs font-medium text-green-700 bg-green-50 rounded px-2 py-1 inline-block">
        ✓ {{ sentLabel }}
      </div>

      <div class="text-xs text-gray-500">
        <span class="font-semibold text-gray-700">{{ guestName || "Guest" }}</span>
        reserved <span class="font-semibold text-gray-700">{{ itemName }}</span>
        <span v-if="contributionAmount">
          (₦{{ contributionAmount.toLocaleString("en-US") }})</span
        >
      </div>

      <!-- Channel + Contact -->
      <div class="flex flex-col sm:flex-row gap-2">
        <select v-model="channel" class="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white">
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
        </select>
        <input
          v-model="contact"
          type="text"
          :placeholder="channel === 'whatsapp' ? 'e.g. 2348012345678' : 'e.g. guest@example.com'"
          class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
        />
      </div>
      <p class="text-xs text-gray-400">
        Defaults to what {{ guestName || "the guest" }} chose ({{ storedChannel === "whatsapp" ? "WhatsApp" : "Email" }}).
        Change either field if you'd rather send a different way.
      </p>

      <!-- Message preview / edit -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-xs font-semibold uppercase tracking-wide text-gray-600">Message Preview</label>
          <button
            v-if="isUserEdited"
            type="button"
            @click="resetToDefault"
            class="text-xs text-amber-700 underline hover:text-amber-900"
          >
            Reset to default
          </button>
        </div>
        <textarea
          :value="customMessage"
          @input="onMessageInput(($event.target as HTMLTextAreaElement).value)"
          rows="10"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono whitespace-pre-wrap"
        />
      </div>

      <button
        type="button"
        :disabled="loading"
        @click="sendReminder"
        class="w-full px-4 py-2 text-sm font-semibold text-white bg-amber-700 rounded-lg disabled:opacity-50 hover:bg-amber-800"
      >
        {{ loading ? "Sending…" : sent ? "Sent — Send Again" : `Send via ${channel === "whatsapp" ? "WhatsApp" : "Email"}` }}
      </button>

      <p v-if="error" class="text-xs font-medium text-red-700">✗ {{ error }}</p>
      <p v-else-if="sent" class="text-xs font-medium text-green-700">✓ Reminder sent.</p>
    </template>
  </div>
</template>
