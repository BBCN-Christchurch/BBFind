# Database and access control

The executable schema is `supabase/migrations/202610270001_directory.sql`. Apply to a **new, dedicated Supabase project**. Test migrations locally before any hosted use. Migration files are source controlled; private directory data is not.

## Current data model

| Table | Purpose |
| --- | --- |
| auth.users | Supabase-managed authentication; email confirmation required. |
| organisations | One owner per organisation; private registration contacts, suspension and deletion request. |
| administrator_roles | Explicit privileged grant; never derived from signup order or editable metadata. |
| listings | Organisation FK; current public JSON, one proposed JSON, status, review note and admin flags. |
| categories | Admin-managed category hierarchy, including subcategories and active flag. |
| locations | Admin-managed neighbourhoods; not limited to initial examples. |
| listing_images | Listing FK; opaque storage paths, byte count, current approved metadata, one proposed change, individual decision, optional replacement FK. |
| notifications | Private operational email queue, not a user-visible history. |

One organisation owns many listings, and each listing owns an independent image gallery. An organisation's primary profile is its organisation-type listing; programme/service/venue photos belong to their individual listing. Venue details and room descriptions are validated fields inside public/proposed content. There is no event feature yet; new listing types can reuse the same image ownership model later.

No audit tables, moderation-history tables or revision archives are created. Approving a proposal replaces the current approved content. A rejected proposal is retained only as the current editable submission/feedback, not as a historical version. Provider authentication logs and backups are operational facilities outside this app feature.

## Publication and permissions

Client table writes are revoked. Authorised SQL RPCs perform mutations. All application tables use RLS; security-definer functions have fixed empty search paths, explicit authorisation and explicit execute grants. Private tables are not readable anonymously.

`directory_search` pages through at most 200 approved records per call. It returns only approved listing fields, admin-selected featured/verified flags and the parent's approved organisation-listing name. It never returns private account contacts, proposed content or notes. `directory_images` similarly returns only currently approved image information for active published listings.

Owner writes require verified email, ownership and an unsuspended organisation. Cross-account IDs grant no access. Only admins can approve, reject, request changes, suspend, publish or set features. Published listing/image content remains visible while changes await review. Moderation compares the reviewed proposal with current content and rejects stale approvals. Listing approval never implicitly approves images.

Images use a private `directory-images` bucket. Client uploads are prohibited. The authenticated `process-image` function validates/decodes/re-encodes bytes and registers bounded variants using a server-only credential. Storage read policies allow owners/admins to preview pending files and anonymous readers to fetch only currently approved variants. Unpublication/suspension prevents new anonymous signed URLs; already issued URLs last up to five minutes and browser/downloaded copies cannot be recalled.

Images accept JPG/JPEG, PNG and WebP through browser conversion. The browser bounds and resizes input; the server independently checks bounded PNG headers/chunks, dimensions and decoded pixels, then strips all metadata by creating a fresh raster. Opaque PNGs become JPEG variants, transparent images retain PNG. Variants are 320, 800 and up to 1200 px. Client conversion is not the security boundary. Original files and filenames are not retained.

Current limits: 5 MiB original upload, 128–6000 px per side, 24 MP original, server processing up to 1200 px per side; 12 image records per listing plus one temporary replacement slot; 50 MiB processed images per organisation. Extremely narrow images whose short side falls below 128 px after resizing are rejected. Quotas include pending/rejected files and all variants. Owners can submit a removal request; admins approve removal. Approved replacements atomically remove the old record. Unreferenced file cleanup follows a 24-hour grace period.

## Migration, export and recovery

Local: `supabase start`, then `supabase db reset` for a disposable database only. Reset deletes local data. Hosted: securely authenticate CLI, link the intended new project, inspect migration and run `supabase db push`. Never point test/reset commands at production.

Owner JSON export includes the account's listings and image metadata. It is a private export and does not include image bytes or authentication secrets.

For complete backups:

1. Configure standard PostgreSQL connection variables securely, then run `scripts/backup-database.sh /private/backup.dump` using a compatible `pg_dump`.
2. Configure server-only `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, then run `node scripts/backup-storage.mjs /private/images-backup`.
3. Encrypt both outputs outside the repository; restrict access and record capture time.
4. Test restoration in an isolated project using `pg_restore` and the storage manifest. Supabase-managed auth/storage versions and role grants must be checked during restoration; no automated production restore command is supplied.

Do not assume a database dump includes image files. The backup scripts refuse destinations inside the checkout and refuse to overwrite files. Private data must never be committed or uploaded as GitHub Actions artifacts.

`node scripts/cleanup-storage.mjs` performs a dry run. After an appropriate backup and while imports are stopped, run with `--apply` to remove unreferenced files older than 24 hours. No history feature depends on retaining removed/replaced image files.
