# Validation record — updated 4 November 2026

## Demo branch — 4 November 2026

The community demo uses 120 samples: the original 17 plus 103 entries imported
from the supplied July 2025 Burnside directory. PDF citations, online corrections,
unverified gaps and image credits are recorded in docs/DIRECTORY_IMPORT.md and
on listing details. Local images are used where a suitable graphic was verified;
otherwise an explicitly identified BBFind illustration is shown.
Its default build/dev launcher ignores inherited production client settings and
removes privileged mail/management bindings from child processes. A browser smoke
check observed zero remote service requests while browsing the sample directory,
venue photos and disabled registration page. The built bundle was checked for
absence of the inherited Supabase URL, public key and account-portal URL.

The browser suite has 80 desktop/mobile checks on this branch, including real local
venue-image loading, source credits and keyboard lightbox navigation. Connected
owner/admin contracts still use explicit local fixtures, not production data.
The unit suite has 24 checks, including public provenance and the presence of each image asset.

Merged main at `68734d3` into demo, retaining all 17 sample records, source
notes and image assets unchanged. Events, tailored listing workflows, filters and
feature palettes now match main. No unverified event dates or age labels were
added to the sourced samples; connected workflows use local test fixtures.
The main release's validation record follows below.

| Check | Result and scope |
| --- | --- |
| Dependency install / build | Frozen installation, TypeScript and production build passed. |
| Unit/media tests | 20 passed: search, explicit Free classification versus unknown/conditional fees, URL/form validation, image dimensions and metadata removal, malformed images, multipart body limits, and rejection of privileged keys/insecure URLs in public configuration. |
| Browser contract tests | 70 desktop/mobile tests passed, including the three-card listing chooser, tailored event/venue forms without Find Me categories, prominent Free selection, return-to-form sign-in and draft/submit flows, distinct feature-page identities, navigation order, home carousel date order and keyboard controls, populated-carousel accessibility, event creation, chronological/ongoing/date-range filtering, structured ages, priority neighbourhoods and immediate category management refresh, as well as photos before submission, preventing submission during uploads, Free selection and combined/persistent search filters, submitted registration/reset notices, cleared private fields, error/retry states, verification resends, expired-link feedback and automated accessibility scans of the public pages and submitted notice. Portal/Auth contract tests use mocked transport. |
| SQL/RLS | 74 passed on PostgreSQL 17, using a disposable auth/storage schema harness. |
| Actual Supabase service integration | 50 passed against PostgreSQL 17, GoTrue Auth, PostgREST, Storage, Edge Runtime and Mailpit. Includes actual HTTP/storage permissions, local verification/reset email delivery and owner/admin/visitor browser workflows with no API mocks. |
| Dependency scanning | No vulnerabilities in the last successful audit; rerun with package-lock changes. |
| Branding | BBCN website reference, green #138a59 and actual public mark verified. |

`npm run test:integration` uses a compact disposable stack rather than the oversized all-in-one Supabase PostgreSQL image. It generates short-lived local credentials outside the repository, runs all application migrations and actual services' migrations, intercepts email locally, and removes test resources. The JWT helper functions match Supabase/PostgREST claims. This tests application behavior and access control; it is not a deployment of the Supabase management platform.

Integration work found and fixed a real compatibility defect: the original image codec relied on native Node addons that are unsupported in Edge Runtime. The processor now uses portable PNG/JPEG codecs, bounds decompression, validates CRCs, strips source metadata, and limits the complete multipart stream before parsing. Test-only ImageScript remains an independent fixture generator/decoder.

The branded confirmation and recovery email templates were rendered at desktop
and mobile widths in Chromium, including long fallback URLs; neither overflowed
horizontally and both exposed their action link. The Supabase CLI template paths
parse correctly. This is a layout check, not a certification of every email client.
The hosted template configuration can be compared with the versioned HTML using
`scripts/configure-auth-email.mjs`; installing templates does not send email or
establish successful confirmation/reset completion.

The browser workflow verifies real sign-in, listing creation, private image upload, separate listing/image approval, public gallery access and logout. API checks also verify ID tampering is denied, unverified/suspended owners cannot submit, pending data remains private, stale approvals fail and approved content survives pending/rejected changes.

## Remaining live checks

- The hosted Supabase database/functions and public security gates are now installed and verified. Hosted verification/reset delivery and application notifications still need a configured free SMTP/email provider and sending domain.
- Local Edge Runtime compatibility is verified; measure representative image workloads under the hosted Free plan's actual CPU/memory enforcement before launch.
- GitHub source/CI publication and Pages/portal deployment are tracked separately; a local pass does not prove a GitHub run or live website passed.
- A production backup/export/restore drill and BBCN's privacy contact, region and retention decisions remain release requirements.
- Automated scans do not certify WCAG 2.2 AA; manual keyboard/screen-reader and real-device checks remain appropriate.

See LIVE_SETUP.md and DEPLOYMENT.md before opening real registrations.

## Supabase onboarding check (28 October)

The user confirmed that the URL/key were entered in Codex environment settings. Neither variable was injected into the actual running shell when checked; `npm run setup:check` correctly returned an unavailable-configuration result without displaying values. The improved guide explains saving/activating the existing bindings rather than duplicating them. A personal management-token requirement is saved for optional agent-assisted installation; no hosted schema or account settings were changed.

The read-only checker is also exercised against the compact real-service stack. Public-key configuration safety is enforced at build and runtime; mock browser fixtures use clearly synthetic publishable-key syntax.

## Hosted setup validation (28 October, after settings publication)

The Supabase public configuration and management access became available. A read-only inspection found an empty, healthy BBFind project. The initial schema was installed transactionally and recorded, Auth minimum length raised to 12 with verification retained, public signup closed for pre-launch setup, and both functions deployed ACTIVE. Public directory/category reads, private-table denials, SQL privilege checks and unauthenticated/origin/method function gates passed. No real email, account creation or authenticated hosted image upload was attempted; SMTP and the portal are still pending. See DEPLOYMENT_STATUS.md for scope and EMAIL_SETUP.md for the next prerequisite.

Browser contract tests explicitly clear inherited live client configuration, use separate ports 5183/5184, and never reuse a development server. The real-service UI harness also forces its local origin/base path. This keeps local tests on fixtures/temporary services when the cloud environment has live Supabase variables.

The event/age migration was checked with legacy records, real calendar dates, invalid/reversed dates, enum ages, event moderation retaining approved dates, retired-category editing, and denial of new inactive-category selections. See [Events and filters](docs/EVENTS_AND_FILTERS.md).

The approved workflow improvements are recorded in [WORKFLOW_IMPROVEMENTS.md](docs/WORKFLOW_IMPROVEMENTS.md). Coverage includes private incomplete drafts, strict submission/approval gates, navigation protection (including browser Back), private previews, inline validation/focus, collapsed mobile filters, result scroll restoration, context-specific actions, pending-photo status and oldest-first filtered admin review. Browser failures retain a trace and screenshot for diagnosis. The real-service browser workflow uploads a private image before completing its draft.

The 4 November colour audit verifies themed selection/hover states, search and filter controls, card headings/arrows, empty states, contact panels, tags, previews, unsaved dialogs and gallery controls. Automated accessibility scans cover the public pages and populated private form/preview contexts. No database migration or backend behavior change was needed for this release.

## Directory import — 4 November 2026

The import retains all original sample IDs and assets, reuses existing duplicate
organisations and keeps programme/hire listings separate. Added checks cover
PDF page provenance, duplicate prevention, official contact corrections, historic
schedules, unknown venue fees, local image decoding and wider-area/age filters.
The demo bundle excludes inherited live service URLs and keys.

Import verification: 24 unit tests, 78 desktop/mobile browser tests, TypeScript,
format checks and the production demo build passed. All displayed local card
images decoded in Chromium; automated public-page accessibility checks passed.
