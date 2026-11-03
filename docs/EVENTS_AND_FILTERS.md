# Events, ages and neighbourhoods

Events have their own public page at `/events`. In the organisation dashboard,
choose **Add an event**, or select **Event** as the listing type. Activities and
programmes remain ongoing directory listings on Find It. An event needs a start
date; its optional end date must be on or after that date. Use the event times
field for opening times, arrival information or a programme of activities. Dates
and times are local to New Zealand (Pacific/Auckland).

Events are always shown in ascending start-date order, including when featured.
Upcoming and ongoing events are shown by default. Visitors can include all dates
or past events, search text, and filter by category, neighbourhood, suitable ages,
Free only, and a date range. Multi-day events match any overlapping date range
and remain upcoming/ongoing through their final day. Create separate events for
separate occurrences; recurring-calendar scheduling is not part of this release.

Event text and photographs use the existing BBCN approval process, ownership
checks, private uploads, replacement handling and separate image moderation.
An approved event retains its current details while changes await review.

## Suitable Ages

Organisations select any applicable choices: **0-5, 5-12, 13-20, Adult, Senior,
Family, All**. All is an explicit declaration that every age is suitable and
matches every age filter. Family matches listings marked Family or All; it does
not infer eligibility from numeric age bands. Any age clears the visitor filter.
The supplied age bands are labels and deliberately overlap at age 5.

Existing age descriptions are preserved under Additional age information.
Existing records with no structured ages remain visible without an age filter;
organisations must choose the applicable ages for those records to match an age
filter. Ages are not inferred from descriptions or private account information.

Burnside and Bryndwr have prominent quick-selection buttons and appear first in
an Our neighbourhoods option group. Other neighbourhoods remain available in
alphabetical order under Wider community.

## Category and location management

BBCN administrators use **Admin → Categories & locations** to add, rename or
deactivate terms. Renaming updates both published and proposed listing
associations in one database operation. The current browser's filters and public
listings refresh after each change; other visitors see changes when they reload.

Deactivation hides a term from new listing selections without deleting existing
associations. Existing listings can retain their retired categories or location
when edited or reviewed; a new listing cannot select retired terms. Public
filters continue to include terms present on public listings. Permanent taxonomy
deletion is not offered. Category cycles and duplicate names are rejected.

## Deployment

Apply `supabase/migrations/202611030001_events_ages.sql` to the original BBFind
project **before deploying the frontend**. It replaces validation/save functions
and records no user content changes. New fields are optional for legacy listings;
the frontend supplies defaults for new submissions. Register migration version
`202611030001` in standard Supabase migration history when applying through SQL
rather than `supabase db push`. Do not rerun the initial migration.

Run `npm test`, `npm run test:sql`, `npm run test:e2e`, and
`npm run test:integration` using the documented disposable local fixtures.
