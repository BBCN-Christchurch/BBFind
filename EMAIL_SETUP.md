# Verification and notification email — next step

The hosted BBFind database and functions are installed. Email verification remains required and passwords must be at least 12 characters. Public signup is currently closed while email and the account portal are unfinished; the agent will explicitly enable it for authorised testing/release after the prerequisites are ready. Supabase's default sender is not suitable for community registrations, so a verified sending domain and custom SMTP are still needed.

BBCN has confirmed DNS access for `bbcn.org.nz` and no existing sending provider. The proposed provider is **Resend Free**, with `directory.bbcn.org.nz` as a dedicated sending subdomain. The last verified free allowance is 3,000 messages/month and 100/day; keep billing upgrades/pay-as-you-go disabled and recheck the current free terms when creating the account.

## What BBCN needs to do

1. Create a BBCN-owned **Free** account at https://resend.com/signup.
2. Open **Domains → Add Domain** and enter **`directory.bbcn.org.nz`**. This does not require purchasing another domain name.
3. Resend will generate the DNS records. Add those exact records at BBCN's DNS provider, using the exact hostnames/values Resend supplies. Hostname entry conventions differ between DNS providers; some append `bbcn.org.nz` automatically. Use the provider's resulting full hostname to check your entry.
4. Return to Resend and click **Verify**. Wait until the domain is marked **Verified**. The generated DKIM values cannot be guessed in advance.
5. Open **API Keys → Create API Key**. Use name **BBFind email**, choose **Sending access**, and restrict it to **`directory.bbcn.org.nz`**. Full account-management access is not needed for sending mail.
6. In Codex environment settings, fill the **existing `RESEND_API_KEY` personal secret entry** prepared for this step. Save/publish the updated environment, then continue this task. Keep the key out of chat, screenshots, source code and all `VITE_*` fields.

No existing Supabase URL/key/token entries need to be duplicated. The email-key secret is allowed only for `api.resend.com` (mail sending) and `api.supabase.com` (secure configuration of Supabase's SMTP and server-side function secrets).

## What the agent can configure afterwards

After the verified-domain sending key is available, the agent can configure:

| Supabase custom SMTP field | Proposed value |
| --- | --- |
| Sender email | `noreply@directory.bbcn.org.nz` |
| Sender name | `BBFind / BBCN` |
| SMTP host | `smtp.resend.com` |
| SMTP port | `465` |
| SMTP username | `resend` |
| SMTP password | The sending API key, stored securely; never displayed |

It can also configure the notification function's `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL` and generated job secret. BBCN must provide/authorise the administrator notification recipient and a real test inbox before live email delivery tests. No external emails have been sent by this setup task.

A Sending-access key is deliberately restricted. A denied domain-list/account-management request does not establish that this key is invalid; domain verification is completed through BBCN's Resend dashboard, while actual SMTP/sending is tested through its intended route.

The organisation portal address is also needed before setting production Auth Site URL, confirmation/reset redirects and the image function's allowed browser origins. These must use the actual portal rather than a guessed address. The current functions only allow the documented local-development origins by default.

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
