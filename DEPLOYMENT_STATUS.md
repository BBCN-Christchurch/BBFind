# Hosted deployment status — 28 October 2026

## Completed on the BBCN Supabase project

- Confirmed the project named **BBFind** was active/healthy, with no existing public tables, Auth users, storage buckets or functions before installation.
- Installed the initial database migration in a single transaction, with a fresh-project safety check and a standard migration-history record for `202610270001_directory.sql`.
- Created seven application tables, with Row Level Security enabled on all seven.
- Seeded 15 directory categories and 10 locations. There are no published organisation/listing fixtures or user accounts.
- Created the private `directory-images` bucket, with processed PNG/JPEG uploads and an 8 MiB per-object storage ceiling. The application applies its own stricter input/organisation/gallery limits.
- Kept email confirmation required and raised minimum password length from 6 to 12. Public signups are disabled until verified email delivery, portal configuration and release requirements are ready.
- Deployed `process-image` and `send-notifications`, both ACTIVE, version 1, using their explicit in-function authentication checks.
- Connected and checked the public API using the supplied publishable key, without displaying credential values.

The project's configured database region is **Tokyo (`ap-northeast-1`)**. It was not changed or recreated. BBCN should include its actual hosting region in the privacy statement. No paid add-on, plan upgrade or billing change was requested by this setup.

## Hosted checks passed

- Public directory API and category metadata are readable anonymously.
- Anonymous HTTP requests to raw organisation, listing, image and notification tables return 401.
- Anonymous roles do not have raw private-table SELECT privileges.
- Client roles cannot insert administrator grants or register unchecked image bytes.
- The image function rejects unauthenticated POSTs with 401, untrusted browser origins with 403, and wrong methods with 405; its allowed local preflight returns 200.
- The notification function rejects unauthorised calls with 401.

No account was created, no email was sent, and no hosted listing/image content was uploaded as part of these probes. The complete authenticated workflows previously passed against the compact local real-service stack; authenticated hosted uploads and actual provider-delivered emails remain to be tested after email/portal setup.

## Remaining prerequisites

1. **Email:** BBCN confirmed DNS access and no provider yet. Follow EMAIL_SETUP.md to establish Resend Free, verify `directory.bbcn.org.nz`, and supply its domain-restricted Sending-access key securely.
2. **Account portal:** configure the actual separately hosted portal address, Auth redirects and image-upload allowed origins before opening registrations.
3. **First BBCN admin:** explicitly establish a verified BBFind account and grant its role using ADMIN_SETUP.md. The Supabase dashboard account is separate; no first-user automatic elevation exists.
4. **Public hosting:** GitHub Pages was not configured on the last check. The current GitHub integration cannot manage repository Actions variables (HTTP 403); a repository owner must enter the public build variables and enable Pages. No site deployment is claimed by installing the backend.
5. **Notifications:** deploy status alone does not activate email delivery. Sender/admin-recipient secrets and an authorised schedule remain unconfigured.
6. **Operations:** complete the privacy contact/retention decisions and production backup/restore drill. Keep credentials out of source and public build variables.

SUPABASE_SETUP.md remains the installation reference. Do not rerun the initial migration: it is now installed and recorded.

## Events and filters update — 3 November 2026

Applied additive migration `202611030001_events_ages.sql` to the existing BBFind
project and recorded it in Supabase migration history. It replaces validation
and listing-save functions, allows events with real ordered dates and structured
age choices, and permits existing listings to retain retired taxonomy terms.
The two existing listing records were retained; no listing, account, image,
category or location content was created, renamed or deleted by this migration.
Anonymous listing-write access remains denied; authenticated saves still require
verified owner/admin permissions and the existing review workflow.

Local verification passed: 17 unit tests, 57 SQL/RLS checks, 46 desktop/mobile
browser tests (including automated accessibility scans), and 50 actual-service
integration checks. This update does not change the separate `demo` branch.

## Tailored listing workflow — 3 November 2026

Installed additive migration `202611030002_listing_workflow.sql` and recorded its
standard Supabase migration history. Events and venues may now have no Find Me
interest categories. The two existing listing records were retained, their
proposals still validate, and anonymous listing writes remain denied. No listing,
account, image or taxonomy content was changed by installation.

The three-card chooser and dedicated activity/event/venue forms passed 54 local
desktop/mobile browser checks, 18 unit checks, 62 SQL permission/moderation checks,
and 50 actual-service integration checks. Existing organisation, programme,
activity, service and business types remain available under Find Me.
