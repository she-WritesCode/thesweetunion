<script setup lang="ts">
import RsvpLinkField from "~/components/admin/RsvpLinkField.vue";
import RsvpEditLinkField from "~/components/admin/RsvpEditLinkField.vue";
import CountField from "~/components/admin/CountField.vue";
import CheckInScanner from "~/components/admin/CheckInScanner.vue";
import AccessCardPreview from "~/components/admin/AccessCardPreview.vue";
import SendAsoebiReminderButton from "~/components/admin/SendAsoebiReminderButton.vue";
import SendWhatsAppButton from "~/components/admin/SendWhatsAppButton.vue";
import SendPassModal from "~/components/admin/SendPassModal.vue";
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
 * Top-level keys: Custom Detail View components referenced via displayCustom("ComponentName")
 * `fields`: Field-level components ("<collection-slug>.<fieldName>")
 * `collectionList`: List & View components referenced in `collection.admin.components.beforeListTable`
 */
const adminComponents = {
  // Detail View Custom Components (referenced by displayCustomComponent / displayCustom)
  AccessCardPreview,
  SendAsoebiReminderButton,
  SendWhatsAppButton,
  SendPassModal,
  RsvpEditLinkField,
  RsvpLinkField,
  CheckInScanner,

  fields: {
    // rsvp_groups collection
    "rsvp_groups.rsvpLink": RsvpLinkField,
    "rsvp_groups.confirmedCount": CountField,
    "rsvp_groups.declinedCount": CountField,
    "wishlist_items.amountRaised": CountField,
    "wishlist_items.contributorCount": CountField,
    "wishlist_items.reservedCount": CountField,
    // check_ins collection — QR scanner panel
    "check_ins.checkInScanner": CheckInScanner,
    // rsvp_records collection — invitation & reminder tools
    "rsvp_records.rsvpEditLink": RsvpEditLinkField,
    "rsvp_records.accessCardPreview": AccessCardPreview,
    "rsvp_records.asoebiReminder": SendAsoebiReminderButton,
    "rsvp_records.sendWhatsApp": SendWhatsAppButton,
    "rsvp_records.sendPassModal": SendPassModal,
    "rsvp_records.passModal": SendPassModal,
    sendPassModal: SendPassModal,
    passModal: SendPassModal,
    asoebiReminder: SendAsoebiReminderButton,
    accessCardPreview: AccessCardPreview,
    rsvpEditLink: RsvpEditLinkField,
    sendWhatsApp: SendWhatsAppButton,
  },
  collectionList: {
    RsvpListSummary: RsvpListSummary,
    WishlistListSummary: WishlistListSummary,
    CheckInListSummary: CheckInListSummary,
    GroupListSummary: GroupListSummary,
  },
  collectionView: {
    RsvpListSummary: RsvpListSummary,
    WishlistListSummary: WishlistListSummary,
    CheckInListSummary: CheckInListSummary,
    GroupListSummary: GroupListSummary,
  },
};
</script>

<template>
  <ClientOnly>
    <DyrectedAdmin api-path="/api/dyrected" :components="adminComponents" />
  </ClientOnly>
</template>
