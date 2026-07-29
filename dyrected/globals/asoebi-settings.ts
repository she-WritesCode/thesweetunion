import { defineGlobal, defineTextField, defineNumberField, defineRelationshipField } from "@dyrected/core";

export const asoebiSettings = defineGlobal({
  slug: "asoebi_settings",
  label: "Asoebi Settings",
  fields: [
    defineRelationshipField({
      name: "fabricImages",
      label: "Fabric & Headwear Photos",
      relationTo: "media",
      hasMany: true,
      admin: {
        description: "Photos of the Aso Ebi fabric and headwear (1 to 4 photos). Displayed on the Aso Ebi page.",
      },
    }),
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
        width: "50%",
      },
    }),
    defineNumberField({
      name: "asoOkeFemalePrice",
      label: "Female Aso Oke (Gele/Ipele) Price (NGN)",
      defaultValue: 8000,
      admin: {
        description: "Price for Female Aso Oke (Gele / Ipele) in Naira.",
        format: { type: "currency", currency: "NGN" },
        width: "50%",
      },
    }),
    defineTextField({
      name: "bankName",
      label: "Bank Name",
      required: true,
      admin: { description: "The bank name for Asoebi payment transfers.", width: "50%" },
    }),
    defineTextField({
      name: "accountNumber",
      label: "Account Number",
      required: true,
      admin: { description: "The bank account number.", width: "50%" },
    }),
    defineTextField({
      name: "accountName",
      label: "Account Name",
      required: true,
      admin: { description: "The name of the bank account holder.", width: "50%" },
    }),
    defineTextField({
      name: "whatsAppContact",
      label: "WhatsApp Contact",
      required: true,
      admin: { description: "WhatsApp number or contact details where guests send proof of payment.", width: "50%" },
    }),
  ],
  access: {
    read: "true",
    update: "user != null",
  },
});
