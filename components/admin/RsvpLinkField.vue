<script setup lang="ts">
import { computed, ref } from "vue";
import { useRuntimeConfig } from "#imports";

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
const appUrl = computed(() => config.public.appUrl || window?.location.origin);

/** The RSVP URL is: <appUrl>/rsvp?group=<slug> */
const slug = computed(() => props.context?.siblingData?.slug as string | undefined);
const rsvpUrl = computed(() => {
  if (!slug.value) return null;
  return `${appUrl.value}/rsvp?group=${slug.value}`;
});

const copied = ref(false);

async function copyLink() {
  if (!rsvpUrl.value) return;
  try {
    await navigator.clipboard.writeText(rsvpUrl.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Fallback for older browsers / HTTP contexts
    const el = document.createElement("input");
    el.value = rsvpUrl.value;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
}
</script>

<template>
  <div class="rsvp-link-field">
    <p v-if="!slug" class="rsvp-link-field__empty">Save the group first to generate the RSVP link.</p>

    <template v-else>
      <div class="rsvp-link-field__row">
        <span class="rsvp-link-field__url" :title="rsvpUrl ?? ''">{{ rsvpUrl }}</span>

        <button
          type="button"
          class="rsvp-link-field__btn"
          :class="{ 'rsvp-link-field__btn--copied': copied }"
          @click="copyLink"
          :aria-label="copied ? 'Copied!' : 'Copy RSVP link'"
        >
          <!-- Clipboard icon (heroicons outline) -->
          <svg
            v-if="!copied"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <!-- Checkmark icon when copied -->
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
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
          <span>{{ copied ? "Copied!" : "Copy link" }}</span>
        </button>
      </div>

      <p class="rsvp-link-field__hint">
        {{ field?.admin?.description ?? "Share this link with the guest group so they can RSVP." }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.rsvp-link-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px 12px;
}

.rsvp-link-field__url {
  flex: 1;
  font-family: ui-monospace, "Cascadia Code", monospace;
  font-size: 0.82rem;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rsvp-link-field__btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 5px 12px;
  border: 1px solid #c0a080;
  border-radius: 5px;
  background: #fff;
  color: #7a5c38;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 150ms,
    color 150ms,
    border-color 150ms;
  line-height: 1;
}

.rsvp-link-field__btn:hover {
  background: #fdf4ec;
  border-color: #a07040;
}

.rsvp-link-field__btn--copied {
  background: #edf7ee;
  border-color: #5a9e6f;
  color: #2d7a47;
}

.rsvp-link-field__hint {
  font-size: 0.78rem;
  color: #888;
  margin: 0;
}
</style>
