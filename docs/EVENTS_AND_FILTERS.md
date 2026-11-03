# Events, ages and neighbourhoods

Events have their own public page at `/events`. In the organisation dashboard,
choose **Add an event**, or select **Event** as the listing type. Activities and
programmes remain ongoing directory listings on Find It. An event needs a start
date; its optional end date must be on or after that date. Use the event times
field for opening times, arrival information or a programme of activities. Dates
and times are local to New Zealand (Pacific/Auckland).

Events are always shown in ascending start-date order, including when featured.
Upcoming and ongoing events are shown by default. Visitors can include all dates
or past dates using Custom, search text, and filter by category, neighbourhood, suitable ages,
Free only, and a date range. Multi-day events match any overlapping date range
and remain upcoming/ongoing through their final day. Create separate events for
separate occurrences; recurring-calendar scheduling is not part of this release.

Event text and photographs use the existing BBCN approval process, ownership
checks, private uploads, replacement handling and separate image moderation.
An approved event retains its current details while changes await review.

## Suitable Ages

Organisations select any applicable choices: **0-5, 5-12, 13-20, Adult, Senior,
Family**. The redundant All option was removed from filters and selectors on
4 November 2026. Any age clears the visitor filter. Family does not infer
eligibility from numeric age bands. Older saved All values remain readable and
match each age filter; editing them presents the individual groups as selected.
Old `?age=All` links are normalised to an unrestricted search.
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

## Distinct pages and home highlights

Find It uses the green community directory identity. Events uses a plum calendar
header and an agenda grouped by event-start month, with visible date tiles.
Venues for Hire uses a warm space-focused header, larger venue images and
facility badges. Each page has a labelled feature badge as well as its own colour
and layout. The menu places Get Found immediately after Venues for Hire.

The home page highlights up to six approved upcoming/ongoing events, ordered by
start date. The carousel supports swipe/native scrolling, previous/next buttons,
keyboard arrows when its track is focused, and normal tab navigation to event
links. It does not autoplay and respects reduced motion. Past events and private
proposals are excluded; with no published upcoming events it shows an honest
empty state and a link to the calendar.

## Tailored listing creation

Get Found and Dashboard → Create a listing offer three cards: Find Me (activities
and programmes), Events, and Venues for Hire. The dedicated forms are available
at `/dashboard/new/activity`, `/dashboard/new/event`, and `/dashboard/new/venue`;
`/dashboard/new` is the chooser. Signing in from a selected form returns to that
form. Each card and form uses the corresponding green, plum or warm venue theme.

Find Me offers organisation, programme, activity, service and business subtypes
and requires interest categories. Events ask for dates, location/online joining
details, suitable ages, entry cost and a booking link. Venues ask for location,
hire price, booking details, rooms, capacities, layouts, facilities and access.
Events and venues do not require Find Me categories; their public pages omit the
interest-category filter, and venues omit the age filter. Existing saved
category associations and other hidden legacy information are preserved on edit.

Free is a large explicit toggle with an explanation of what no charge means for
each listing family. Selecting it sets cost to Free; for venues it also resets
the hourly price to zero and disables that price until Free is cleared.
Photographs remain before final submission and are moderated separately.

Apply additive migration `202611030002_listing_workflow.sql` before deploying
these forms. It relaxes only the category minimum for event and venue content;
all other validation, ownership and approval checks remain in place. Do not
reapply earlier migrations or alter existing listing content during installation.

## Calendar date filters — 4 November 2026

Events offer This Week (Monday–Sunday), This Month (default), Next Month and
Custom. Presets cover the whole calendar period, including events already held
in that period, and use New Zealand's current date. Multi-day events match when
any part of their date range overlaps the selected period. Custom reveals the
From date and To date controls and allows either bound to be left blank. Switching
presets clears custom bounds. Existing date-range and old upcoming/past/all links
remain usable, with old period links converted to Custom.

The home carousel’s View all events link opens a Custom range starting today,
so it continues to show every upcoming/ongoing event across future months.
