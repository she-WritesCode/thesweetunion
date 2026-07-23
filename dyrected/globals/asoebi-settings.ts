import { defineGlobal, defineTextField } from "@dyrected/core";

export const asoebiSettings = defineGlobal({
  slug: "asoebi_settings",
  label: "Asoebi Settings",
  fields: [
    defineTextField({
      name: "bankName",
      label: "Bank Name",
      required: true,
      admin: { description: "The bank name for Asoebi payment transfers." },
    }),
    defineTextField({
      name: "accountNumber",
      label: "Account Number",
      required: true,
      admin: { description: "The bank account number." },
    }),
    defineTextField({
      name: "accountName",
      label: "Account Name",
      required: true,
      admin: { description: "The name of the bank account holder." },
    }),
    defineTextField({
      name: "whatsAppContact",
      label: "WhatsApp Contact",
      required: true,
      admin: { description: "WhatsApp number or contact details where guests send proof of payment." },
    }),
  ],
  access: {
    read: "true",
    update: "user != null",
  },
});
