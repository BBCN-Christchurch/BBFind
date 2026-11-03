# Approved workflow improvements — 3 November 2026

The user approved items 1, 2, 3, 5, 6, 7, 8, 9, 11, 12, 13, 14 and 15.
Items 4 (return to the selected form after registration/email confirmation) and
10 (cross-feature home search) remain pending and were not implemented.

| Item | Implemented behavior |
| --- | --- |
| 1 | A name and listing type are enough to save a private draft and unlock photos. Complete validation is still required to submit or approve. |
| 2 | Unsaved listing changes prompt Save draft and leave, Leave without saving, or Continue editing for app navigation and dashboard/admin tabs. Closing/reloading uses the browser's native unsaved-change warning. |
| 3 | Required submission fields are marked; field-specific errors are linked to their inputs and the first invalid control receives focus. |
| 5 | Mobile filters collapse behind a Filters button. Selected filters are removable chips; Clear filters remains available above results. Panel expansion is remembered for each directory within the browser session. |
| 6 | Detail pages offer Back to results, keeping the originating query. Router scroll restoration preserves reading position; editing search text replaces rather than grows browser history. |
| 7 | Private previews include proposed listing details and owner-accessible photos; they never substitute registration contacts. Incomplete content cannot be submitted from the preview. |
| 8 | Dashboard descriptions explain live, draft, pending and changes-needed states, with separate pending-photo counts. Photo changes refresh those counts. |
| 9 | Public pages prioritise Tickets / Register, venue enquiries, or activity contact/join actions, using only supplied booking/contact/website routes. |
| 11 | A separate organisation/business profile entry sits below the three primary cards. Existing profile and service types are retained. |
| 12 | Get Found carries an Add a listing hint; the Find Me card explicitly explains that its listings appear in Find It. |
| 13 | Admins filter by type, organisation, and text/photos. Outstanding work is ordered oldest first, using the current photo-submission timestamp. |
| 14 | Proposed fields that differ from approved content are highlighted, including removals, with their previous values. This uses the existing published/proposed pair. |
| 15 | Unknown capacity is Capacity not supplied; unspecified venue costs are Enquire for pricing. Explicit Free and supplied hourly prices remain distinguishable. |

## Database and privacy

Apply `202611030003_workflow_improvements.sql` before deploying the frontend.
The migration adds bounded draft validation, retains strict submission/review
validation and existing owner/admin checks, and adds the current photo-review
request timestamp. Existing queued photos use their existing creation timestamp
as a fallback. New photo submissions and metadata changes set a fresh timestamp;
review completion clears it. No audit or revision-history feature is introduced.

Drafts and their images stay behind the existing private-table and storage access
rules. Proposed previews use owner/admin access, not public listing URLs. Browser
session storage contains public filter expansion/scroll preferences, not draft or
registration content. Existing public listings remain intact while drafts change.

## Verification

Unit checks exercise partial drafts, strict publication, safe contact routes and
venue price classification. SQL checks cover cross-owner access, private drafts,
publication rejection, retained approved content and review timestamps. Browser
checks cover incomplete drafts, previews, keyboard/POP navigation guards, mobile
filtering, results restoration, profile entry, dashboard photo status and admin
review filters/differences. The real-service integration also saves an incomplete
draft and uploads a private image before completing and submitting the listing.
