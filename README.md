# BBFind — your community, connected

A React/TypeScript community directory for BBCN, serving Burnside, Bryndwr and the wider Christchurch community.

## What is built

- Responsive public home, Find It search, categories, listing details, venue filters, Get Found, About and privacy pages.
- Clearly labelled fictional examples when no backend is configured; no fake registration or booking actions.
- Supabase account registration, verified-email login, reset, private account settings, export/deletion requests and multiple listings per organisation.
- Owner forms for organisations, programmes, activities, services, businesses and venues, including rooms, facilities and public contacts entered separately from registration contacts.
- Admin review, request changes/reject/approve, organisation suspension, listing publication controls, featured/verified placement and category/location management.
- Private image uploads, trusted metadata-stripping processing, thumbnails, featured images, captions, reordering, removal, individually reviewed replacements and accessible galleries.
- SQL access controls, tests, CI and an opt-in GitHub Pages deployment workflow.

**No audit or revision-history feature:** each listing/image retains only its current approved content and one proposed change. Pending changes never replace approved public content automatically. This follows the user's update to the original brief.

This is an implementation for local validation and connection to BBCN-owned services. Hosted Supabase credentials, production email delivery and live deployments have not been configured or verified. Complete the release checklist in DEPLOYMENT.md before accepting real registrations. BBCN’s public mark and brand green are incorporated as documented in BRANDING.md; the directory illustrations and BBFind identity remain original designs.

## Local development

Use Node 24 LTS (`.nvmrc`) and npm.

```sh
npm ci
npm run dev
```

Without environment variables the directory uses fictional examples. Real listing data replaces all demo data when Supabase is configured; an API failure never silently substitutes sample listings.

```sh
cp .env.example .env
# Edit only the public client variables; never put privileged keys in VITE_*.
npm run dev
npm run build
npm run preview
```

For local backend work, install Supabase CLI 2.75.0 and Docker, then:

```sh
npm run db:start
# In a separate terminal:
supabase functions serve
# In another terminal:
npm run test:backend
```

Local development uses port 5173, API 54321 and a local mail inbox (see CLI status for the mail UI). Email confirmation is enabled. Standard Supabase CLI status output includes local development keys: use only the publishable/anonymous key for the frontend and never commit generated configuration. In environments requiring Docker Hub instead of ECR, prefix backend CLI commands with `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io`.

Connect the frontend to the local API using its anonymous key, set `VITE_ENABLE_ACCOUNTS=true` and restart Vite. Hosted accounts must use the separate account portal, with `VITE_ENABLE_ACCOUNTS=false` on GitHub Pages.

## Validation

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:sql
npm run test:integration
# Optional: against an already running official local Supabase CLI stack:
npm run test:backend
```

`test:sql` uses a disposable lightweight PostgreSQL container and simulated Supabase auth/storage schemas to validate SQL/RLS. It does not test the hosted API, Auth service or Storage HTTP endpoints. The full local Supabase stack exceeded this cloud machine’s disk limit; a smaller stack now runs actual Supabase Auth, PostgREST, Storage, Edge Runtime and a local SMTP inbox on standard PostgreSQL.

If Chromium is already installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`. Backend tests are local-only, create isolated users and clean them up; never run them against production. Image processor tests exercise malformed input and generated dimensions. `npm run test:integration` additionally exercises real registration/verification/reset delivery to a local inbox, uploads, permissions, owner/admin browser actions and anonymous gallery access. It generates temporary local credentials, removes its containers/files on completion and does not contact a hosted project. Hosted SMTP delivery and deployment still require real authorised accounts.

## Handover

- [Live setup steps](LIVE_SETUP.md)
- [Database and access controls](DATABASE.md)
- [Administrator setup](ADMIN_SETUP.md)
- [Deployment and release checklist](DEPLOYMENT.md)
- [Privacy and retention](PRIVACY.md)
- [Costs and current free-tier constraints](COSTS.md)
- [BBCN branding reference](BRANDING.md)
- [Validation record and remaining checks](TESTING.md)
- [Desktop screenshot](docs/screenshots/desktop.png) / [mobile screenshot](docs/screenshots/mobile.png)
- [Implementation architecture](docs/PHASE_1_PLAN.md)
- [Original brief](docs/PROJECT_BRIEF.md) and [image requirements](docs/IMAGE_REQUIREMENTS.md)

Do not create a Git worktree for ordinary cloud tasks: the existing task checkout is already isolated. No paid services, event system or GitHub-hosted private data are introduced.
