<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "#app";

interface RSVPData {
  id?: string;
  group?: any;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  attending: boolean;
  events: {
    ceremony: boolean;
    reception: boolean;
  };
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
  { name: "Africa Missions", slug: "africa-missions", capacity: 25 },
  { name: "Bride's Extended Family", slug: "bride-family", capacity: 50 },
  { name: "Groom's Extended Family", slug: "groom-family", capacity: 50 },
  { name: "Friends of the Bride", slug: "bride-friends", capacity: 40 },
  { name: "Friends of the Groom", slug: "groom-friends", capacity: 40 },
  { name: "Other / Mutual Friends", slug: "mutual-friends", capacity: 20 },
];

const route = useRoute();
const router = useRouter();

const mounted = ref(false);
const existingRSVP = ref<any>(null);
const isEditing = ref(false);
const editToken = ref("");

// Flow State
const currentStep = ref(2);
const groupCounts = ref<Record<string, number>>({});
const groupInfo = ref<any>(null);

// Form State
const group = ref("");
const leadName = ref("");
const leadEmail = ref("");
const leadPhone = ref("");
const attending = ref<boolean | null>(null);
const events = ref({ ceremony: true, reception: true });
const hasSpouse = ref(false);
const spouseName = ref("");
const dietaryNotes = ref("");
const message = ref("");

// Modals / Flow states
const successModal = ref<"submit" | "edit" | "cancel" | null>(null);
const groupFullError = ref<string | null>(null);
const invalidLinkError = ref(false);

const populateStates = (data: RSVPData) => {
  group.value = typeof data.group === "object" ? data.group?.name : data.group;
  leadName.value = data.leadName;
  leadEmail.value = data.leadEmail;
  leadPhone.value = data.leadPhone || "";
  attending.value = data.attending;
  events.value = data.events || { ceremony: true, reception: true };
  hasSpouse.value = data.hasSpouse || false;
  spouseName.value = data.spouseName || "";
  dietaryNotes.value = data.dietaryNotes || "";
  message.value = data.message || "";
};

const loadData = async () => {
  invalidLinkError.value = false;
  groupFullError.value = null;
  existingRSVP.value = null;
  groupInfo.value = null;
  editToken.value = "";

  // 1. Check for token to edit/view existing RSVP
  const tokenQuery = route.query.token as string;
  if (tokenQuery) {
    try {
      const record = (await $fetch(`/api/rsvp/record?token=${tokenQuery}`)) as any;
      if (record) {
        existingRSVP.value = record;
        editToken.value = tokenQuery;
        populateStates(record);
        currentStep.value = 2;
        return;
      }
    } catch (err) {
      console.error("Failed to load RSVP by token:", err);
    }
  }

  // 2. Fallback to Local Storage for offline/unintegrated tests
  const saved = localStorage.getItem("thesweetunion_rsvp");
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as RSVPData;
      existingRSVP.value = parsed;
      populateStates(parsed);
      return;
    } catch (e) {
      console.error("Failed to parse saved RSVP", e);
    }
  }

  // 3. Validate Group parameter from link URL
  const groupQuery = route.query.group as string;
  if (groupQuery) {
    // Try database fetch
    try {
      const dbGroup = (await $fetch(`/api/rsvp/group?slug=${groupQuery}`)) as any;
      if (dbGroup) {
        groupInfo.value = dbGroup;
        group.value = dbGroup.name;

        if ((dbGroup.confirmedCount || 0) >= dbGroup.maxCapacity) {
          groupFullError.value = dbGroup.name;
        } else {
          groupFullError.value = null;
          currentStep.value = 2;
        }
        return;
      }
    } catch (err) {
      console.warn("Failed to find group in DB, trying fallback GROUPS", err);
    }

    // Static fallback
    const selected = GROUPS.find((g) => g.slug === groupQuery);
    if (selected) {
      group.value = selected.name;

      const savedCounts = localStorage.getItem("thesweetunion_group_counts");
      let counts: Record<string, number> = {};
      if (savedCounts) {
        try {
          counts = JSON.parse(savedCounts);
        } catch (e) {
          console.error(e);
        }
      } else {
        GROUPS.forEach((g) => {
          if (g.slug === "rcf-unilag") {
            counts[g.slug] = 29;
          } else if (g.slug === "victory-teens") {
            counts[g.slug] = 15;
          } else {
            counts[g.slug] = Math.floor(Math.random() * 8) + 5;
          }
        });
        localStorage.setItem("thesweetunion_group_counts", JSON.stringify(counts));
      }
      groupCounts.value = counts;

      const currentCount = counts[selected.slug] || 0;
      if (currentCount >= selected.capacity) {
        groupFullError.value = selected.name;
      } else {
        groupFullError.value = null;
        currentStep.value = 2;
      }
    } else {
      invalidLinkError.value = true;
    }
  } else {
    invalidLinkError.value = true;
  }
};

onMounted(() => {
  loadData();
  setTimeout(() => {
    mounted.value = true;
  }, 0);
});

watch(
  () => route.query.group,
  () => {
    loadData();
  },
);

watch(
  () => route.query.token,
  () => {
    loadData();
  },
);

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
  if (!leadName.value || !leadEmail.value) return;
  if (hasSpouse.value && !spouseName.value.trim()) return;
  if (!events.value.ceremony && !events.value.reception) return;

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

const handleSubmit = async () => {
  if (attending.value === null) return;

  const payload = {
    leadName: leadName.value,
    leadEmail: leadEmail.value,
    leadPhone: leadPhone.value,
    attending: attending.value,
    events: attending.value ? events.value : { ceremony: false, reception: false },
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
    events.value = { ceremony: true, reception: true };
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
  <div
    class="min-h-screen bg-warm-cream text-deep-espresso select-text flex flex-col"
    :class="isFormActive ? 'justify-center' : 'justify-between'"
  >
    <!-- Navigation -->
    <Navigation v-if="!isFormActive" />

    <!-- Main Content -->
    <main class="flex-1 flex items-center justify-center p-6" :class="isFormActive ? 'pt-6 pb-6' : 'pt-32 pb-16'">
      <div class="w-full max-w-2xl">
        <div v-if="!mounted" class="min-h-[300px] flex items-center justify-center">
          <div class="text-sm font-semibold tracking-wider uppercase font-display-cinzel animate-pulse">
            Loading RSVP details...
          </div>
        </div>

        <template v-else>
          <!-- 1. INVALID DIRECT LINK BLOCKER -->
          <div
            v-if="invalidLinkError && !existingRSVP"
            class="linen-card p-8 rounded-2xl border border-amber-gold/20 shadow-lg text-center space-y-5 animate-fade-in"
          >
            <div class="text-4xl">✉️</div>
            <h2 class="text-2xl sm:text-3xl font-bold font-display-cinzel text-deep-espresso">
              Personal Invitation Required
            </h2>
            <p class="font-body text-deep-espresso/80 text-sm leading-relaxed max-w-md mx-auto">
              To RSVP for our wedding, please click the personalized RSVP link sent directly to you by the couple. This
              helps us manage guest capacity and seating charts.
            </p>
            <p class="text-xs text-deep-espresso/50 font-body">
              If you have any questions or did not receive your link, please contact Uche or Adun.
            </p>
          </div>

          <!-- 2. CAPACITY ALLOCATION BLOCKER -->
          <div
            v-if="groupFullError"
            class="linen-card p-8 rounded-2xl border border-red-500/20 shadow-lg text-center space-y-5 animate-fade-in"
          >
            <div class="text-4xl">⚠️</div>
            <h3 class="font-heading text-2xl font-bold text-deep-espresso">Allocation Limit Reached</h3>
            <p class="font-body text-deep-espresso/80 text-sm sm:text-base leading-relaxed">
              We are so sorry, but the allocation spots for this group invitation are completely filled. Please reach
              out to the couple directly to coordinate manual adjustments.
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

          <!-- 3. CONFIRMED RSVP SUMMARY (No active form) -->
          <div
            v-if="existingRSVP && !isEditing && !groupFullError"
            class="linen-card p-6 sm:p-10 rounded-2xl border border-amber-gold/15 shadow-md space-y-8 animate-fade-in"
          >
            <div
              class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-gold/10 pb-6"
            >
              <div>
                <span class="text-[10px] uppercase tracking-wider font-bold text-amber-gold block mb-1">
                  RSVP Status
                </span>
                <div class="flex items-center gap-2.5">
                  <span
                    class="w-3.5 h-3.5 rounded-full"
                    :class="existingRSVP.attending ? 'bg-emerald-500' : 'bg-red-400 animate-pulse'"
                  />
                  <h3 class="font-heading text-2xl font-bold text-deep-espresso">
                    {{ existingRSVP.attending ? "You're Attending! 🎉" : "Declined Attendance" }}
                  </h3>
                </div>
              </div>
              <div class="text-left sm:text-right text-xs text-deep-espresso/60 font-body">
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

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm font-body">
              <div class="space-y-4">
                <div>
                  <h4 class="text-xs font-bold uppercase tracking-wider text-amber-gold mb-1">Guest</h4>
                  <p class="font-semibold text-base">{{ existingRSVP.leadName }}</p>
                  <p class="text-deep-espresso/70">{{ existingRSVP.leadEmail }}</p>
                  <p v-if="existingRSVP.leadPhone" class="text-deep-espresso/70">{{ existingRSVP.leadPhone }}</p>
                </div>
              </div>

              <div v-if="existingRSVP.attending" class="space-y-4">
                <div>
                  <h4 class="text-xs font-bold uppercase tracking-wider text-amber-gold mb-1">Events Selected</h4>
                  <ul class="space-y-1 bg-warm-cream/50 p-3 rounded-xl border border-amber-gold/5">
                    <li v-if="existingRSVP.events?.ceremony" class="flex items-center gap-2 text-deep-espresso">
                      <span class="text-emerald-600">✓</span> Holy Matrimony Ceremony
                    </li>
                    <li v-if="existingRSVP.events?.reception" class="flex items-center gap-2 text-deep-espresso">
                      <span class="text-emerald-600">✓</span> Grand Reception Banquet
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 class="text-xs font-bold uppercase tracking-wider text-amber-gold mb-1">Plus-One Details</h4>
                  <p v-if="existingRSVP.hasSpouse && existingRSVP.spouseName" class="text-deep-espresso/80">
                    Attending with spouse: <strong>{{ existingRSVP.spouseName }}</strong>
                  </p>
                  <p v-else class="text-deep-espresso/50 italic">Attending solo</p>
                </div>
              </div>
            </div>

            <div
              v-if="existingRSVP.dietaryNotes || existingRSVP.message"
              class="border-t border-amber-gold/10 pt-6 space-y-4 text-sm font-body"
            >
              <div v-if="existingRSVP.dietaryNotes">
                <h4 class="text-xs font-bold uppercase tracking-wider text-amber-gold mb-1">Dietary Restrictions</h4>
                <p class="text-deep-espresso/80 italic bg-amber-500/5 p-3 rounded-xl border border-amber-gold/10">
                  {{ existingRSVP.dietaryNotes }}
                </p>
              </div>

              <div v-if="existingRSVP.message">
                <h4 class="text-xs font-bold uppercase tracking-wider text-amber-gold mb-1">Message to the Couple</h4>
                <p
                  class="text-deep-espresso/80 whitespace-pre-line bg-soft-pearl/50 p-4 rounded-xl border border-amber-gold/10"
                >
                  &ldquo;{{ heading2 - smalle }}&rdquo;
                </p>
              </div>
            </div>

            <div class="border-t border-amber-gold/10 pt-6 flex flex-wrap gap-4 items-center justify-between">
              <button
                @click="isEditing = true"
                class="btn-primary"
              >
                Edit My RSVP
              </button>
              <button
                @click="handleCancelRSVP"
                class="px-6 py-2.5 rounded-xl border border-red-500/30 text-red-700 font-bold text-xs uppercase tracking-wider hover:bg-red-50 transition-all duration-300 focus:outline-none cursor-pointer"
              >
                Cancel RSVP
              </button>
            </div>
          </div>

          <!-- 4. ACTIVE FORM -->
          <form
            v-if="isFormActive"
            @submit.prevent="handleSubmit"
            class="linen-card w-full p-8 sm:p-12 rounded-3xl border border-amber-gold/15 shadow-2xl relative overflow-hidden select-text animate-fade-in"
          >
            <!-- Progress Line -->
            <div class="absolute top-0 left-0 right-0 h-1 bg-amber-gold/10">
              <div
                class="h-full bg-deep-terracotta transition-all duration-500"
                :style="{ width: `${getStepProgress}%` }"
              />
            </div>

            <!-- Branding Context -->
            <div
              class="flex justify-between items-center mb-10 text-xs font-bold uppercase tracking-widest text-deep-espresso/45"
            >
              <span>#TheSweetUnion</span>
              <span v-if="iheading2 - smallt - deep - terracotta">Editing Mode</span>
              <span v-else>RSVP Form</span>
            </div>

            <!-- STEP 2: ATTENDANCE STATUS -->
            <div v-if="currentStep === 2" class="space-y-8 animate-fade-in">
              <div class="space-y-2">
                <h2 class="text-3xl sm:text-4xl font-bold font-heading text-deep-espresso leading-tight">
                  Will you be joining us?
                </h2>
                <p class="font-body text-sm text-deep-espresso/60">
                  We hope you can make the trip to celebrate our marriage vows with us.
                </p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <button
                  type="button"
                  @click="handleAttendanceSelect(true)"
                  class="p-6 sm:p-8 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-all duration-300 cursor-pointer"
                  :class="
                    attending === true
                      ? 'bg-deep-terracotta/5 border-deep-terracotta shadow-md scale-[1.01]'
                      : 'bg-soft-pearl/30 border-amber-gold/15 opacity-80 hover:opacity-100'
                  "
                >
                  <span class="text-4xl">🎉</span>
                  <span class="font-heading text-xl font-bold text-deep-espresso">Yes, I will be there</span>
                  <span class="text-xs font-body text-deep-espresso/50 text-center">We will set a plate for you!</span>
                </button>

                <button
                  type="button"
                  @click="handleAttendanceSelect(false)"
                  class="p-6 sm:p-8 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-all duration-300 cursor-pointer"
                  :class="
                    attending === false
                      ? 'bg-muted-mauve/5 border-muted-mauve shadow-md scale-[1.01]'
                      : 'bg-soft-pearl/30 border-amber-gold/15 opacity-80 hover:opacity-100'
                  "
                >
                  <span class="text-4xl">✉️</span>
                  <span class="font-heading text-xl font-bold text-deep-espresso">Sadly, I cannot make it</span>
                  <span class="text-xs font-body text-deep-espresso/50 text-center">We will miss you.</span>
                </button>
              </div>
            </div>

            <!-- STEP 3: DETAILS -->
            <div v-if="currentStep === 3" class="space-y-8 animate-fade-in">
              <div class="space-y-2">
                <h2 class="text-3xl sm:text-4xl font-bold font-heading text-deep-espresso leading-tight">
                  Tell us about yourself
                </h2>
                <p class="font-body text-sm text-deep-espresso/60">
                  Please enter your contact information. This is an adult-only wedding.
                </p>
              </div>

              <div class="space-y-5 pt-2">
                <div class="space-y-1">
                  <label class="text-xs font-bold uppercase tracking-wider text-deep-espresso/60"
                    >Full Name (Required)</label
                  >
                  <input
                    type="text"
                    required
                    v-model="leadName"
                    class="w-full bg-soft-pearl/50 border border-amber-gold/25 rounded-xl px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta"
                    placeholder="Enter your first and last name"
                  />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label class="text-xs font-bold uppercase tracking-wider text-deep-espresso/60"
                      >Email Address (Required)</label
                    >
                    <input
                      type="email"
                      required
                      v-model="leadEmail"
                      class="w-full bg-soft-pearl/50 border border-amber-gold/25 rounded-xl px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta"
                      placeholder="name@example.com"
                    />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs font-bold uppercase tracking-wider text-deep-espresso/60">Phone Number</label>
                    <input
                      type="tel"
                      v-model="leadPhone"
                      class="w-full bg-soft-pearl/50 border border-amber-gold/25 rounded-xl px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta"
                      placeholder="e.g. +234..."
                    />
                  </div>
                </div>

                <div class="space-y-3 bg-soft-pearl/60 p-4 rounded-xl border border-amber-gold/15">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-amber-gold mb-1">
                    Which events are you joining?
                  </h4>
                  <div class="flex flex-col sm:flex-row gap-4">
                    <label class="flex items-center gap-2 cursor-pointer text-sm font-semibold select-none">
                      <input
                        type="checkbox"
                        v-model="events.ceremony"
                        class="w-4.5 h-4.5 accent-deep-terracotta rounded"
                      />
                      <span>Ceremony (1:00 PM)</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer text-sm font-semibold select-none">
                      <input
                        type="checkbox"
                        v-model="events.reception"
                        class="w-4.5 h-4.5 accent-deep-terracotta rounded"
                      />
                      <span>Reception (3:30 PM)</span>
                    </label>
                  </div>
                </div>

                <div class="space-y-4 pt-2">
                  <div class="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="hasSpouse"
                      v-model="hasSpouse"
                      class="w-4.5 h-4.5 accent-deep-terracotta rounded cursor-pointer"
                    />
                    <label htmlFor="hasSpouse" class="text-sm font-semibold cursor-pointer select-none">
                      I am attending with my spouse / plus-one
                    </label>
                  </div>

                  <div v-if="hasSpouse" class="space-y-1 pl-7 animate-fade-in">
                    <label class="text-xs font-bold uppercase tracking-wider text-deep-espresso/60 block"
                      >Spouse / Partner Name (Required)</label
                    >
                    <input
                      type="text"
                      required
                      v-model="spouseName"
                      class="w-full bg-soft-pearl/50 border border-amber-gold/25 rounded-xl px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta"
                      placeholder="Enter partner's name"
                    />
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-xs font-bold uppercase tracking-wider text-deep-espresso/60"
                    >Dietary restrictions (Optional)</label
                  >
                  <input
                    type="text"
                    v-model="dietaryNotes"
                    class="w-full bg-soft-pearl/50 border border-amber-gold/25 rounded-xl px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta"
                    placeholder="Allergies, vegetarian, vegan, etc."
                  />
                </div>
              </div>

              <div class="pt-4 flex items-center justify-end">
                <button
                  type="button"
                  @click="handleStep3Submit"
                  :disabled="
                    !leadName ||
                    !leadEmail ||
                    (hasSpouse && !spouseName.trim()) ||
                    (!events.ceremony && !events.reception)
                  "
                  class="px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow cursor-pointer"
                  :class="
                    !leadName ||
                    !leadEmail ||
                    (hasSpouse && !spouseName.trim()) ||
                    (!events.ceremony && !events.reception)
                      ? 'bg-deep-espresso/10 text-deep-espresso/45 cursor-not-allowed shadow-none'
                      : 'btn-primary'
                  "
                >
                  Continue
                </button>
              </div>
            </div>

            <!-- STEP 4: MESSAGE & SUBMIT -->
            <div v-if="currentStep === 4" class="space-y-8 animate-fade-in">
              <div class="space-y-2">
                <h2 class="heading2-small font-bold font-heading text-deep-espresso leading-tight">
                  Greetings for the couple
                </h2>
                <p class="font-body text-sm text-deep-espresso/60">
                  Leave a congratulatory message or prayer for Uche & Adun (Optional).
                </p>
              </div>

              <div class="space-y-4 pt-2">
                <div class="space-y-1">
                  <label class="text-xs font-bold uppercase tracking-wider text-deep-espresso/60">Message</label>
                  <textarea
                    v-model="message"
                    rows="6"
                    class="w-full bg-soft-pearl/50 border border-amber-gold/25 rounded-xl px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta resize-none"
                    placeholder="Share your congrats message..."
                  />
                </div>
              </div>

              <div class="pt-4 flex items-center justify-end">
                <button
                  type="submit"
                  class="btn-primary px-8 py-3.5"
                >
                  {{ isEditing ? "Save RSVP Changes" : "Submit My RSVP" }}
                </button>
              </div>
            </div>

            <!-- Back Navigation inside Form -->
            <div
              class="border-t border-amber-gold/10 mt-8 pt-4 flex justify-between items-center text-xs font-bold uppercase tracking-wider"
            >
              <button
                v-if="currentStep > 2"
                type="button"
                @click="handleStepBack"
                class="text-deep-espresso/60 hover:text-deep-espresso transition-colors cursor-pointer"
              >
                ← Back
              </button>
              <div v-else />

              <button
                type="button"
                @click="
                  isEditing = false;
                  existingRSVP ? populateStates(existingRSVP) : router.push('/rsvp');
                "
                class="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
              >
                Exit Form
              </button>
            </div>
          </form>
        </template>
      </div>
    </main>

    <!-- Footer -->
    <Footer v-if="!isFormActive" />

    <!-- SUCCESS MODALS -->
    <div
      v-if="successModal"
      class="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4 animate-fade-in animate-duration-200"
    >
      <div
        class="linen-card w-full max-w-md p-8 rounded-2xl border border-amber-gold/20 shadow-2xl text-center relative animate-scale-up animate-duration-200"
      >
        <div class="text-4xl mb-4">
          {{ successModal === "cancel" ? "🗑️" : "🎉" }}
        </div>

        <h3 class="font-heading text-2xl font-bold text-deep-espresso mb-2">
          {{
            successModal === "cancel"
              ? "RSVP Removed"
              : successModal === "edit"
                ? "RSVP Changes Saved!"
                : "Thank You So Much!"
          }}
        </h3>

        <p class="font-body text-deep-espresso/80 text-sm leading-relaxed mb-6">
          <template v-if="successModal === 'cancel'">
            Your RSVP registration details have been successfully deleted from this browser session.
          </template>
          <template v-else-if="successModal === 'edit'">
            Your details have been successfully updated. We look forward to celebrating together in Lagos.
          </template>
          <template v-else-if="successModal === 'submit' && attending === true">
            You're officially on the list! We cannot wait to celebrate our union with you. We have saved your
            confirmation card details.
          </template>
          <template v-else-if="successModal === 'submit' && attending === false">
            Thank you for letting us know. We will surely miss your presence, but we appreciate your thoughts and
            support!
          </template>
        </p>

        <button
          @click="successModal = null"
          class="btn-primary"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
