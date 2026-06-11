<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import { useRoute, useRouter, useAsyncData } from "#app";
import { useDyrectedClient, useDyrectedGlobal } from "#imports";
import PhoneInput from "~/components/PhoneInput.vue";

interface CMSEvent {
  id: string;
  name: string;
  date: string;
  collectsRsvp: boolean;
}

interface RSVPData {
  id?: string;
  group?: any;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  attending: boolean;
  selectedEvents: string[];
  hasSpouse: boolean;
  spouseName: string;
  dietaryNotes: string;
  message: string;
  submittedAt: string;
}

interface GroupConfig {
  name: string;
  slug: string;
  capacity: number;
}

const GROUPS: GroupConfig[] = [
  { name: "RCF UNILAG", slug: "rcf-unilag", capacity: 30 },
  { name: "Victory Center Teens", slug: "victory-teens", capacity: 15 },
];

const route = useRoute();
const router = useRouter();

const client = useDyrectedClient();
const { data: siteSettings } = await useDyrectedGlobal("site_settings");
const couplesPhoto = computed(() => siteSettings.value?.rsvpTeaserImage?.url || null);

// Fetch RSVP events from CMS; filter collectsRsvp in JS (boolean column workaround)
const { data: cmsEventsRaw } = await useAsyncData("rsvp-events", () => client.collection("events").find({ limit: 20 }));
const rsvpEvents = computed<CMSEvent[]>(() => (cmsEventsRaw.value?.docs ?? []).filter((e: any) => e.collectsRsvp));

// ─── SSR: resolve group / token from URL before first render ─────────────────
const { data: initData } = await useAsyncData(
  "rsvp-init",
  async () => {
    const tokenQuery = route.query.token as string | undefined;
    const groupQuery = route.query.group as string | undefined;

    // Priority 1: edit token
    if (tokenQuery) {
      try {
        const record = await client.collection("rsvp_records").find({ where: { editToken: { equals: tokenQuery } } });
        if (record.docs.length > 0) {
          return { type: "existing" as const, record: record.docs[0], editToken: tokenQuery };
        }
      } catch {
        // token invalid — fall through
      }
    }

    // Priority 2: group slug
    if (groupQuery) {
      try {
        const dbGroup = await client.collection("rsvp_groups").find({ where: { slug: { equals: groupQuery } } });
        if (dbGroup.docs.length > 0) {
          const isFull = (dbGroup.docs[0].confirmedCount || 0) >= dbGroup.docs[0].maxCapacity;
          return { type: "group" as const, groupInfo: dbGroup.docs[0], isFull };
        }
      } catch {
        // group not found in DB — invalid link
      }
      // Group slug present but not found → invalid
      return { type: "invalid" as const };
    }

    // No token, no group → invalid
    return { type: "invalid" as const };
  },
  { watch: [() => route.query.token, () => route.query.group] },
);
// ─────────────────────────────────────────────────────────────────────────────

// Derive reactive state from SSR-resolved initData
const existingRSVP = ref<any>(initData.value?.type === "existing" ? initData.value.record : null);
const groupInfo = ref<any>(initData.value?.type === "group" ? initData.value.groupInfo : null);
const editToken = ref<string>(initData.value?.type === "existing" ? initData.value.editToken : "");
const invalidLinkError = ref<boolean>(initData.value?.type === "invalid");
const groupFullError = ref<string | null>(
  initData.value?.type === "group" && initData.value.isFull ? initData.value.groupInfo.name : null,
);
const isEditing = ref(initData.value?.type === "existing");

// Flow State
const currentStep = ref(2);
const groupCounts = ref<Record<string, number>>({});

// Form State
const group = ref<string>(initData.value?.type === "group" ? initData.value.groupInfo.name : "");
const leadName = ref("");
const leadEmail = ref("");
const emailError = ref("");
const eventsError = ref("");
const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
const leadPhone = ref("");
const attending = ref<boolean | null>(null);
const selectedEvents = ref<string[]>([]);
const hasSpouse = ref(false);
const spouseName = ref("");
const dietaryNotes = ref("");
const message = ref("");

// Modals / Flow states
const successModal = ref<"submit" | "edit" | "cancel" | null>(null);

const redirectCountdown = ref(60);
let redirectInterval: any = null;

const startRedirectTimer = () => {
  if (attending.value !== true) return;
  redirectCountdown.value = 60;
  if (redirectInterval) clearInterval(redirectInterval);
  redirectInterval = setInterval(() => {
    redirectCountdown.value--;
    if (redirectCountdown.value <= 0) {
      closeSuccessModal();
      router.push("/wishlist");
    }
  }, 1000);
};

const cancelRedirect = () => {
  if (redirectInterval) {
    clearInterval(redirectInterval);
    redirectInterval = null;
  }
};

const closeSuccessModal = () => {
  cancelRedirect();
  successModal.value = null;
};

onUnmounted(() => {
  cancelRedirect();
});

const populateStates = (data: RSVPData) => {
  group.value = typeof data.group === "object" ? data.group?.name : data.group;
  leadName.value = data.leadName;
  leadEmail.value = data.leadEmail;
  leadPhone.value = typeof data.leadPhone === "string" ? data.leadPhone : "";
  attending.value = data.attending;
  selectedEvents.value = Array.isArray(data.selectedEvents)
    ? data.selectedEvents.map((e: any) => (typeof e === "object" ? e.id : e))
    : [];
  hasSpouse.value = data.hasSpouse || false;
  spouseName.value = data.spouseName || "";
  dietaryNotes.value = data.dietaryNotes || "";
  message.value = data.message || "";
};

// Pre-populate form if SSR resolved an existing RSVP
if (initData.value?.type === "existing") {
  populateStates(initData.value.record);
}

// Sync reactive state whenever initData re-resolves (client-side navigation)
watch(initData, (val) => {
  if (!val) return;
  if (val.type === "existing") {
    existingRSVP.value = val.record;
    editToken.value = val.editToken;
    groupInfo.value = null;
    invalidLinkError.value = false;
    groupFullError.value = null;
    populateStates(val.record);
    currentStep.value = 2;
    isEditing.value = true;
  } else if (val.type === "group") {
    groupInfo.value = val.groupInfo;
    group.value = val.groupInfo.name;
    existingRSVP.value = null;
    editToken.value = "";
    invalidLinkError.value = false;
    groupFullError.value = val.isFull ? val.groupInfo.name : null;
    if (!val.isFull) currentStep.value = 2;
  } else {
    existingRSVP.value = null;
    groupInfo.value = null;
    editToken.value = "";
    invalidLinkError.value = true;
    groupFullError.value = null;
  }
});

// Re-run on query param changes is handled via useAsyncData's watch option above.

const handleAttendanceSelect = (isAttending: boolean) => {
  attending.value = isAttending;
  if (!isAttending) {
    currentStep.value = 4;
  } else {
    currentStep.value = 3;
  }
};

const handleStepBack = () => {
  if (currentStep.value === 4 && attending.value === false) {
    currentStep.value = 2;
  } else {
    currentStep.value = currentStep.value - 1;
  }
};

const handleStep3Submit = () => {
  emailError.value = "";
  eventsError.value = "";
  if (!leadName.value || !leadPhone.value || !leadEmail.value) return;
  if (!isValidEmail(leadEmail.value)) {
    emailError.value = "Please enter a valid email address.";
    return;
  }
  if (hasSpouse.value && !spouseName.value.trim()) return;
  if (attending.value && selectedEvents.value.length === 0) {
    eventsError.value = "Please select at least one event you will be attending.";
    return;
  }

  if (groupInfo.value) {
    const currentCount = groupInfo.value.confirmedCount || 0;
    let previousSeats = 0;
    if (existingRSVP.value && existingRSVP.value.attending) {
      previousSeats = 1 + (existingRSVP.value.hasSpouse ? 1 : 0);
    }
    const newSeats = 1 + (hasSpouse.value ? 1 : 0);

    if (currentCount - previousSeats + newSeats > groupInfo.value.maxCapacity) {
      groupFullError.value = groupInfo.value.name;
      return;
    }
  } else {
    const selectedGroupConfig = GROUPS.find((g) => g.name === group.value);
    if (selectedGroupConfig) {
      const currentCount = groupCounts.value[selectedGroupConfig.slug] || 0;
      let previousSeats = 0;
      if (existingRSVP.value && existingRSVP.value.attending) {
        previousSeats = 1 + (existingRSVP.value.hasSpouse ? 1 : 0);
      }
      const newSeats = 1 + (hasSpouse.value ? 1 : 0);

      if (currentCount - previousSeats + newSeats > selectedGroupConfig.capacity) {
        groupFullError.value = selectedGroupConfig.name;
        return;
      }
    }
  }

  currentStep.value = 4;
};
const handleStep4Submit = () => {
  currentStep.value = 5;
};

const handleSubmit = async () => {
  if (attending.value === null) return;

  const payload = {
    leadName: leadName.value,
    leadEmail: leadEmail.value,
    leadPhone: leadPhone.value,
    attending: attending.value,
    selectedEvents: attending.value ? selectedEvents.value : [],
    hasSpouse: attending.value ? hasSpouse.value : false,
    spouseName: attending.value && hasSpouse.value ? spouseName.value : "",
    dietaryNotes: attending.value ? dietaryNotes.value : "",
    message: message.value,
  };

  try {
    if (editToken.value) {
      // Edit record
      const res = (await $fetch("/api/rsvp/edit", {
        method: "PATCH",
        body: {
          editToken: editToken.value,
          ...payload,
        },
      })) as any;
      if (res.success) {
        existingRSVP.value = res.record;
        successModal.value = "edit";
        isEditing.value = false;
        populateStates(res.record);
      }
    } else if (groupInfo.value && route.query.group) {
      // Submit new record to DB
      const res = (await $fetch("/api/rsvp/submit", {
        method: "POST",
        body: {
          groupSlug: route.query.group as string,
          ...payload,
        },
      })) as any;
      if (res.success) {
        existingRSVP.value = res.record;
        if (res.record?.editToken) {
          editToken.value = res.record.editToken;
        }
        successModal.value = "submit";
        isEditing.value = false;
        populateStates(res.record);
        startRedirectTimer();
      }
    } else {
      // Local Mock fallback
      const mockPayload: RSVPData = {
        group: group.value,
        submittedAt: new Date().toISOString(),
        ...payload,
      };

      const selectedGroupConfig = GROUPS.find((g) => g.name === group.value);
      if (selectedGroupConfig) {
        const updatedCounts = { ...groupCounts.value };

        if (existingRSVP.value && existingRSVP.value.attending) {
          const oldSeats = 1 + (existingRSVP.value.hasSpouse ? 1 : 0);
          updatedCounts[selectedGroupConfig.slug] = Math.max(
            0,
            (updatedCounts[selectedGroupConfig.slug] || 0) - oldSeats,
          );
        }

        if (attending.value) {
          const newSeats = 1 + (hasSpouse.value ? 1 : 0);
          updatedCounts[selectedGroupConfig.slug] = (updatedCounts[selectedGroupConfig.slug] || 0) + newSeats;
        }

        localStorage.setItem("thesweetunion_group_counts", JSON.stringify(updatedCounts));
        groupCounts.value = updatedCounts;
      }

      localStorage.setItem("thesweetunion_rsvp", JSON.stringify(mockPayload));
      successModal.value = existingRSVP.value ? "edit" : "submit";
      existingRSVP.value = mockPayload;
      isEditing.value = false;
      if (successModal.value === "submit") {
        startRedirectTimer();
      }
    }
  } catch (err: any) {
    alert(err.data?.message || err.message || "An error occurred while submitting your RSVP.");
  }
};

const handleCancelRSVP = async () => {
  if (confirm("Are you sure you want to cancel your RSVP? This will release your spots for others.")) {
    try {
      if (editToken.value) {
        await $fetch(`/api/rsvp/delete-record?token=${editToken.value}`, {
          method: "DELETE",
        });
      } else {
        // Fallback local counts release
        const selectedGroupConfig = GROUPS.find((g) => g.name === group.value);
        if (selectedGroupConfig && existingRSVP.value && existingRSVP.value.attending) {
          const updatedCounts = { ...groupCounts.value };
          const seats = 1 + (existingRSVP.value.hasSpouse ? 1 : 0);
          updatedCounts[selectedGroupConfig.slug] = Math.max(0, (updatedCounts[selectedGroupConfig.slug] || 0) - seats);
          localStorage.setItem("thesweetunion_group_counts", JSON.stringify(updatedCounts));
          groupCounts.value = updatedCounts;
        }
      }
    } catch (err: any) {
      console.error("Failed to cancel RSVP in DB:", err);
    }

    localStorage.removeItem("thesweetunion_rsvp");
    existingRSVP.value = null;
    editToken.value = "";

    // Reset Form
    group.value = "";
    leadName.value = "";
    leadEmail.value = "";
    leadPhone.value = "";
    attending.value = null;
    selectedEvents.value = [];
    hasSpouse.value = false;
    spouseName.value = "";
    dietaryNotes.value = "";
    message.value = "";

    successModal.value = "cancel";
    isEditing.value = false;
    router.push({ path: "/rsvp" });
  }
};

const getStepProgress = computed(() => {
  return ((currentStep.value - 1) / 3) * 100;
});

const isFormActive = computed(() => {
  return (!existingRSVP.value || isEditing.value) && !invalidLinkError.value && !groupFullError.value;
});
</script>

<template>
  <div class="rsvp-page" :class="isFormActive ? 'rsvp-page--form-active' : 'rsvp-page--inactive'">
    <Navigation v-if="!isFormActive" />

    <main class="rsvp-main" :class="isFormActive ? 'rsvp-main--form-active' : 'rsvp-main--inactive'">
      <div class="rsvp-content">
        <!-- 1. INVALID DIRECT LINK BLOCKER -->
        <div v-if="invalidLinkError && !existingRSVP" class="rsvp-blocker">
          <div class="rsvp-blocker__icon">✉️</div>
          <h2 class="rsvp-blocker__title">Your invitation holds the key.</h2>
          <p class="rsvp-blocker__body">
            Please click the link in the invitation card that Adun and Uche sent to you to RSVP for our wedding. This
            will help us ensure that all guests are accounted for and that we can manage the seating arrangements
            efficiently.
          </p>
          <p class="rsvp-blocker__footnote">
            If you have any questions or did not receive your link, please contact Uche or Adun.
          </p>
        </div>

        <!-- 2. CAPACITY ALLOCATION BLOCKER -->
        <div v-if="groupFullError" class="rsvp-blocker rsvp-blocker--error">
          <div class="rsvp-blocker__icon">⚠️</div>
          <h3 class="rsvp-blocker__heading">We wish we could fit the whole world.</h3>
          <p class="rsvp-blocker__text">
            As much as we'd love to have you there, we've reached the last of our seats. Please know your love and good
            wishes mean just as much to us — we'll be thinking of you on the day.
          </p>
          <button
            v-if="existingRSVP"
            type="button"
            @click="
              groupFullError = null;
              isEditing = false;
              populateStates(existingRSVP);
            "
            class="btn-primary"
          >
            View My Current Confirmation
          </button>
        </div>

        <!-- 3. CONFIRMED RSVP SUMMARY -->
        <div v-if="existingRSVP && !isEditing && !groupFullError" class="rsvp-summary">
          <div class="rsvp-summary__header">
            <div>
              <span class="rsvp-summary__status-label">RSVP Status</span>
              <div class="rsvp-summary__status-row">
                <span
                  class="rsvp-summary__dot"
                  :class="existingRSVP.attending ? 'rsvp-summary__dot--attending' : 'rsvp-summary__dot--declined'"
                />
                <h3 class="rsvp-summary__title">
                  {{ existingRSVP.attending ? "You're Attending! 🎉" : "Declined Attendance" }}
                </h3>
              </div>
            </div>
            <div class="rsvp-summary__date">
              Submitted:
              {{
                new Date(existingRSVP.submittedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              }}
            </div>
          </div>

          <div class="rsvp-summary__grid">
            <div class="rsvp-summary__column">
              <div>
                <h4 class="rsvp-summary__section-heading">Guest</h4>
                <p class="rsvp-summary__name">{{ existingRSVP.leadName }}</p>
                <p class="rsvp-summary__meta">{{ existingRSVP.leadEmail }}</p>
                <p
                  v-if="typeof existingRSVP.leadPhone === 'string' && existingRSVP.leadPhone"
                  class="rsvp-summary__meta"
                >
                  {{ existingRSVP.leadPhone }}
                </p>
              </div>
            </div>

            <div v-if="existingRSVP.attending" class="rsvp-summary__column">
              <div>
                <h4 class="rsvp-summary__section-heading">Events Selected</h4>
                <ul class="rsvp-events-list">
                  <template v-if="existingRSVP.selectedEvents?.length">
                    <li
                      v-for="ev in existingRSVP.selectedEvents"
                      :key="typeof ev === 'object' ? ev.id : ev"
                      class="rsvp-event-item"
                    >
                      <span class="rsvp-event-item__check">✓</span>
                      {{ typeof ev === "object" ? ev.name : (rsvpEvents.find((e) => e.id === ev)?.name ?? ev) }}
                    </li>
                  </template>
                  <li v-else class="rsvp-spouse-none">No events selected</li>
                </ul>
              </div>

              <div>
                <h4 class="rsvp-summary__section-heading">Plus-One Details</h4>
                <p v-if="existingRSVP.hasSpouse && existingRSVP.spouseName" class="rsvp-spouse-note">
                  Attending with spouse: <strong>{{ existingRSVP.spouseName }}</strong>
                </p>
                <p v-else class="rsvp-spouse-none">Attending solo</p>
              </div>
            </div>
          </div>

          <div v-if="existingRSVP.dietaryNotes || existingRSVP.message" class="rsvp-summary__notes">
            <div v-if="existingRSVP.dietaryNotes">
              <h4 class="rsvp-summary__section-heading">Dietary Restrictions</h4>
              <p class="rsvp-notes__text">{{ existingRSVP.dietaryNotes }}</p>
            </div>
            <div v-if="existingRSVP.message">
              <h4 class="rsvp-summary__section-heading">Message to the Couple</h4>
              <p class="rsvp-message__text">&ldquo;{{ existingRSVP.message }}&rdquo;</p>
            </div>
          </div>

          <div v-if="existingRSVP.attending" class="rsvp-summary__invite-note">
            📬 Your personal invitation card will be sent to <strong>{{ existingRSVP.leadEmail }}</strong> closer to the
            wedding date.
          </div>

          <div class="rsvp-summary__actions">
            <button
              @click="
                isEditing = true;
                currentStep = 2;
                populateStates(existingRSVP);
              "
              class="btn-primary"
            >
              Edit My RSVP
            </button>
            <button @click="handleCancelRSVP" class="btn-danger">Cancel RSVP</button>
          </div>
        </div>

        <!-- 4. ACTIVE FORM -->
        <form v-if="isFormActive" @submit.prevent="handleSubmit" class="rsvp-form">
          <div class="rsvp-progress">
            <div class="rsvp-progress__fill" :style="{ width: `${getStepProgress}%` }" />
          </div>

          <div class="rsvp-form__branding">
            <span>#TheSweetUnion</span>
            <span v-if="isEditing">Editing Mode</span>
            <span v-else>RSVP Form</span>
          </div>

          <!-- STEP 2: ATTENDANCE -->
          <div v-if="currentStep === 2" class="rsvp-step">
            <div class="rsvp-step__header">
              <h2 class="rsvp-step__title">Will you be joining us?</h2>
              <p class="rsvp-step__subtitle">We hope you can make the trip to celebrate our marriage vows with us.</p>
            </div>
            <div class="rsvp-notice">
              <span class="rsvp-notice__icon">⚠️</span>
              <p class="rsvp-notice__text">
                Please only RSVP <strong>Yes</strong> if you are certain you will be attending. Once submitted, your
                spot is reserved and cannot be transferred. If your plans change, you can cancel from your confirmation.
              </p>
            </div>
            <div class="rsvp-attendance-grid">
              <button
                type="button"
                @click="handleAttendanceSelect(true)"
                class="rsvp-attendance-btn"
                :class="attending === true ? 'rsvp-attendance-btn--active-yes' : 'rsvp-attendance-btn--idle'"
              >
                <span class="rsvp-attendance-btn__emoji">🎉</span>
                <span class="rsvp-attendance-btn__label">Yes, I will be there</span>
                <span class="rsvp-attendance-btn__hint">We will set a plate for you!</span>
              </button>
              <button
                type="button"
                @click="handleAttendanceSelect(false)"
                class="rsvp-attendance-btn"
                :class="attending === false ? 'rsvp-attendance-btn--active-no' : 'rsvp-attendance-btn--idle'"
              >
                <span class="rsvp-attendance-btn__emoji">✉️</span>
                <span class="rsvp-attendance-btn__label">Sadly, I cannot make it</span>
                <span class="rsvp-attendance-btn__hint">We will miss you.</span>
              </button>
            </div>
          </div>

          <!-- STEP 3: DETAILS -->
          <div v-if="currentStep === 3" class="rsvp-step">
            <div class="rsvp-step__header">
              <h2 class="rsvp-step__title">Tell us about yourself</h2>
              <p class="rsvp-step__subtitle">Please enter your contact information. This is an adult-only wedding.</p>
            </div>
            <div class="rsvp-fields">
              <div class="rsvp-field-group">
                <label class="input-label">Full Name (Required)</label>
                <input
                  type="text"
                  required
                  v-model="leadName"
                  class="rsvp-input"
                  placeholder="Enter your first and last name"
                />
              </div>
              <div class="rsvp-field-group">
                <PhoneInput
                  v-model="leadPhone"
                  required
                  placeholder="WhatsApp number"
                  label="WhatsApp Number (Required)"
                />
              </div>
              <div class="rsvp-field-group">
                <label class="input-label">Email Address (Required)</label>
                <input
                  type="text"
                  required
                  v-model="leadEmail"
                  @input="emailError = ''"
                  class="rsvp-input"
                  :class="emailError ? 'rsvp-input--error' : ''"
                  placeholder="name@example.com"
                />
                <p v-if="emailError" class="rsvp-field-error">{{ emailError }}</p>
              </div>
              <div
                v-if="attending && rsvpEvents.length > 0"
                class="rsvp-events-box"
                :class="eventsError ? 'rsvp-events-box--error' : ''"
              >
                <h4 class="rsvp-events-box__title">Which events are you joining?</h4>
                <div class="rsvp-events-options">
                  <label v-for="event in rsvpEvents" :key="event.id" class="rsvp-checkbox-label">
                    <input
                      type="checkbox"
                      :value="event.id"
                      v-model="selectedEvents"
                      @change="eventsError = ''"
                      class="rsvp-checkbox"
                    />
                    <span
                      >{{ event.name }} <br />
                      {{
                        new Date(event.date).toLocaleDateString("en-NG", {
                          dateStyle: "full",
                        })
                      }}
                    </span>
                  </label>
                </div>
                <p v-if="eventsError" class="rsvp-field-error mt-2">{{ eventsError }}</p>
              </div>
              <div class="rsvp-spouse-section">
                <div class="rsvp-spouse-row">
                  <input type="checkbox" id="hasSpouse" v-model="hasSpouse" class="rsvp-checkbox" />
                  <label for="hasSpouse" class="rsvp-spouse-label"> I am attending with my spouse</label>
                </div>
                <div v-if="hasSpouse" class="rsvp-spouse-field">
                  <label class="input-label">Spouse / Partner Name (Required)</label>
                  <input
                    type="text"
                    required
                    v-model="spouseName"
                    class="rsvp-input"
                    placeholder="Enter partner's name"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- STEP 4: MESSAGE & SUBMIT -->
          <div v-if="currentStep === 4" class="rsvp-step">
            <div class="rsvp-step__header">
              <h2 class="rsvp-step__title">Greetings for the couple</h2>
              <p class="rsvp-step__subtitle">
                Leave a congratulatory message or prayer for Uche &amp; Adun (Optional).
              </p>
            </div>
            <div class="rsvp-step__content">
              <div class="rsvp-field-group">
                <label class="input-label">Message</label>
                <textarea
                  v-model="message"
                  rows="6"
                  class="rsvp-textarea"
                  placeholder="Share your congrats message..."
                />
              </div>
            </div>
          </div>

          <!-- STEP 5: Confirmation -->
          <div v-if="currentStep === 5" class="rsvp-step">
            <div class="rsvp-step__header">
              <h2 class="rsvp-step__title">Confirmation</h2>
              <p class="rsvp-step__subtitle">Are you sure you would be attending this wedding?</p>
            </div>
            <div class="rsvp-step__content">
              <div class="rsvp-notice">
                <span class="rsvp-notice__icon">⚠️</span>
                <p class="rsvp-notice__text">
                  Kindly check your calendars and be sure you would be attending this wedding. This is important as it
                  will help us better prepare and allocate resources. Thank you for your cooperation and we look forward
                  to celebrating with you!
                </p>
              </div>
            </div>
          </div>

          <!-- Form navigation — left: Exit (step 2) or Back (steps 3+) · right: Continue / Submit -->
          <div class="rsvp-form__nav">
            <button v-if="currentStep > 2" type="button" @click="handleStepBack" class="rsvp-back-btn">← Back</button>
            <button
              v-else
              type="button"
              @click="
                isEditing = false;
                emailError = '';
                eventsError = '';
                existingRSVP ? populateStates(existingRSVP) : router.push('/rsvp');
              "
              class="rsvp-exit-btn"
            >
              Exit Form
            </button>

            <button
              v-if="currentStep === 3"
              type="button"
              @click="handleStep3Submit"
              :disabled="
                !leadName ||
                !leadPhone ||
                !leadEmail ||
                (hasSpouse && !spouseName.trim()) ||
                (attending && selectedEvents.length === 0)
              "
              class="rsvp-continue-btn"
              :class="
                !leadName ||
                !leadPhone ||
                !leadEmail ||
                (hasSpouse && !spouseName.trim()) ||
                (attending && selectedEvents.length === 0)
                  ? 'rsvp-continue-btn--disabled'
                  : 'rsvp-continue-btn--active'
              "
            >
              Continue
            </button>
            <button
              v-if="currentStep === 5"
              type="button"
              @click="
                () => {
                  handleAttendanceSelect(false);
                  handleSubmit();
                }
              "
              class="rsvp-continue-btn"
            >
              No, I can't make it
            </button>
            <button v-if="currentStep === 4" type="button" @click="handleStep4Submit" class="rsvp-continue-btn">
              Continue
            </button>
            <button v-else-if="currentStep === 5" type="submit" class="rsvp-submit-btn">
              {{ isEditing ? "Save RSVP Changes" : "Yes I'll be attending" }}
            </button>
          </div>
        </form>
      </div>
    </main>

    <Footer v-if="!isFormActive" :couples-photo="couplesPhoto" />

    <!-- Success modal -->
    <div v-if="successModal" class="rsvp-success-overlay">
      <div class="rsvp-success-card">
        <div class="rsvp-success__icon">{{ successModal === "cancel" ? "🗑️" : "🎉" }}</div>
        <h3 class="rsvp-success__title">
          {{
            successModal === "cancel"
              ? "RSVP Removed"
              : successModal === "edit"
                ? "RSVP Changes Saved!"
                : "Thank You So Much!"
          }}
        </h3>
        <div class="rsvp-success__body">
          <template v-if="successModal === 'cancel'">
            <p>Your RSVP registration details have been successfully deleted from this browser session.</p>
          </template>
          <template v-else-if="successModal === 'edit'">
            <p>Your details have been successfully updated. We look forward to celebrating together in Lagos.</p>
          </template>
          <template v-else-if="successModal === 'submit' && attending === true">
            <p>You're officially on the list! We cannot wait to celebrate our union with you. We have saved your confirmation details.</p>
            <div class="rsvp-success__redirect-box" style="margin-top: 20px; padding: 16px; border-radius: 12px; background: rgba(134, 81, 114, 0.08); border: 1px solid rgba(134, 81, 114, 0.15); text-align: center;">
              <p style="font-size: 0.85rem; color: #462137; line-height: 1.5; margin: 0 0 12px; font-weight: 500;">
                We are redirecting you to our registry in <strong>{{ redirectCountdown }}s</strong> to browse our wishlist.
              </p>
              <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                <button type="button" @click="() => { cancelRedirect(); router.push('/wishlist'); }" class="btn-primary" style="font-size: 0.8rem; padding: 6px 14px;">
                  Browse Registry Now
                </button>
                <button type="button" @click="cancelRedirect" class="btn-secondary" style="font-size: 0.8rem; padding: 6px 14px; border: 1px solid rgba(134, 81, 114, 0.2);">
                  Stay on Page
                </button>
              </div>
            </div>
          </template>
          <template v-else-if="successModal === 'submit' && attending === false">
            <p>Thank you for letting us know. We will surely miss your presence, but we appreciate your thoughts and support!</p>
          </template>
        </div>
        <button @click="closeSuccessModal" class="btn-primary mt-4">Close</button>
      </div>
    </div>
  </div>
</template>
