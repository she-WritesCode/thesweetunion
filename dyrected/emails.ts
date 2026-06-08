// ─── Palette ─────────────────────────────────────────────────────────────────

const BASE = "#FAF7F5";
const CARD = "#F3EDEB";
const TEXT = "#30222A";
const MUTED = "#6B5060";
const ACCENT = "#B54E24";
const BORDER = "#D9C9C4";

// ─── Primitives ───────────────────────────────────────────────────────────────

function heading(text: string): string {
  return `<h1 style="margin:0 0 4px;font-size:24px;font-family:Georgia,serif;color:${TEXT};font-weight:normal;">${text}</h1>`;
}

function subheading(text: string): string {
  return `<h2 style="margin:0 0 4px;font-size:18px;font-family:Georgia,serif;color:${TEXT};font-weight:normal;">${text}</h2>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;color:${MUTED};line-height:1.75;font-family:Georgia,serif;">${text}</p>`;
}

function sectionLabel(text: string): string {
  return `<p style="margin:16px 0 6px;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:${MUTED};font-family:Georgia,serif;">${text}</p>`;
}

function quote(text: string): string {
  return `<p style="margin:0;font-size:13px;color:${TEXT};font-style:italic;line-height:1.75;font-family:Georgia,serif;">&ldquo;${text}&rdquo;</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${BORDER};margin:20px 0;" />`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:${MUTED};width:140px;vertical-align:top;font-family:Georgia,serif;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:${TEXT};font-weight:600;font-family:Georgia,serif;">${value}</td>
  </tr>`;
}

function table(...rows: string[]): string {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;">${rows.join("")}</table>`;
}

function eventList(names: string[], bullet = "✓"): string {
  if (!names.length) return "";
  const items = names
    .map((n) => `<li style="padding:4px 0;font-size:13px;color:${TEXT};font-family:Georgia,serif;">${bullet} ${n}</li>`)
    .join("");
  return `<ul style="margin:0;padding:0 0 0 4px;list-style:none;">${items}</ul>`;
}

function ctaButton(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:${ACCENT};color:#fff;text-decoration:none;border-radius:8px;font-size:13px;letter-spacing:1px;text-transform:uppercase;font-family:Georgia,serif;">${text}</a>`;
}

// ─── Layout wrapper ───────────────────────────────────────────────────────────

function layout(...body: string[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:${BASE};font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BASE};padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;">

        <!-- Header -->
        <tr><td align="center" style="padding-bottom:24px;">
          <p style="margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${MUTED};font-family:Georgia,serif;">Adun &amp; Uche</p>
          <p style="margin:4px 0 0;font-size:13px;letter-spacing:2px;color:${MUTED};font-family:Georgia,serif;">#TheSweetUnion</p>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:${CARD};border:1px solid ${BORDER};border-radius:12px;padding:36px 32px;">
          ${body.join("")}
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:24px;">
          <p style="margin:0;font-size:11px;color:${MUTED};line-height:1.6;font-family:Georgia,serif;">
            Your details are used only to manage your wedding RSVP. They will not be shared.<br/>
            Questions? Reach out to Adun or Uche directly.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Guest: RSVP Submitted ────────────────────────────────────────────────────

export function rsvpConfirmationEmail({
  leadName,
  attending,
  hasSpouse,
  spouseName,
  eventNames,
  editLink,
}: {
  leadName: string;
  attending: boolean;
  hasSpouse: boolean;
  spouseName?: string;
  eventNames: string[];
  editLink: string;
}): string {
  if (!attending) {
    return layout(
      heading(`We'll miss you, ${leadName}.`),
      paragraph(
        "Thank you for letting us know you won't be able to make it. We appreciate you taking the time to respond, and we'll be thinking of you on the day.",
      ),
      paragraph("If your plans change before the RSVP cutoff, use the link below to update your response."),
      ctaButton("Update My Response", editLink),
    );
  }

  const partyLine = hasSpouse && spouseName ? `You &amp; ${spouseName}` : "Solo attendance";

  return layout(
    heading("You're on the list! 🎉"),
    paragraph(`We've received your RSVP, ${leadName}. We cannot wait to celebrate with you.`),
    divider(),
    table(row("Guest", leadName), row("Party", partyLine)),
    sectionLabel("Events"),
    eventList(eventNames),
    divider(),
    paragraph(
      "Your personal invitation card will be sent closer to the wedding date. Need to make a change? Use the link below — it's your unique edit link, keep it safe.",
    ),
    ctaButton("Edit My RSVP", editLink),
  );
}

// ─── Guest: RSVP Updated ─────────────────────────────────────────────────────

export function rsvpUpdatedEmail({
  leadName,
  attending,
  hasSpouse,
  spouseName,
  eventNames,
  editLink,
}: {
  leadName: string;
  attending: boolean;
  hasSpouse: boolean;
  spouseName?: string;
  eventNames: string[];
  editLink: string;
}): string {
  const partyLine = attending ? (hasSpouse && spouseName ? `You &amp; ${spouseName}` : "Solo attendance") : "Declined";

  return layout(
    heading(`RSVP updated, ${leadName}.`),
    paragraph("Here's a summary of your updated RSVP."),
    divider(),
    table(row("Status", attending ? "Attending ✓" : "Declined"), row("Party", partyLine)),
    attending && eventNames.length ? sectionLabel("Events") + eventList(eventNames) : "",
    divider(),
    paragraph("Need to change something again? Use your edit link below."),
    ctaButton("Edit My RSVP", editLink),
  );
}

// ─── Guest: RSVP Cancelled ───────────────────────────────────────────────────

export function rsvpCancelledEmail({ leadName }: { leadName: string }): string {
  return layout(
    heading("RSVP Cancelled"),
    paragraph(`Hi ${leadName}, your RSVP has been successfully cancelled and your spot has been released.`),
    divider(),
    paragraph(
      "If you change your mind before the RSVP closes, reach out to Adun or Uche directly and they can resend your invitation link.",
    ),
  );
}

// ─── Admin: New RSVP notification ────────────────────────────────────────────

export function adminRsvpNotificationEmail({
  leadName,
  leadEmail,
  leadPhone,
  groupName,
  attending,
  hasSpouse,
  spouseName,
  eventNames,
  message,
  dashboardLink,
}: {
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  groupName: string;
  attending: boolean;
  hasSpouse: boolean;
  spouseName?: string;
  eventNames: string[];
  message?: string;
  dashboardLink: string;
}): string {
  const seats = attending ? (hasSpouse ? 2 : 1) : 0;

  return layout(
    heading(`New RSVP — ${attending ? "Attending 🎉" : "Declined"}`),
    paragraph(`${leadName} has submitted an RSVP.`),
    divider(),
    table(
      row("Name", leadName),
      row("Email", leadEmail),
      row("WhatsApp", leadPhone),
      row("Group", groupName),
      row("Status", attending ? `Attending (${seats} seat${seats > 1 ? "s" : ""})` : "Declined"),
      hasSpouse && spouseName ? row("Spouse", spouseName) : "",
    ),
    attending && eventNames.length ? sectionLabel("Events") + eventList(eventNames, "•") : "",
    message ? divider() + sectionLabel("Message to the couple") + quote(message) : "",
    ctaButton("View in Dashboard", dashboardLink),
  );
}
