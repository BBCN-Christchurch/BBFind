# Verification and notification email

## Current hosted state — 2 November 2026

Resend has verified `directory.bbcn.org.nz`. Supabase custom SMTP is configured,
and BBCN confirmed the direct delivery test reached `info@bbcn.org.nz`. A Supabase
signup confirmation email also reached that inbox. Signup is enabled for testing;
email verification and the 12-character minimum password remain required. The
portal is `https://bbfind.pages.dev` and its Auth redirects are configured.

Successful confirmation, password reset and the first administrator still need
hosted acceptance testing. Notification provider/sender/recipient/job secrets are
configured, but there is no scheduled notification worker yet. A delivered email
alone does not establish that its confirmation link or subsequent sign-in works.

## Branded account emails

The confirmation and password-reset designs are versioned in `supabase/templates/`.
They use inline styles, text branding and presentation tables for email-client
compatibility; no remote fonts, tracking or private registration metadata are added.
Both retain Supabase's `{{ .ConfirmationURL }}` button and copyable fallback link.
The local CLI configuration loads these files automatically. Existing emails are
unchanged; request a fresh email to see a newly installed template.

For the hosted project, use the scoped management credential already bound to this
environment. From the repository root, apply and verify only the template content:

```sh
node --use-env-proxy --env-file-if-exists=.env scripts/configure-auth-email.mjs --apply
```

Omit `--apply` for a read-only comparison. This does not change SMTP, signup,
password requirements or verification settings, and does not send email. The
registration/reset form is cleared and replaced with an accessible inbox notice
after a successful request. Unconfirmed sign-in offers a user-initiated verification
resend, with a client cooldown in addition to Supabase's server rate limits. Expired
email callbacks at sign-in display recovery guidance instead of echoing raw URL
error text.

## Provider and initial setup reference

BBCN uses **Resend Free**, with `directory.bbcn.org.nz` as a dedicated sending
subdomain. The last verified free allowance is 3,000 messages/month and 100/day;
keep billing upgrades/pay-as-you-go disabled and recheck current terms before
changing the service. The steps below document initial setup, which is already
completed on this project; do not recreate the domain or duplicate its secrets.

### Initial domain and key setup

1. Create a BBCN-owned **Free** account at https://resend.com/signup.
2. Open **Domains → Add Domain** and enter **`directory.bbcn.org.nz`**. This does not require purchasing another domain name.
3. Resend will generate the DNS records. Add those exact records at the authoritative DNS provider, currently Cloudflare. Keep its sending CNAMEs **DNS only**; proxying prevents verification of their targets. The deployed Forge configuration uses `rsend.directory` → `resend-apne1.forge.rmta.net` and `send.directory` → `send.forge.rmta.net`, plus Resend's generated DKIM TXT record. Do not substitute assumed MX/SPF records for the actual dashboard requirements. The domain registrar is separate from its DNS host.
4. Return to Resend and click **Verify**. Wait until the domain is marked **Verified**. The generated DKIM values cannot be guessed in advance.
5. Open **API Keys → Create API Key**. Use name **BBFind email**, choose **Sending access**, and restrict it to **`directory.bbcn.org.nz`**. Full account-management access is not needed for sending mail.
6. In Codex environment settings, fill the **existing `RESEND_API_KEY` personal secret entry** prepared for this step. Save/publish the updated environment, then continue this task. Keep the key out of chat, screenshots, source code and all `VITE_*` fields.

No existing Supabase URL/key/token entries need to be duplicated. The email-key secret is allowed only for `api.resend.com` (mail sending) and `api.supabase.com` (secure configuration of Supabase's SMTP and server-side function secrets).

### Supabase SMTP configuration

The hosted settings are:

| Supabase custom SMTP field | Value |
| --- | --- |
| Sender email | `noreply@directory.bbcn.org.nz` |
| Sender name | `BBFind / BBCN` |
| SMTP host | `smtp.resend.com` |
| SMTP port | `465` |
| SMTP username | `resend` |
| SMTP password | The sending API key, stored securely; never displayed |

The notification function's `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL`
and generated job secret are configured. BBCN authorised `info@bbcn.org.nz` for the
delivery test and administrator notifications. Do not send to other recipients
without authorisation. Configure and verify an authorised schedule before claiming
that submission/status notification delivery is operational.

A Sending-access key is deliberately restricted. A denied domain-list/account-management request does not establish that this key is invalid; domain verification is completed through BBCN's Resend dashboard, while actual SMTP/sending is tested through its intended route.

The Auth Site URL and exact confirmation/reset redirects use
`https://bbfind.pages.dev`. The image function allows that portal, the public
GitHub origin and the original documented local origins. Update the actual settings
before switching hosts or domains; do not guess a replacement portal address.

## Completion checks

- Domain shows Verified in Resend.
- Supabase custom SMTP is configured and email confirmation stays enabled.
- An explicitly authorised inbox receives a verification message and a password-reset message.
- The reset link reaches the configured portal and the new password works.
- Administrator submission/status notifications reach the authorised recipient.
- Email quotas and failures are monitored; a delivery failure must not bypass verification or moderation.

Official references:

- https://resend.com/docs/send-with-supabase-smtp
- https://resend.com/docs/api-reference/api-keys/create-api-key
- https://resend.com/pricing
