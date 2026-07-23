<script setup lang="ts">
import RsvpLinkField from "~/components/admin/RsvpLinkField.vue";
import RsvpEditLinkField from "~/components/admin/RsvpEditLinkField.vue";
import CountField from "~/components/admin/CountField.vue";
import CheckInScanner from "~/components/admin/CheckInScanner.vue";
import AccessCardPreview from "~/components/admin/AccessCardPreview.vue";
import SendAsoebiReminderButton from "~/components/admin/SendAsoebiReminderButton.vue";

definePageMeta({
  layout: false,
  pageTransition: false,
  layoutTransition: false,
});
useHead({
  bodyAttrs: {
    class: "cms-admin-page",
  },
});

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
    // rsvp_groups collection
    "rsvp_groups.rsvpLink": RsvpLinkField,
    "rsvp_groups.rsvpEditLink": RsvpEditLinkField,
    "rsvp_groups.confirmedCount": CountField,
    "rsvp_groups.declinedCount": CountField,
    "wishlist_items.amountRaised": CountField,
    "wishlist_items.contributorCount": CountField,
    "wishlist_items.reservedCount": CountField,
    // check_ins collection — QR scanner panel
    "check_ins.checkInScanner": CheckInScanner,
    // rsvp_records collection — invitation tools
    "rsvp_records.accessCardPreview": AccessCardPreview,
    "rsvp_records.asoebiReminder": SendAsoebiReminderButton,
  },
};
</script>

<template>
  <ClientOnly>
    <DyrectedAdmin api-path="/api/dyrected" :components="adminComponents" />
  </ClientOnly>
</template>
