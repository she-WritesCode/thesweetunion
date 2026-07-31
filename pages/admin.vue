<script setup lang="ts">
import RsvpLinkField from "~/components/admin/RsvpLinkField.vue";
import RsvpEditLinkField from "~/components/admin/RsvpEditLinkField.vue";
import CountField from "~/components/admin/CountField.vue";
import CheckInScanner from "~/components/admin/CheckInScanner.vue";
import AccessCardPreview from "~/components/admin/AccessCardPreview.vue";
import SendAsoebiReminderButton from "~/components/admin/SendAsoebiReminderButton.vue";
import RsvpListSummary from "~/components/admin/RsvpListSummary.vue";
import WishlistListSummary from "~/components/admin/WishlistListSummary.vue";
import CheckInListSummary from "~/components/admin/CheckInListSummary.vue";
import GroupListSummary from "~/components/admin/GroupListSummary.vue";

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
 * Custom components injected into the Dyrected Admin UI.
 *
 * `fields`: Field-level components ("<collection-slug>.<fieldName>")
 * `components`: List & View components referenced in `collection.admin.components.beforeList`
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
  collectionList: {
    "RsvpListSummary": RsvpListSummary,
    "WishlistListSummary": WishlistListSummary,
    "CheckInListSummary": CheckInListSummary,
    "GroupListSummary": GroupListSummary,
  },
};
</script>

<template>
  <ClientOnly>
    <DyrectedAdmin api-path="/api/dyrected" :components="adminComponents" />
  </ClientOnly>
</template>
