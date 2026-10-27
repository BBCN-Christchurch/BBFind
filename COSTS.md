# Costs and free-tier limits

Source checks: 27 October 2026. No paid subscription, trial or add-on is authorised. Free plans have limits and can change; recheck before launch.

| Service | Verified free allowance / limitation | BBCN effect |
| --- | --- | --- |
| Supabase PostgreSQL | 500 MB database; shared CPU / 500 MB RAM. | Text listings should fit a modest directory; proposals and email jobs still consume space. No audit/revision-history tables. |
| Supabase Auth | 50,000 monthly active users; custom SMTP supported on Free. | Likely ample organisation capacity. Anonymous visitors do not each need an account. |
| Supabase Storage | 1 GB storage; 5 GB egress and separate 5 GB cached egress. | Images are likely the first capacity constraint. Processed image quotas: 50 MiB/organisation, 12/listing plus a temporary replacement. |
| Supabase transformations | Pro and above. | Excluded. Portable fast-png and jpeg-js processing generates bounded variants. |
| Supabase Edge Functions | 500,000 invocations; 256 MB memory, 2 seconds CPU/request, Free wall-clock limit 150 seconds. | Bounded processing passes in the actual local Edge Runtime; hosted free-tier CPU/memory limits still need measurement before launch. |
| Supabase Free operations | Two active projects; pauses after one week inactivity; no included automatic backups or uptime SLA. | Development + production fits two projects. BBCN owns backup/recovery and accepts possible pauses. |
| Supabase default email | Project-team recipients only; two messages/hour; not production-supported. | Must configure custom SMTP for public users. |
| Resend Free | Live pricing lists $0/month, 3,000 emails/month, 100/day and three domains; describes a free-forever plan. | Verification/reset and application notices share a quota. Requires authorised sender-domain setup. Keep pay-as-you-go disabled; no live delivery tested. |
| GitHub Pages Free | Public repository required; <=1 GB published site; soft 100 GB/month bandwidth; 10-minute deployment timeout. | Static public browsing only. Custom Actions workflow avoids the soft 10 builds/hour limit. No credential transactions on Pages. |
| GitHub Actions | Standard public-repository hosted workflows are the intended route. | Avoid paid runners, private-repository entitlements and artifact-heavy retention. Check current account allowance before enabling. |
| Cloudflare Pages Free (proposed portal) | Official maintained docs confirm 500 builds/month, 20,000 files/site, 25 MiB/file. | More than adequate for this static portal. No paid Workers/Images/R2 service is introduced. BBCN must verify account terms and connect the host before deployment. |
| React / TypeScript / Vite / libraries | Open-source software, pinned by package lock; self-hosted fonts. | No software subscription. Retain package licences. |
| Domain | Only authorised anticipated ongoing cost is domain registration/renewal. | Existing BBCN domain may provide SMTP DNS authority; do not assume access. |

Sources:

- https://supabase.com/pricing
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/functions/limits
- https://supabase.com/docs/guides/storage/serving/image-transformations
- https://resend.com/pricing
- https://raw.githubusercontent.com/github/docs/main/content/pages/getting-started-with-github-pages/github-pages-limits.md
- https://raw.githubusercontent.com/github/docs/main/data/reusables/gated-features/pages.md
- https://raw.githubusercontent.com/github/docs/main/data/reusables/pages/no_sensitive_data_pages.md
- https://raw.githubusercontent.com/cloudflare/cloudflare-docs/production/src/content/docs/pages/platform/limits.mdx

All Supabase sources and Resend pricing were accessible during the current planning/build work. Direct Cloudflare documentation was policy-blocked, so its official maintained GitHub documentation was used. BBCN branding was subsequently verified from its website: #138a59 and its public organisation mark. See BRANDING.md.

Quotas are not promises of unlimited free operation. Monitor database, image bytes, bandwidth, email and CPU, and reject uploads before exhausting quotas. No automatic paid upgrade is included. Backups and their secure storage need an operational home; self-hosted open-source software is not automatically free hosting.
