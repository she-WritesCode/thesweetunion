import type { GlobalConfig } from "@dyrected/core";

export const asoebiSettings: GlobalConfig = {
  slug: "asoebi_settings",
  label: "Asoebi Settings",
  fields: [
    {
      name: "bankName",
      type: "text",
      label: "Bank Name",
      required: true,
      admin: { description: "The bank name for Asoebi payment transfers." },
    },
    {
      name: "accountNumber",
      type: "text",
      label: "Account Number",
      required: true,
      admin: { description: "The bank account number." },
    },
    {
      name: "accountName",
      type: "text",
      label: "Account Name",
      required: true,
      admin: { description: "The name of the bank account holder." },
    },
    {
      name: "whatsAppContact",
      type: "text",
      label: "WhatsApp Contact",
      required: true,
      admin: { description: "WhatsApp number or contact details where guests send proof of payment." },
    },
  ],
  access: {
    read: "true",
    update: "user != null",
  },
};
