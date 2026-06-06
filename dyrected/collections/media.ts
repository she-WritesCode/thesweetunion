import type { CollectionConfig } from "@dyrected/core";
import { publicRead } from "../access/public.ts";
import { adminOnly } from "../access/admin.ts";

export const media: CollectionConfig = {
  slug: "media",
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
    { name: "alt", type: "text", label: "Alt Text", required: true },
    { name: "caption", type: "textarea", label: "Caption" },
  ],
  access: {
    read: "true",
    create: "user != null",
    update: "user != null",
    delete: "user != null",
  },
};
