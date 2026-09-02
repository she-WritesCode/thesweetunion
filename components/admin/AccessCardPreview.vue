<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useDyrectedClient } from "#imports";
import { adminAuthHeaders } from "~/utils/admin-auth";

const props = defineProps<{
  doc?: Record<string, any>;
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
  };
}>();

const client = useDyrectedClient();
const loading = ref(false);
const sendingWa = ref(false);
const sendingEmail = ref(false);
const sendError = ref("");
const sendSuccess = ref("");

const eventNames = ref<string[]>([]);
const groupName = ref("");
const coupleName = ref("Adun & Uche");
const hashtag = ref("#TheSweetUnion");
const weddingDateText = ref("");

// id is not in siblingData — extracted from the URL and kept reactive via event listeners.
// Dyrected admin uses React Router (History API), so window.location.hash never changes;
// we must listen to pushState/replaceState and popstate to detect navigation.
const ROUTE_SEGMENTS = new Set(["admin", "create", "collections", "globals"]);

function readIdFromUrl(): string | undefined {
  // Try pathname first (React Router / History API)
  if (typeof window === "undefined") return undefined;
  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  const pathId = pathSegments.at(-1);
  if (pathId && !ROUTE_SEGMENTS.has(pathId)) return pathId;

  // Fallback to hash (#/collections/rsvp_records/<id>)
  const hashSegments = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const hashId = hashSegments.at(-1);
  if (hashId && !ROUTE_SEGMENTS.has(hashId)) return hashId;

  return undefined;
}

const routeId = ref<string | undefined>(readIdFromUrl());

function handleNavigation() {
  routeId.value = readIdFromUrl();
}

const rsvpId = computed(() => (props.doc?.id as string | undefined) ?? routeId.value);

const siblingData = computed(() => props.doc ?? props.context?.siblingData ?? {});
const leadName = computed(() => (siblingData.value.leadName as string) ?? "");
const leadEmail = computed(() => (siblingData.value.leadEmail as string) ?? "");
const leadPhone = computed(() => (siblingData.value.leadPhone as string) ?? "");
const spouseName = computed(() => (siblingData.value.spouseName as string) ?? "");
const hasSpouse = computed(() => (siblingData.value.hasSpouse as boolean) ?? false);
const attending = computed(() => (siblingData.value.attending as boolean) ?? false);
const invitationSent = computed(() => (siblingData.value.invitationSent as boolean) ?? false);
const invitationSentAt = computed(() => (siblingData.value.invitationSentAt as string) ?? "");
const invitationSentVia = computed(() => (siblingData.value.invitationSentVia as string) ?? "");
const selectedEventIds = computed(() => (siblingData.value.selectedEvents as string[]) ?? []);
const groupId = computed(() => (siblingData.value.group as string) ?? "");

const guestName = computed(() => {
  if (hasSpouse.value && spouseName.value) return `${leadName.value} + ${spouseName.value}`;
  return leadName.value || "Guest";
});

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

async function loadCardData() {
  loading.value = true;
  try {
    await Promise.all([fetchEvents(), fetchGroup(), fetchSiteSettings()]);
  } finally {
    loading.value = false;
  }
}

async function fetchEvents() {
  if (!selectedEventIds.value.length) return;
  try {
    const data = await client.collection("events").find({ limit: 50, depth: 1 });
    eventNames.value = (data?.docs ?? [])
      .filter((e: any) => selectedEventIds.value.includes(e.id))
      .map((e: any) => e.name);
  } catch {}
}

async function fetchGroup() {
  if (!groupId.value) return;
  try {
    const data = await client.collection("rsvp_groups").find({
      where: { id: { equals: groupId.value } },
      limit: 1,
    });
    groupName.value = data?.docs?.[0]?.name ?? "";
  } catch {}
}

async function fetchSiteSettings() {
  try {
    const data = (await client.global("site_settings").get()) as any;
    const p1 = data?.partnerOneName ?? "";
    const p2 = data?.partnerTwoName ?? "";
    if (p1 && p2) coupleName.value = `${p1} & ${p2}`;
    if (data?.hashtag) hashtag.value = data.hashtag;
    if (data?.weddingDateText) weddingDateText.value = data.weddingDateText;
  } catch {}
}

// Patch history API — React Router uses pushState, not hashchange
let origPushState: typeof history.pushState;
let origReplaceState: typeof history.replaceState;

onMounted(async () => {
  origPushState = history.pushState.bind(history);
  origReplaceState = history.replaceState.bind(history);
  history.pushState = (...args) => {
    origPushState(...args);
    handleNavigation();
  };
  history.replaceState = (...args) => {
    origReplaceState(...args);
    handleNavigation();
  };
  window.addEventListener("popstate", handleNavigation);
  window.addEventListener("hashchange", handleNavigation);
  await loadCardData();
});

onUnmounted(() => {
  if (origPushState) history.pushState = origPushState;
  if (origReplaceState) history.replaceState = origReplaceState;
  window.removeEventListener("popstate", handleNavigation);
  window.removeEventListener("hashchange", handleNavigation);
});

watch(rsvpId, loadCardData);
watch([selectedEventIds, groupId], loadCardData, { deep: true });

const accessCardRef = ref<any>(null);

async function downloadCard() {
  if (accessCardRef.value?.downloadCard) {
    await accessCardRef.value.downloadCard();
  }
}

async function sendWhatsApp() {
  if (!rsvpId.value || sendingWa.value) return;
  sendingWa.value = true;
  sendError.value = "";
  sendSuccess.value = "";
  try {
    if (accessCardRef.value?.captureCardImage) {
      const dataUrl = await accessCardRef.value.captureCardImage();
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `access-card-${(guestName.value || "guest").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`;
      a.click();
    }

    // Mark as sent + get wa.me link
    const data = await $fetch<any>(`/api/invitations/send-single/${rsvpId.value}`, {
      method: "POST",
      headers: adminAuthHeaders(),
    });
    if (data.waUrl) {
      window.open(data.waUrl, "_blank", "noopener,noreferrer");
    }
    sendSuccess.value = "Card downloaded & WhatsApp opened — attach the image before sending.";
    if (props.onChange) props.onChange({ invitationSent: true });
  } catch (err: any) {
    sendError.value = err?.data?.message || err.message || "Failed. Please try again.";
  } finally {
    sendingWa.value = false;
  }
}

async function sendEmail() {
  if (!rsvpId.value || sendingEmail.value) return;
  sendingEmail.value = true;
  sendError.value = "";
  sendSuccess.value = "";
  try {
    let imageBase64 = "";
    if (accessCardRef.value?.captureCardImage) {
      imageBase64 = await accessCardRef.value.captureCardImage();
    }
    await $fetch(`/api/invitations/send-email/${rsvpId.value}`, {
      method: "POST",
      headers: adminAuthHeaders(),
      body: { imageBase64 },
    });
    sendSuccess.value = `Invitation emailed to ${leadEmail.value || "guest"}.`;
    if (props.onChange) props.onChange({ invitationSent: true });
  } catch (err: any) {
    sendError.value = err?.data?.message || err.message || "Failed to send email.";
  } finally {
    sendingEmail.value = false;
  }
}
</script>

<template>
  <div class="acp-wrap">
    <p v-if="!rsvpId" class="acp-empty">Save this record first to generate the access card.</p>
    <p v-else-if="!attending" class="acp-empty">
      This guest declined attendance (Attending: No). Access card invitation is not generated.
    </p>

    <template v-else>
      <!-- Reusable Access Card Component -->
      <AccessCard
        ref="accessCardRef"
        :rsvp-id="rsvpId"
        :guest-name="guestName"
        :has-spouse="hasSpouse"
        :spouse-name="spouseName"
        :group-name="groupName"
        :event-names="eventNames"
        :couple-name="coupleName"
        :hashtag="hashtag"
        :wedding-date-text="weddingDateText"
        :loading="loading"
      />

      <!-- Actions -->
      <div class="acp-actions">
        <!-- Download -->
        <button type="button" class="acp-btn" :disabled="loading" @click="downloadCard">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>

        <template v-if="attending">
          <!-- WhatsApp -->
          <button
            type="button"
            class="acp-btn acp-btn--wa"
            :disabled="loading || sendingWa || !leadPhone"
            @click="sendWhatsApp"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
              />
            </svg>
            {{ sendingWa ? "Opening…" : "Send WhatsApp" }}
          </button>

          <!-- Email -->
          <button
            type="button"
            class="acp-btn acp-btn--email"
            :disabled="loading || sendingEmail || !leadEmail"
            @click="sendEmail"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            {{ sendingEmail ? "Sending…" : "Send Email" }}
          </button>
        </template>
      </div>

      <!-- Feedback -->
      <p v-if="sendSuccess" class="acp-feedback acp-feedback--ok">{{ sendSuccess }}</p>
      <p v-else-if="sendError" class="acp-feedback acp-feedback--err">{{ sendError }}</p>

      <!-- Sent status -->
      <p v-if="invitationSent && sentLabel" class="acp-sent">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {{ sentLabel }}
      </p>
      <p v-if="attending && !leadPhone" class="acp-hint">No phone number — WhatsApp unavailable.</p>
      <p v-if="attending && !leadEmail" class="acp-hint">No email address — email unavailable.</p>
    </template>
  </div>
</template>

<style scoped>
.acp-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: flex-start;
}

.acp-empty {
  font-size: 0.85rem;
  color: #9a7b8e;
  font-style: italic;
}

.acp-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.acp-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid rgba(138, 98, 124, 0.4);
  border-radius: 6px;
  background: #fff;
  color: #865172;
  font-family: "Jost", sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 150ms,
    border-color 150ms,
    color 150ms;
}

.acp-btn:hover:not(:disabled) {
  background: #f5edf1;
  border-color: #865172;
  color: #30222a;
}

.acp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.acp-btn--wa {
  background: #25d366;
  color: #fff;
  border-color: #25d366;
}
.acp-btn--wa:hover:not(:disabled) {
  background: #1eb556;
  border-color: #1eb556;
  color: #fff;
}

.acp-btn--email {
  background: #865172;
  color: #fff;
  border-color: #865172;
}
.acp-btn--email:hover:not(:disabled) {
  background: #653853;
  border-color: #653853;
  color: #fff;
}

.acp-sent {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: "Jost", sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  color: #2d7a47;
}

.acp-feedback {
  margin: 0;
  font-family: "Jost", sans-serif;
  font-size: 0.78rem;
  line-height: 1.4;
}
.acp-feedback--ok {
  color: #2d7a47;
}
.acp-feedback--err {
  color: #c0514a;
}

.acp-hint {
  margin: 0;
  font-family: "Jost", sans-serif;
  font-size: 0.74rem;
  color: #b5a0a8;
  font-style: italic;
}
</style>
