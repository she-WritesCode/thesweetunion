import type { CollectionBeforeChangeHook } from "@dyrected/core";

export const enforceRsvpCapacity: CollectionBeforeChangeHook = async ({ data, operation, req }: any) => {
  if (operation !== "create") return data;

  data.submittedAt = new Date().toISOString();
  if (!data.editToken) {
    data.editToken = crypto.randomUUID();
  }

  // Duplicate email check
  const existing = await req.db.find({
    collection: "rsvp_records",
    where: { leadEmail: { equals: data.leadEmail } },
    limit: 1,
  });
  if (existing.total > 0) {
    throw new Error("It looks like you've already RSVP'd. Check your confirmation email to make any changes.");
  }

  const groupId = typeof data.group === "object" ? data.group.id : data.group;

  if (data.attending) {
    const seats = data.hasSpouse ? 2 : 1;
    const result = await req.db.update({
      collection: "rsvp_groups",
      id: groupId,
      data: { confirmedCount: { $increment: seats } },
      where: {
        $and: [
          { confirmedCount: { $add: [seats, "{confirmedCount}"] } },
          { maxCapacity: { $gte: "{confirmedCount}" } },
        ],
      },
    });
    if (!result) {
      throw new Error("Sorry, there are no more spots available. Please contact the couple directly.");
    }
  } else {
    await req.db.update({
      collection: "rsvp_groups",
      id: groupId,
      data: { declinedCount: { $increment: 1 } },
    });
  }

  return data;
};
