// Pure string-building for wishlist reminder messages — no I/O, so it's safe to
// import from both server routes (server/api/reminders/*) and admin Vue
// components (the "Send Reminder" action preview/edit dialog). Keeping this in
// one place means the automated cron and the manual admin send always agree
// on wording unless an admin deliberately edits the preview.

export type ReminderItem = { name: string; amount: number };

export type ReminderSettings = {
  coupleNames: string;
  senderName: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
};

export function buildWhatsAppReminderText(
  guestName: string,
  items: ReminderItem[],
  settings: ReminderSettings,
): string {
  const { coupleNames, senderName, bankName, accountNumber, accountName } = settings;
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const itemLines = items.map((i) => `- ${i.name} — ₦${i.amount.toLocaleString("en-US")}`).join("\n");
  const bankLines =
    bankName || accountNumber || accountName
      ? `\n\nYou can make payment using the details below:\n\nBank: ${bankName}\nAccount Number: ${accountNumber}\nAccount Name: ${accountName}`
      : "";

  return (
    `Hi ${guestName} 😊\n\n` +
    `This is ${senderName}. I'm reaching out regarding the wedding of ${coupleNames}. ` +
    `You recently reserved a gift on their wedding registry and asked for a reminder, so here it is. 😊\n\n` +
    `You reserved:\n\n${itemLines}\n\nTotal: ₦${total.toLocaleString("en-US")}` +
    `${bankLines}\n\n` +
    `Thank you so much for celebrating with ${coupleNames}! \n#thesweetunion 🤍`
  );
}
