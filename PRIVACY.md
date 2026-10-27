# Privacy and operational policy — BBCN completion required

The app follows data minimisation and separates private registration information from explicitly entered public contacts. BBCN must review this policy for the New Zealand Privacy Act 2020 before opening registration; this is implementation documentation, not legal certification.

## Information collected

Private: organisation account name, registration contact name/email/phone, Supabase identity, private proposals and review feedback. Passwords are handled by Supabase Auth and are never stored in directory tables. Server-only email queues contain organisation references and delivery status.

Public: only listing text/contact fields deliberately entered for publication and approved by BBCN, selected categories/locations and individually approved images/captions. Registration contacts are not copied to listings or returned by anonymous APIs.

Image originals are converted in the browser, independently validated/re-encoded by the backend and discarded. The app stores optimised variants under opaque random names; EXIF/GPS and original filenames do not become public metadata. Organisations must have rights/consent for uploaded photographs. Already downloaded images cannot be recalled; issued image links can last five minutes after withdrawal.

## Access, export and deletion

Owners can access only their private account/listings/images. Verified owners and authorised admins can manage images; client writes cannot set published values or roles. BBCN admins can view registration contacts to administer the service. No app audit/revision history is retained.

Owners can download their JSON account data and request deletion from settings. BBCN reviews the request, provides image-file exports where requested, withdraws/deletes account records and runs storage cleanup. Admin SQL account deletion requires a request and denies accidental deletion of an administrator. Physical file cleanup removes unreferenced files older than 24 hours; run it regularly. Deleting the database record immediately denies new anonymous signed URLs even before physical cleanup.

## Decisions required before live registration

BBCN must supply and publish:

- Privacy officer/contact and a process for access, correction, complaints, export and deletion requests.
- Approved hosting/storage region and overseas processing disclosure for Supabase, portal host and email provider.
- Backup schedule, encryption/access arrangements and a defined backup retention/expiry period.
- How long unused drafts, rejected uploads, deletion requests and completed notification jobs are retained. The current implementation does not automatically expire all of these; assign an operational cleanup process.
- A practical response timeframe and breach-response procedure.

Keep backups, private exports and credentials outside public GitHub and CI artifacts. Provider infrastructure/auth logs can exist independently of the app. Fonts are self-hosted and illustrations are original; no analytics, advertising trackers or paid mapping services are introduced.
