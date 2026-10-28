# Supabase setup — start here

**Update, 28 October:** the settings are now active and the hosted database/functions have been installed. See [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md). Do not rerun the initial migration. The next step is [EMAIL_SETUP.md](EMAIL_SETUP.md).

You have already registered with Supabase and added the public URL/key in **Codex environment settings**. Keep those existing entries; do not add duplicates.

There are three separate things:

1. **Your Supabase account** lets you manage projects in the Supabase dashboard.
2. **The project URL and public key** let BBFind connect to the project. They do not give permission to install the database or deploy functions.
3. **Administrative management access** lets an authorised administrator perform that installation. A BBFind organisation/admin login is created later, separately from your Supabase dashboard login.

## Recommended: let Codex complete the installation

### Step 1 — activate the URL/key you already entered

Open the Codex cloud environment settings for **BBFind**. Edit the existing entries if necessary so their names are exactly:

| Environment variable | What goes in it |
| --- | --- |
| `VITE_SUPABASE_URL` | Project API URL, usually `https://your-project-reference.supabase.co`. Not the Supabase dashboard address and not a PostgreSQL connection string. |
| `VITE_SUPABASE_ANON_KEY` | **Publishable key**, beginning `sb_publishable_`, or the **legacy anon/public key**. Never a secret/service-role key. |

Save the environment editor. If prompted, review and **publish the updated environment**, then open/restart a task using that updated version. A saved draft does not inject values into a shell that is already running. Values in Codex settings also do not automatically populate GitHub repository settings.

If the project itself has not been created yet, visit https://supabase.com/dashboard, create a project named **BBFind** in a BBCN-owned organisation on the **Free** plan, and wait for it to finish provisioning. If it already exists, use it; do not create a second project. Keep its database password in BBCN's password manager. Choose/record the hosting region for the privacy statement.

In your Supabase project, the **Connect** dialog or **Project Settings → API Keys / Data API** provides the project URL and public key. The layout can change; use the values labelled Project URL and Publishable key (or legacy anon), not Secret or service_role.

### Step 2 — securely allow project setup

If you want Codex to apply the schema and deploy functions on your behalf:

1. Sign in to Supabase and open https://supabase.com/dashboard/account/tokens.
2. Generate a personal access token named **Codex BBFind setup**. Choose a short expiry if offered.
3. In the **Codex environment settings**, supply it as the personal secret **`SUPABASE_ACCESS_TOKEN`**. A requirement for this secret has been saved; it is restricted to HTTPS requests to `api.supabase.com`.
4. Save and activate/publish the environment update as above. Do not put this token in any `VITE_*` field, GitHub source, a public build, or chat. This is privileged management access; revoke it after setup when it is no longer needed.

The **public** URL/key alone cannot substitute for this administrative access. A service-role API key is not needed in the browser or as a substitute for a management token. Supabase supplies server-side function credentials inside its own runtime.

### Step 3 — continue in the updated environment

Tell Codex that the settings are active. It can then:

- Check the connection without displaying credentials.
- Inspect the project's existing schema before changing anything.
- Install the prepared database migration on an appropriate new project.
- Deploy the image-processing and notification functions.
- Configure/test the supported authentication settings and report remaining email/domain requirements.

If the project already contains another application's tables or users, Codex must inspect it and preserve that work rather than blindly replacing the schema. No table resets or destructive data changes are needed for a fresh BBFind project.

To check configuration yourself from the checkout with Node 24:

```sh
npm run setup:check
```

This command only reads the public API. It distinguishes missing/unavailable variables, a rejected public key and a missing BBFind schema. It does not install or reset anything. A successful public check does not prove production email delivery or complete live setup.

## Alternative: install manually through your own administrator account

You do not have to provide Codex a management token. If you prefer to perform the privileged steps yourself:

### A. Create the database tables and permissions

1. Open the intended BBFind project in the Supabase dashboard.
2. Choose **SQL Editor → New query**.
3. Open the complete migration: https://github.com/BBCN-Christchurch/BBFind/blob/main/supabase/migrations/202610270001_directory.sql.
4. Use GitHub's **Raw** button, select all and copy the entire SQL file. Paste it into the new Supabase query.
5. Confirm you are in the correct, dedicated BBFind project and run the query once.

Expected outcome: the `public` schema contains `organisations`, `administrator_roles`, `categories`, `locations`, `listings`, `listing_images` and `notifications`; Storage contains a **private** bucket named `directory-images`. The migration also creates the approval functions and access policies. Do not make this bucket public or disable RLS to get past an error.

The migration is an initial installation, not a reset or an idempotent rerun. If any of these tables already exist or the query reports an error, stop and give Codex the error message without credentials. Do not drop tables or rerun blindly.

### B. Deploy the two functions without Docker

Use Node 24 and the BBFind repository on your own computer. From its root directory:

```sh
npx supabase@2.75.0 login
npx supabase@2.75.0 functions deploy process-image --project-ref YOUR_PROJECT_REFERENCE --use-api --import-map supabase/functions/deno.json
npx supabase@2.75.0 functions deploy send-notifications --project-ref YOUR_PROJECT_REFERENCE --use-api --import-map supabase/functions/deno.json
```

Replace `YOUR_PROJECT_REFERENCE` with the reference shown in your Supabase project settings (the usual project URL's first component). `--use-api` bundles on Supabase rather than downloading a local database/Docker stack. The checked-in function configuration sets gateway JWT verification off because the functions implement their own explicit checks; image uploads still require a verified authorised owner/admin, and notifications require a server-only job secret. Never remove those checks.

In Supabase **Edge Functions → Secrets**, set `ALLOWED_ORIGINS` to the exact organisation-portal origin. For initial local development, the existing default permits `http://127.0.0.1:5173` and `http://localhost:5173`. Use explicit comma-separated origins, not a wildcard. Configure notification secrets only after the email provider is ready, as described in DEPLOYMENT.md.

### C. Configure authentication

In **Authentication** settings:

- Keep email confirmation enabled.
- Set minimum password length to at least 12.
- Set Site URL to the actual organisation portal address when that portal is ready.
- Add its exact verification/dashboard and password-reset redirect URLs. Local development uses `http://127.0.0.1:5173/dashboard` and `http://127.0.0.1:5173/reset`.

Public registration requires **custom SMTP**: Supabase's default sender only serves project-team addresses and is not the community-registration solution. We can do the database/function steps first; BBCN's sending-domain/DNS access and free SMTP credentials are separate prerequisites for real email testing. Never disable verification to work around email setup.

### D. Verify before opening registration

Run `npm run setup:check` after the Codex variables are active. Use ADMIN_SETUP.md to create an authorised BBCN admin explicitly; a Supabase dashboard account does not automatically become a BBFind admin. Then complete the owner/admin, image, email and privacy checks in DEPLOYMENT.md. GitHub Pages hosts public browsing; account forms belong on the separate account portal.
