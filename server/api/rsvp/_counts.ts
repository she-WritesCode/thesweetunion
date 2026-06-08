import { createClient } from "@dyrected/sdk";

type Client = ReturnType<typeof createClient>;

export async function syncGroupCounts(client: Client, groupId: string) {
  const all = await client.collection("rsvp_records").find({
    where: { group: { equals: groupId } },
    limit: 500,
  });

  const confirmedCount = all.docs
    .filter((r: any) => r.attending)
    .reduce((n: number, r: any) => n + (r.hasSpouse ? 2 : 1), 0);

  const declinedCount = all.docs.filter((r: any) => !r.attending).length;

  await client.collection("rsvp_groups").update(groupId, {
    confirmedCount,
    declinedCount,
  });

  return { confirmedCount, declinedCount };
}
