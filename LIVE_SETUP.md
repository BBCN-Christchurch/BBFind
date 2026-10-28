# Connect BBCN's live services

**Start with [SUPABASE_SETUP.md](SUPABASE_SETUP.md)** for the exact dashboard steps, activation of Codex variables, and the choice of agent-assisted or manual installation.

The application and its local service tests are prepared. These steps establish BBCN's own hosting/account configuration; no live registration or production email delivery is claimed yet.

## 1. Supabase project

Create a project in a BBCN-owned Supabase organisation and choose **Free**. Keep its database password in BBCN's password manager. Do not enable paid add-ons. Record the project region for the privacy statement.

Add the project URL and anonymous/publishable key to the cloud environment settings as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These are public client configuration; never use a service-role key in these fields. Do not send passwords, privileged keys or personal access tokens in chat.

An authorised Supabase administrator must apply `supabase/migrations/202610270001_directory.sql` and deploy the two functions using the exact steps in DEPLOYMENT.md. Creating the empty project and entering client configuration alone does not install the backend. Deployment through an agent requires securely configured, authorised Supabase management access; that access is not currently available.

## 2. Verification and notification email

Use an authorised BBCN sending domain with a genuinely free provider (the implementation supports Resend Free). Configure its DNS records and Supabase custom SMTP, plus the server-only notification function settings. Keep credentials in the provider/Supabase secure settings. Test real authorised inboxes before registration opens; local test-inbox delivery does not verify production deliverability.

## 3. Public website and account portal

A repository administrator must enable **Settings → Pages → Source: GitHub Actions** in `BBCN-Christchurch/BBFind`. The current integration can push source but cannot manage repository settings; Pages was not configured when checked.

Set the public build variables listed in DEPLOYMENT.md and run **Deploy public directory**. GitHub Pages keeps account forms disabled. Configure the separate free static account portal (for example Cloudflare Pages) with accounts enabled, plus the correct Auth redirects and function CORS origins.

The app can be deployed as a labelled demonstration before a backend exists; do not present it as a live directory or accept real registrations until backend/security/privacy checks pass.

## 4. BBCN operations

Supply the privacy contact, backup/retention policy and hosting region; configure the first administrator explicitly using ADMIN_SETUP.md. Arrange a notification schedule, moderation responsibility, quota monitoring and a backup/restore drill. There is no app audit/revision-history feature.
