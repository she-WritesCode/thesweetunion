<script setup lang="ts">
import { VueTelInput } from "vue-tel-input";

interface PhoneInputProps {
  modelValue: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
}

const props = defineProps<PhoneInputProps>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  blur: [value: string];
}>();

/**
 * vue-tel-input calls onInput with (formattedNumber, phoneObject).
 * We prefer the E.164 form from phoneObject when the number is valid;
 * otherwise fall back to the raw formatted string so the user can still type.
 */
const handleInput = (_formattedNumber: string, phoneObject: any) => {
  const e164 =
    phoneObject?.valid && phoneObject?.number
      ? (phoneObject.number as string)
      : _formattedNumber;
  emit("update:modelValue", e164);
};

const handleBlur = (value: string) => {
  emit("blur", value);
};

const inputOptions = computed(() => ({
  autocomplete: "tel",
}));
</script>

<template>
  <div class="space-y-1">
    <label v-if="label" class="input-label">{{ label }}</label>
    <ClientOnly>
      <VueTelInput
        :model-value="props.modelValue"
        :placeholder="props.placeholder || 'Phone number'"
        :required="props.required"
        :disabled="props.disabled"
        :valid-class="'bg-soft-pearl/50 border border-emerald-400 rounded-xl! px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-emerald-500'"
        :invalid-class="'bg-soft-pearl/50 border border-red-400 rounded-xl! px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-red-500'"
        :input-classes="'bg-soft-pearl/50 border border-amber-gold/25 rounded-xl! px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta'"
        :dropdown-hover-class="'bg-deep-espresso/5'"
        :dropdown-selected-class="'bg-amber-gold/10'"
        :preferred-countries="['NG']"
        default-country="NG"
        :input-options="inputOptions"
        @on-input="handleInput"
        @blur="handleBlur"
      />
      <template #fallback>
        <input
          type="tel"
          :value="props.modelValue"
          :placeholder="props.placeholder || 'Phone number'"
          class="w-full bg-soft-pearl/50 border border-amber-gold/25 rounded-xl px-4 py-3 text-sm text-deep-espresso focus:outline-none focus:border-deep-terracotta"
        />
      </template>
    </ClientOnly>
    <p v-if="error" class="text-xs text-red-500 mt-1">{{ error }}</p>
  </div>
</template>

