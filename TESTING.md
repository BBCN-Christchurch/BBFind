# Validation record — updated 28 October 2026

| Check | Result and scope |
| --- | --- |
| Dependency install / build | Frozen installation, TypeScript and production build passed. |
| Unit/media tests | 14 passed: search, URL/form validation, image dimensions and metadata removal, malformed images, multipart body limits, and rejection of privileged keys/insecure URLs in public configuration. |
| Browser contract tests | 22 desktop/mobile tests passed, including automated accessibility scans of four public pages. Portal contract tests use mocked transport. |
| SQL/RLS | 45 passed on PostgreSQL 17, using a disposable auth/storage schema harness. |
| Actual Supabase service integration | 50 passed against PostgreSQL 17, GoTrue Auth, PostgREST, Storage, Edge Runtime and Mailpit. Includes actual HTTP/storage permissions, local verification/reset email delivery and owner/admin/visitor browser workflows with no API mocks. |
| Dependency scanning | No vulnerabilities in the last successful audit; rerun with package-lock changes. |
| Branding | BBCN website reference, green #138a59 and actual public mark verified. |

`npm run test:integration` uses a compact disposable stack rather than the oversized all-in-one Supabase PostgreSQL image. It generates short-lived local credentials outside the repository, runs the application migration and actual services' migrations, intercepts email locally, and removes test resources. The JWT helper functions match Supabase/PostgREST claims. This tests application behavior and access control; it is not a deployment of the Supabase management platform.

Integration work found and fixed a real compatibility defect: the original image codec relied on native Node addons that are unsupported in Edge Runtime. The processor now uses portable PNG/JPEG codecs, bounds decompression, validates CRCs, strips source metadata, and limits the complete multipart stream before parsing. Test-only ImageScript remains an independent fixture generator/decoder.

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
