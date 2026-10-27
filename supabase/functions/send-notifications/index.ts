import { createClient } from "@supabase/supabase-js";
// Server-only scheduled worker. Supply an independently generated secret via
// environment settings; never include it in frontend variables or repository.
Deno.serve(async (req) => {
  const secret = Deno.env.get("NOTIFICATION_JOB_SECRET");
  if (!secret || req.headers.get("Authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorised", { status: 401 });
  if (req.method !== "POST")
    return new Response("POST required", { status: 405 });
  const emailKey = Deno.env.get("RESEND_API_KEY"),
    from = Deno.env.get("MAIL_FROM"),
    admin = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
  if (!emailKey || !from || !admin)
    return new Response("Email provider is not configured", { status: 503 });
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const { data: jobs, error } = await client
    .from("notifications")
    .select("*,organisations(email)")
    .is("sent_at", null)
    .lt("attempts", 5)
    .order("created_at")
    .limit(10);
  if (error)
    return new Response("Could not load notifications", { status: 500 });
  let sent = 0;
  for (const job of jobs || []) {
    const adminEvent = ["listing_submitted", "deletion_requested"].includes(
      job.event,
    );
    const targets = adminEvent
      ? [admin, job.organisations?.email]
      : [job.organisations?.email];
    const recipients = [...new Set(targets.filter(Boolean))];
    let failure = "";
    // One idempotency key per recipient prevents retries duplicating delivered mail.
    for (const recipient of recipients) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${emailKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `bbfind-${job.id}-${recipient}`,
        },
        body: JSON.stringify({
          from,
          to: [recipient],
          subject: `BBFind: ${job.event.replaceAll("_", " ")}`,
          text: `Your BBFind directory status has changed: ${job.event.replaceAll("_", " ")}. Sign in to the organisation portal to view the current status and any BBCN feedback. Private contact information is not included in this notification.`,
        }),
      });
      if (!response.ok) failure = `Provider returned ${response.status}`;
    }
    await client
      .from("notifications")
      .update({
        attempts: job.attempts + 1,
        last_error: failure || null,
        sent_at: failure ? null : new Date().toISOString(),
      })
      .eq("id", job.id);
    if (!failure) sent++;
  }
  return Response.json({ sent, processed: jobs?.length || 0 });
});
