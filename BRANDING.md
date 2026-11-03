# BBCN branding reference

Verified from https://bbcn.org.nz/ on 27 October 2026.

The public website's organisation configuration identifies **Burnside and Bryndwr Community Network**, with brand green **#138a59**. Its official organisation mark was downloaded unmodified from the public `avatar_url` on BBCN's Hail-hosted website and is included at `public/branding/bbcn-logo.png`.

BBFind retains a distinctive directory identity and original community illustrations. It uses BBCN green for the shared site identity, with feature-specific navigation accents and identifies the parent organisation with its actual mark in the footer. Headline green is darkened to maintain accessible text contrast. Self-hosted DM Sans and Manrope provide directory typography; they are not presented as BBCN's official fonts.

The BBCN mark remains BBCN branding; inclusion does not transfer ownership or grant reuse rights to other projects. The demo branch additionally uses official public logos, programme artwork and real venue photographs, credited in DEMO_SOURCES.md and on listing pages. These editorial samples are labelled as not submitted or approved by the organisations or BBCN. User-uploaded listing photographs go through a separate private approval process.

## Feature palettes — 4 November 2026

| Feature | Primary text/action colour | Soft surface |
| --- | --- | --- |
| Find It / activities and programmes | `#244b3e` | `#edf2e6` |
| Events | `#51374f` | `#f6edf3` |
| Venues for Hire | `#62442e` | `#f8ecdd` |

`src/feature-themes.css` defines shared feature tokens and bridges older shared
controls to those tokens. Feature scopes cover public headers/results, listing
cards and details, the home event carousel, creation forms, private previews and
unsaved-change dialogs. Controls, icons, hover/selection/focus states, priority
neighbourhoods, filter chips, badges, upload forms and gallery chrome inherit the
relevant palette. New shared feature controls should reuse these tokens instead
of introducing hard-coded green values.

The shared BBCN header/footer retain the brand identity. Error/warning colours
retain their semantic meaning. Logos, photographs and original illustrations
retain their own image colours.
