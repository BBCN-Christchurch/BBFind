# BBCN administrator setup

1. Configure a BBCN-owned Supabase project, apply the migration, enable email confirmation and configure/test custom SMTP.
2. Create a normal account through the secure portal. Verify its email. Use a dedicated BBCN-controlled account and a unique password.
3. In the privileged Supabase SQL editor, identify the exact verified user and explicitly grant its UUID:

```sql
select id, email, email_confirmed_at from auth.users
where email = 'replace-with-the-authorised-BBCN-email';

-- Substitute the verified UUID from the selected record.
insert into public.administrator_roles(user_id)
values ('replace-with-the-verified-user-uuid'::uuid);
```

No real email/UUID is included in this repository. Do not grant a role to an unknown account or the first signup automatically. Do not expose privileged credentials to the frontend.

4. Sign in to the separate portal and open `/admin`. An organisation account without this role is denied by both the UI and backend.
5. To revoke access, delete that exact UUID from `administrator_roles` in the SQL editor. Backend checks take effect immediately for subsequent operations.

## Review workflow

The queue includes pending listing proposals and pending individual images. Compare current approved content with the proposal, then approve, reject or request changes. Rejection/changes requests need an explanatory private note. Approval does not publish pending images; review each independently. A stale approval is rejected and requires reloading the submission.

Image replacement approval swaps out the previous approved photo. Caption/order/featured/removal proposals use individual review too. Owners cannot change published metadata directly. Existing approved images remain public when proposed changes are rejected. The app keeps no audit or revision-history feature.

Use All Listings to edit, feature/verify, archive, restore, unpublish or delete. Organisation suspension hides its public listings and prevents owner submissions and new anonymous image access. Existing short-lived image links can remain usable until they expire.

Private organisation contacts appear only in the admin Organisation section and that organisation's own settings. Deletion requests appear here too. Permanently deleting an account is irreversible and requires an existing request. Remove administrator access separately before deleting an admin account. Run documented storage cleanup afterwards.

Category/location changes take effect immediately and refresh the current browser’s directory filters and listings automatically. Other visitors see changes when they reload. Renaming reassigns existing listing terms. Deactivation preserves old associations but prevents new selection. Category cycles are rejected.

## Before launch

Assign BBCN people to review submissions, respond to privacy/deletion requests, monitor free quotas, operate backups and test restoration. Set up the notification worker and verify delivery; dashboard status alone does not establish that email is working. Auth-provider operational logs may still exist even though the app does not implement audit/history features.

Events use the same listing and image review queue. See [Events and filters](docs/EVENTS_AND_FILTERS.md) for event dates, suitable ages and preserving retired category associations.

The review queue supports organisation, listing-type and text/photo filters, with the oldest outstanding work first. Changes from approved content are highlighted in the proposed column, including removed values. Current photo-review request timestamps clear after review; this is not an audit or revision-history feature. Incomplete drafts can receive photos privately but cannot be submitted or approved until complete.
