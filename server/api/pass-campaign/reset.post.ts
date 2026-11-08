import { defineEventHandler, createError } from "h3";
import { requireAdmin } from "~~/server/utils/require-admin";
import postgres from "postgres";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const config = useRuntimeConfig();
  const dbUrl = process.env.DATABASE_URL || config.databaseUrl;
  if (!dbUrl) {
    throw createError({ statusCode: 500, message: "Database connection not configured" });
  }

  const sql = postgres(dbUrl);

  try {
    // Archive previous send timestamps and reset invitationSent to false
    const res = await sql`
      UPDATE collection_rsvp_records
      SET data = data || jsonb_build_object(
        'previousInvitationSentAt', data->'invitationSentAt',
        'previousInvitationSentVia', data->'invitationSentVia',
        'invitationSent', false
      )
      WHERE (data->>'invitationSent')::boolean = true
    `;

    await sql.end();
    return {
      success: true,
      message: `Successfully reset ${res.count} passes to pending. Send history has been preserved.`,
      resetCount: res.count,
    };
  } catch (err: any) {
    await sql.end();
    console.error("Failed to reset campaign passes:", err);
    throw createError({
      statusCode: 500,
      message: `Failed to reset campaign passes: ${err.message}`,
    });
  }
});
