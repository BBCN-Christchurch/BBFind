# Deployment and release checklist

For the first Supabase connection, use [SUPABASE_SETUP.md](SUPABASE_SETUP.md). This document is the later deployment/reference checklist.

## Configuration and hosting

The same Vite codebase builds a public directory and a separate account portal. GitHub Pages hosts public browsing only; its workflow forces `VITE_ENABLE_ACCOUNTS=false`. Use a separately hosted free static portal (Cloudflare Pages is the proposed option) for password/account/admin transactions, following GitHub Pages guidance. BBCN must authorise/connect the hosting accounts; no deployment has been performed from this workspace.

Public, safe-to-expose build variables are documented in `.env.example`:

- `VITE_SUPABASE_URL`: the intended project API origin.
- `VITE_SUPABASE_ANON_KEY`: anonymous/publishable key, protected by database/storage policies.
- `VITE_BASE_PATH`: `/BBFind/` for a GitHub project site, `/` for a root/custom-domain site.
- `VITE_SITE_URL`: canonical full public site address including its base path, without a trailing slash.
- `VITE_ACCOUNT_PORTAL_URL`: full account portal origin (optionally with a base path).
- `VITE_ENABLE_ACCOUNTS`: `false` on GitHub Pages; `true` only on the separate portal/local development.

Never put service-role, SMTP, email-provider or job secrets in a `VITE_*` variable, the repository, build output or public hosting settings.

## Supabase setup

1. Create a dedicated BBCN-owned project on Free. Choose the storage region with BBCN's privacy requirements in mind. Verify current free terms; do not enable paid add-ons or automatic upgrades.
2. Apply the SQL migration using Supabase CLI. Confirm RLS and function grants using the local tests before live use. Supabase URL/publishable key go in the frontend; the project service-role key does not.
3. Keep email confirmation enabled and set password length >=12. Configure exact portal/local Auth site URLs and allowed verification/reset redirects. Enable abuse protection and appropriate Auth rate limits.
4. Configure genuinely free custom SMTP (Resend Free is the implemented candidate) with an authorised sending domain and its SPF/DKIM/DMARC records. Do not use the default team-only Supabase sender for public signup. Test registration verification, confirmation and password reset with real authorised inboxes.
5. Deploy functions with CLI: `supabase functions deploy process-image` and `supabase functions deploy send-notifications`. Their config disables gateway JWT checking because each function performs explicit authentication: image uploads call `getUser` and owner/admin authorisation; the notification endpoint checks a separate server-only job secret.
6. Set function `ALLOWED_ORIGINS` to the exact public/portal origins separated by commas. Supabase supplies its own internal project credentials to deployed functions automatically; do not copy those to the frontend.
7. Configure `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL` and independently generated `NOTIFICATION_JOB_SECRET` securely as function secrets. Configure an authorised scheduled caller to POST to `send-notifications` using its job secret. Nothing in this repository automatically registers a hosted schedule. Use a free scheduler only after verifying its allowance. The queue is processed in batches of 10, retries up to five attempts, with provider idempotency keys. Run at most one worker at a time; inspect failed jobs and operate within email quotas.
8. Bootstrap an admin as documented in ADMIN_SETUP.md. Test owner A/owner B/admin access against the deployed project using disposable authorised records.

## GitHub Pages

Keep the source repository public to use GitHub Free's Pages entitlement. Configure Pages source as GitHub Actions. Set repository variables for public Supabase configuration, canonical site URL and portal URL. Push the reviewed code to the intended branch, then run the manually triggered **Deploy public directory** workflow. It runs tests, builds and deploys using GitHub's official Pages actions. `checks.yml` runs frontend, browser and lightweight SQL checks on pushes to main and pull requests. The integration job runs the tested lightweight stack with actual Supabase services, including local test email delivery and browser actions; no hosted credentials are required.

`prepare-pages.mjs` generates a base-path-aware 404 fallback, robots rules, an optional sitemap and static metadata shells for approved listing URLs. It fetches only the anonymous approved projection. Set VITE_SITE_URL to generate canonical/OG metadata. Pages cannot execute server code or dynamically generate new static pages; new listings use the fallback until the next build. Metadata is a snapshot: rebuild after publication/withdrawal to refresh/remove listing shells. Search engines' indexing and social preview refresh are outside application control. These shells are not full server rendering.

For the separate portal, use `npm ci` / `npm run build`, output `dist`, base `/`, accounts enabled, and the same public Supabase client configuration. Configure host SPA fallback (`public/_redirects` supports Cloudflare Pages) and register its exact Auth redirects. All database permissions remain server-side regardless of host.

## Custom domain / migration

Change base/site/portal origins, rebuild both frontends and update Auth/CORS allowlists before switching DNS. No GitHub address is hardcoded in application logic. PostgreSQL data and storage files can be exported independently; database access is wrapped in `src/api.ts`. Replacing authentication requires migrating identity references and testing every ownership policy, not merely changing a URL.

## Required release checks

- Live registration opens only after BBCN has completed PRIVACY.md: privacy contact, retention, region and account deletion/export procedure.
- Confirm live authentication, verification/reset emails and all application notification deliveries. These are not yet production-tested.
- Test trusted image processing in the hosted Edge Function against representative camera photos, transparent logos, WebP inputs, malformed files and the free CPU/memory limits. Local processor timings do not prove hosted performance.
- Test multiple listings, cross-account access denial, stale approvals, unchanged public content while pending, individual image approvals/rejections/replacement, suspension and direct unauthorised Storage requests.
- Test desktop/mobile keyboard use, galleries/lightbox and actual deployed deep links. Automated checks do not certify WCAG 2.2 AA.
- Complete backup/restore drill, secure storage cleanup and quota monitoring. Verify a quiet Free project can pause and establish a BBCN recovery procedure.
- Verify GitHub Actions and both live hosts after deployment. They have not been executed on GitHub from this task.

No paid service has been authorised. If free quotas cannot support the measured workload, pause the affected capability and assess free alternatives before requesting any cost approval.
