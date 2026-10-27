import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
export async function testAuthEmail(config, service, client, users, check) {
  if (!config.MAIL_URL) return;
  assert.equal(
    new URL(config.MAIL_URL).hostname,
    "127.0.0.1",
    "Email tests require the local test inbox.",
  );
  const email = `registration-${randomBytes(6).toString("hex")}@example.test`,
    password = randomBytes(20).toString("base64url") + "Aa1!";
  const c = client();
  const result = await c.auth.signUp({
    email,
    password,
    options: {
      data: {
        organisation_name: "Email workflow test",
        contact_name: "Private email tester",
        phone: "Private test phone",
      },
    },
  });
  if (result.error) throw result.error;
  assert.ok(result.data.user);
  users.push(result.data.user.id);
  check(
    !result.data.session,
    "registration requires verification before a session is issued",
  );
  async function waitForLink(type) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const listing = await fetch(config.MAIL_URL + "/api/v1/messages", {
        signal: AbortSignal.timeout(2000),
      }).then((r) => r.json());
      for (const message of listing.messages || []) {
        if (!message.To?.some((to) => to.Address === email)) continue;
        const body = await fetch(
          config.MAIL_URL + "/api/v1/message/" + message.ID,
        ).then((r) => r.json());
        const source = (body.HTML || body.Text || "").replaceAll("&amp;", "&");
        const links = source.match(/https?:\/\/[^\s"<>]+/g) || [];
        for (const link of links) {
          let url;
          try {
            url = new URL(link);
          } catch {
            continue;
          }
          if (
            url.searchParams.get("type") === type &&
            url.searchParams.has("token")
          ) {
            assert.equal(url.hostname, "127.0.0.1");
            return url.searchParams.get("token");
          }
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    throw new Error(`No ${type} link arrived in the local test inbox.`);
  }
  const signupToken = await waitForLink("signup");
  check(
    Boolean(signupToken),
    "verification email delivered to the local SMTP inbox",
  );
  const verification = await c.auth.verifyOtp({
    token_hash: signupToken,
    type: "signup",
  });
  if (verification.error) throw verification.error;
  check(
    Boolean(verification.data.session),
    "email verification creates an authenticated session",
  );
  await c.auth.signOut();
  await new Promise((r) => setTimeout(r, 1100));
  const reset = await c.auth.resetPasswordForEmail(email);
  if (reset.error) throw reset.error;
  const recoveryToken = await waitForLink("recovery");
  check(
    Boolean(recoveryToken),
    "password-reset email delivered to the local SMTP inbox",
  );
  const recovery = await c.auth.verifyOtp({
    token_hash: recoveryToken,
    type: "recovery",
  });
  if (recovery.error) throw recovery.error;
  const newPassword = randomBytes(20).toString("base64url") + "Bb2!";
  const update = await c.auth.updateUser({ password: newPassword });
  if (update.error) throw update.error;
  await c.auth.signOut();
  check(
    Boolean(
      (await client().auth.signInWithPassword({ email, password })).error,
    ),
    "previous password no longer works after reset",
  );
  const signed = client();
  check(
    Boolean(
      (await signed.auth.signInWithPassword({ email, password: newPassword }))
        .data.session,
    ),
    "reset password can sign in",
  );
  await signed.auth.signOut();
}
