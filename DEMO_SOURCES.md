# Community demo sources and image credits

Original 17 samples checked on **3 November 2026**. The **4 November 2026** directory import adds 103 records (120 total); see [the import coverage and corrections](docs/DIRECTORY_IMPORT.md) and [new image credits](public/demo/directory/credits.json). Current-page checks and older PDF-only information are distinguished on every imported listing. These are editorial sample listings for the `demo` branch, not organisation submissions or BBCN endorsements. Descriptions are paraphrased from official public pages. No registration records, private contact details or live database content are copied.

## Listing sources

| Samples | Official source |
| --- | --- |
| St Timothy's Church | https://burnsidechurch.nz/ |
| Tea and Tots (explicitly free) | https://burnsidechurch.nz/tea-and-tots |
| Nexus English classes (explicitly free; potluck excluded because on hold) | https://burnsidechurch.nz/nexus |
| Gold Card Club ($3 published contribution) | https://burnsidechurch.nz/gold-card |
| St Timothy's hall (40 around tables; ramp and accessible toilet) | https://burnsidechurch.nz/hall-hire |
| St Aidan's church and community centre | https://www.staidans.org.nz/ |
| Vege co-op ($18 published bag price) | https://www.staidans.org.nz/vege-coop |
| St Aidan's facility hire | https://www.staidans.org.nz/facilities-hire |
| Rangatahi Bryndwr Breakfast Club (cost not stated) | https://www.staidans.org.nz/breakfast-club |
| BBCN | https://bbcn.org.nz/ |
| Aurora Centre (rates/capacity left unspecified) | https://www.burnside.school.nz/about-the-aurora-centre/ |
| Specialist Music Programme | https://www.burnside.school.nz/specialist-music-programme/ |
| Wairarapa Cobham Intermediate | https://www.cobham.school.nz/ |
| Elim Church — Burnside (193 Grahams Road, Sunday 10am) | https://www.elimchristchurch.org/location-burnside |
| Burnside Park Tennis Club | https://clubspark.kiwi/BurnsideParkTennisClub and https://clubspark.kiwi/BurnsideParkTennisClub/Contact |
| Whānau Āwhina Plunket — Fendalton Clinic | https://www.plunket.org.nz/plunket-near-me/fendalton-plunket-clinic/ |
| Kendal Medical Centre (business) | https://www.kendalmedical.co.nz/ and https://www.kendalmedical.co.nz/contact/ |

For the original 17 samples, public office contact details are included only where published on these sites. The later import also retains role/service contacts from the supplied PDF, explicitly dated and marked for confirmation where not reverified. Personal contacts from account registration and personal mobile numbers were not used. Published times and fees can change; listing pages link to the current source. A zero venue rate/capacity represents unspecified information, never free hire or zero capacity. Within the original 17 samples, only the two programmes explicitly described as free are marked Free. The later import also marks confirmed free helplines and support services; trials and unknown fees remain excluded.

## Images

Images are stored locally rather than hotlinked to social media. Original sample assets are unmodified; new import raster graphics are resized and encoded as metadata-free WebP. Gallery and listing pages display source credits. Photographs depict the actual venue where identified; programme art and logos are labelled accordingly. No stock photograph is represented as a photograph of a local programme.

Copyright and trademarks remain with the respective owners. Source attribution documents provenance; it does not assert a Creative Commons licence, transfer ownership or claim that the organisation supplied/approved a directory listing.

| Local asset | Public source download |
| --- | --- |
| `public/demo/tea-and-tots.png` | https://burnsidechurch.nz/tea-and-tots/media/974db4fa7298cda786811af75557ec92.png |
| `public/demo/st-timothy-hall.jpg` | https://burnsidechurch.nz/hall-hire/media/5796c7072b2a527ddc8c5ff027bc32a6.jpg |
| `public/demo/st-aidan-logo.png` | https://images.squarespace-cdn.com/content/v1/62031b4f3b1cc94e7888b428/c4a7d75a-7959-448e-aa67-ed30954e6a33/St+Aidans+Logo_Web.png?format=750w |
| `public/demo/st-aidan-centre.jpg` | https://images.squarespace-cdn.com/content/v1/62031b4f3b1cc94e7888b428/fac623dc-25c7-4420-b0d8-ca48d7a96a90/tuxpi.com.1683537591.jpg?format=1000w |
| `public/demo/rangatahi-bryndwr.png` | https://images.squarespace-cdn.com/content/v1/62031b4f3b1cc94e7888b428/d0ba0b0d-6a10-4a62-893c-e9a6849207d1/RBT+Logo.png?format=750w |
| `public/demo/cobham-logo.png` | https://www.cobham.school.nz/wp-content/uploads/2026/04/logo-standard.png |
| `public/demo/burnside-high-logo.svg` | https://www.burnside.school.nz/wp-content/themes/burnside/assets/img/watermark.svg |
| `public/demo/aurora-exterior.png` | https://www.burnside.school.nz/wp-content/uploads/2025/05/aurora_center-1.png |
| `public/branding/bbcn-logo.png` | Official BBCN mark, documented in BRANDING.md; https://bbcn.org.nz/ |
| `public/demo/elim-christchurch-logo.png` | https://static.wixstatic.com/media/833054_8026d36f355749cebd8bf0c8d0135abb~mv2.png |
| `public/demo/burnside-tennis-logo.png` | https://clubspark.kiwi/Library/BurnsideParkTennisClub?command=Proxy&lang=en&type=Favicons&currentFolder=%2F&hash=485835458b6bbb2eb3d04adc91271c3ec3184f21&fileName=BPTC%20Logo%20PNG.png |
| `public/demo/kendal-medical-website.jpg` | https://www.kendalmedical.co.nz/wp-content/uploads/2025/06/foxandbee.jpg |
| `public/demo/plunket-logo.png` | https://www.plunket.org.nz/_resources/themes/plunket/assets/plunket-logo-static.png |

The large duplicate St Timothy's exterior and a navigation-arrow SVG were excluded. The retained church photograph is credited as a venue photograph, not a programme-session photograph. No photos of identifiable children were selected.

## Running the demo

`npm run dev` and `npm run build` use `scripts/demo.mjs`, which clears the live client configuration, account-portal link and privileged service bindings in child processes. They always use local sample listings. Inherited Cloudflare production variables therefore do not connect this branch preview to the live Supabase project.

`dev:app` is retained for the existing isolated browser fixtures; it must not be used with live service settings for a sample demo. Local real-service tests use disposable credentials and services. Do not run migrations, email configuration scripts or hosted administrative commands against production from this demo task.

Cloudflare can build a preview of `demo`; its production branch remains `main`. The GitHub public-site workflow is guarded against dispatching this demo branch to the production Pages site. No real organisation account, image record or listing was created by this work.

## Additional sample notes

The Plunket listing uses the officially listed nearby **Fendalton clinic**, with
its actual Fendalton address and suburb, rather than asserting an unverified
Burnside clinic. Kendal Medical is explicitly a **business**, under Local
Businesses and Services and Health and Welfare Services. Its flower image is the
illustrative photograph used on the practice website; it is not presented as the
clinic premises. Elim, the tennis club and Plunket use official website branding.
No unknown membership, consultation or clinic charge is labelled Free.
