import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@dyrected/sdk";

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { identifier } = body;

  if (!identifier || typeof identifier !== "string") {
    throw createError({ statusCode: 400, message: "Please provide an email or phone number to look up." });
  }

  const query = identifier.trim();
  const queryEmail = query.toLowerCase();
  const queryPhoneClean = cleanPhone(query);

  const config = useRuntimeConfig();
  const client = createClient({
    baseUrl: config.public.dyrectedUrl,
    apiKey: config.dyrectedApiKey,
  });

  // 1. Search by email exact match first
  if (queryEmail.includes("@")) {
    const emailSearch = await client.collection("rsvp_records").find({
      where: { leadEmail: { equals: queryEmail } },
      limit: 1,
      depth: 1,
    });

    if (emailSearch.total > 0 && emailSearch.docs[0]) {
      return { found: true, record: emailSearch.docs[0] };
    }
  }

  // 2. Search by exact phone or phone match
  const allRecords = await client.collection("rsvp_records").find({
    limit: 500,
    depth: 1,
  });

  const matched = allRecords.docs.find((rec: any) => {
    if (!rec) return false;
    if (rec.leadEmail && rec.leadEmail.toLowerCase() === queryEmail) return true;
    if (rec.leadPhone) {
      const recPhoneClean = cleanPhone(rec.leadPhone);
      if (queryPhoneClean && recPhoneClean && (recPhoneClean.endsWith(queryPhoneClean) || queryPhoneClean.endsWith(recPhoneClean))) {
        return true;
      }
    }
    return false;
  });

  if (matched) {
    return { found: true, record: matched };
  }

  return { found: false, message: "No RSVP or Aso Ebi record found for the details provided." };
});
