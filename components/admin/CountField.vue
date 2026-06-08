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
console.log(props.value);
/** The RSVP URL is: <appUrl>/rsvp?group=<slug> */
const count = computed(() => props.value as string | undefined);
</script>

<template>
  <div class="rsvp-count-field">
    <!-- Count Label -->
    <p class="rsvp-count-field__count">{{ count ?? "0" }}</p>
  </div>
</template>

<style scoped>
.rsvp-count-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rsvp-count-field__count {
  font-size: 1.35rem;
  font-weight: 600;
}
</style>
