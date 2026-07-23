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

const handleInput = (value: string) => {
  emit("update:modelValue", value);
};

const handleBlur = (value: string) => {
  emit("blur", value);
};

const inputOptions = computed(() => ({
  formatOnDisplay: true,
  autoPlaceholder: "polite",
  separateDialCode: true,
  nationalMode: false,
  autoHideDialCode: false,
  initialCountry: "auto",
  geoIpLookup: (callback: (code: string) => void) => {
    fetch("https://ipapi.co/json")
      .then((res) => res.json())
      .then((data) => callback(data.country_code))
      .catch(() => callback("NG"));
  },
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
