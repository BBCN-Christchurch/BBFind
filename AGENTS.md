# BBFind demo branch

This branch is a public-information demo. Use the existing checkout and work on
`demo`; do not create a worktree unless the user asks. Push demo work to `demo`.
Production sites and data use `main` and are outside demo work unless the user
explicitly requests a production change.

`npm run dev` and `npm run build` use the isolated sample launcher. They clear
inherited live client configuration and privileged service bindings in child
processes. Keep this behavior. Do not run hosted database, email or administration
commands as part of sample-data work. Do not copy production users or private
listing proposals into samples.

Use official public sources for factual listings and maintain `DEMO_SOURCES.md`,
the checked date and visible image credits. Keep sample/review labels accurate;
do not invent prices, capacity, schedules or endorsement. Preserve image owners'
rights and do not present programme artwork as a photograph of the programme.

Run `npm test`, `npm run build` and appropriate Playwright checks for changes.
Browser fixtures intentionally use `dev:app` with explicit local credentials;
the real-service integration harness uses disposable services. Never treat those
test commands as a reason to connect the demo to production.
