import { defineGlobal, defineTextField, defineNumberField } from "@dyrected/core";

export const asoebiSettings = defineGlobal({
  slug: "asoebi_settings",
  label: "Asoebi Settings",
  fields: [
    defineNumberField({
      name: "pricePerYard",
      label: "Asoebi Fabric Price Per Yard (NGN)",
      required: true,
      defaultValue: 10000,
      admin: {
        description: "Price per yard of Asoebi fabric in Naira.",
        format: { type: "currency", currency: "NGN" },
      },
    }),
    defineNumberField({
      name: "asoOkeMalePrice",
      label: "Male Aso Oke (Fila/Cap) Price (NGN)",
      defaultValue: 8000,
      admin: {
        description: "Price for Male Aso Oke (Fila / Cap) in Naira.",
        format: { type: "currency", currency: "NGN" },
      },
    }),
    defineNumberField({
      name: "asoOkeFemalePrice",
      label: "Female Aso Oke (Gele/Ipele) Price (NGN)",
      defaultValue: 8000,
      admin: {
        description: "Price for Female Aso Oke (Gele / Ipele) in Naira.",
        format: { type: "currency", currency: "NGN" },
      },
    }),
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
