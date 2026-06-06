<script setup lang="ts">
import RsvpLinkField from '~/components/admin/RsvpLinkField.vue'

definePageMeta({
  layout: false
})
useHead({
  bodyAttrs: {
    class: 'cms-admin-page'
  }
})

/**
 * Custom field components injected into the Dyrected Admin UI.
 *
 * Key format:  "<collection-slug>.<fieldName>"
 * This must match the `admin.component` value in the collection schema.
 *
 * The Vue bridge in @dyrected/vue automatically wraps each component
 * so it can render inside the React-based Admin UI (no extra work needed).
 */
const adminComponents = {
  fields: {
    // rsvp_groups collection → rsvpLink field
    'rsvp_groups.rsvpLink': RsvpLinkField,
  }
}
</script>

<template>
  <ClientOnly>
    <DyrectedAdmin api-path="/api/dyrected" :components="adminComponents" />
  </ClientOnly>
</template>
