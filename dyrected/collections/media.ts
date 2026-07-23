import { defineCollection, defineTextField, defineTextareaField } from "@dyrected/core";

export const media = defineCollection({
  slug: "media",
  labels: { singular: "Media", plural: "Media" },
  admin: {
    group: "Content",
  },
  upload: {
    allowedMimeTypes: ["image/*"],
    maxFileSize: 30_000_000,
    imageSizes: [
      { name: "thumbnail", width: 300, height: 300, crop: "center" },
      { name: "card", width: 800, height: 450, crop: "center" },
      { name: "hero", width: 1920, fit: "contain" },
    ],
  },
  fields: [
    defineTextField({ name: "alt", label: "Alt Text", required: true }),
    defineTextareaField({ name: "caption", label: "Caption" }),
  ],
  access: {
    read: "true",
    create: "user != null",
    update: "user != null",
    delete: "user != null",
  },
});
