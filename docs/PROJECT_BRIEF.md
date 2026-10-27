# PROJECT BRIEF: BBCN Community Directory

## Project name
Burnside Bryndwr Community Network – Community Directory

## 1. Project overview

Build a modern, attractive, fully functional online Community Directory for the Burnside Bryndwr Community Network (BBCN), serving Christchurch, New Zealand.

The directory should be inspired by the functionality and general concept of the FOUND Directory (https://www.found.org.nz/), but have its own distinctive identity, design and user experience that reflects BBCN.

The purpose is to make it easy for local residents to discover community organisations, activities, services, businesses, programmes and venues throughout the wider Burnside–Harewood area, with a primary focus on Burnside and Bryndwr.

The directory should be a practical community resource, helping people find opportunities to participate, connect, access services and become involved in their local community.

It must also make it easy for community organisations and businesses to promote themselves.

This is not simply a static website. It must be a functional directory application with:
- Public searchable listings.
- Organisation registration and secure accounts.
- Multiple listings belonging to one organisation.
- Self-service listing management.
- Administrator review and approval.
- A dedicated Venues for Hire directory.
- A secure database.
- A foundation for future event advertising.

## 2. Important project requirements

These requirements are fundamental and must guide all technical and design decisions.

### Cost
All components must be free to operate.

There must be:
- No subscriptions.
- No paid plugins.
- No paid APIs.
- No paid database services.
- No paid authentication services.
- No paid software dependencies.
- No requirement for a commercial website hosting subscription.

The only anticipated ongoing cost is purchasing and renewing a dedicated domain name when BBCN is ready to move beyond the initial GitHub-hosted version.

Use open-source software and genuinely free hosting/service tiers.

Free-tier usage limits must be considered and documented. Do not assume that a free trial is equivalent to a permanently free service.

If a component requires payment, find a suitable free alternative.

Do not introduce a dependency on a paid service without explicitly explaining why it is necessary and obtaining approval.

### Hosting and portability
Initially, the project will be maintained in a BBCN-owned GitHub repository.

The initial public website should use GitHub Pages if practical, with a separate free backend service where required.

Use a suitable full-stack architecture that allows:
- The frontend to be hosted independently.
- The database to be migrated independently.
- Authentication to be replaced if necessary.
- The website to move to its own domain and hosting provider later.

Avoid hardcoding the GitHub Pages address into application logic.

Make the application configurable for:
- Local development.
- GitHub Pages deployment.
- A future custom domain.
- A future alternative hosting provider.

Do not use GitHub as the database or as a storage mechanism for private registration information.

## 3. Recommended technology stack

Use the following unless there is a compelling technical reason to recommend an alternative.

**Frontend**
- React
- TypeScript
- Vite
- Responsive, mobile-first design
- Modern CSS or Tailwind CSS

**Source control**
- GitHub repository.
- GitHub Actions for automated testing and deployment.
- GitHub Pages for initial frontend hosting, where compatible.

**Database and authentication**
- Supabase free tier.
- PostgreSQL database.
- Supabase Auth for organisation accounts.
- Supabase Storage for listing photographs and logos, subject to free-tier limits.
- Row Level Security (RLS) for access control.

All database access must be properly secured.

Never expose Supabase service-role credentials or other privileged secrets in frontend code.

The Supabase anonymous/publishable key may be used in the frontend only with appropriate RLS policies.

Use environment variables and provide a .env.example file.

Document how to establish the Supabase project and connect it to the application.

Codex must check the current free-tier terms and technical limitations of all proposed services before implementation.

## 4. Website structure and navigation

The main website navigation should be simple and prominent.

Primary navigation:

1. Home
2. Find It
3. Get Found
4. Venues for Hire
5. About the Directory

Provide clear calls to action for:
- Search the directory.
- Add your organisation.
- Find a venue.
- Sign in.

### Home page

Create a welcoming homepage that immediately communicates the purpose of the directory.

Suggested headline:

"Discover what's happening in your community."

Suggested supporting text:

"Find local groups, activities, organisations, services and venues across Burnside, Bryndwr and the wider community."

Include:
- A prominent search bar.
- A Find It feature.
- Category navigation.
- A prominent Get Found section.
- A Venues for Hire feature.
- Featured community organisations.
- A short explanation of how the directory works.
- A clear invitation for organisations to join.

Do not overcrowd the homepage.

## 5. FIND IT – Public search directory

This is the primary public-facing feature.

Create a searchable directory of organisations, community groups, businesses, programmes, services and activities.

### Search functionality

Users must be able to search by:
- Organisation name.
- Programme or activity name.
- Keywords.
- Description.
- Category.
- Suburb/location.
- Services provided.

Provide useful filters and sorting options.

Search should be responsive and return relevant results without requiring exact wording.

### Categories

Create a flexible category and subcategory system.

Initial suggested categories:

1. Arts, Heritage and Culture.
2. Churches and Faith Communities.
3. Community Groups and Special Interests.
4. Education and Learning.
5. Health and Wellbeing.
6. Health and Welfare Services.
7. Local Businesses and Services.
8. Recreation and Hobbies.
9. Sports and Exercise.
10. Children, Youth and Families.
11. Older People and Seniors.
12. Ethnic and Multicultural Communities.
13. Government and Community Support.
14. Schools and Early Childhood.
15. Venues and Facilities.

Categories must be manageable by BBCN administrators.

A listing should be able to belong to more than one relevant category where appropriate.

### Geographic coverage

The directory should primarily serve:
- Burnside.
- Bryndwr.

It should also include the wider Burnside–Harewood community catchment.

Support suburb/location filtering, including suburbs such as:
- Harewood.
- Bishopdale.
- Papanui.
- Fendalton.
- Ilam.
- Avonhead.
- Casebrook.
- Russley.
- Other relevant surrounding Christchurch suburbs.

Do not artificially restrict listings to these examples. Administrators should be able to add locations.

Include an optional map/location feature if it can be implemented using free mapping technology without paid API dependencies.

### Public listing pages

Each listing should have its own shareable public URL.

Display the following where supplied and approved:

- Organisation or programme name.
- Logo or photograph.
- Short introduction.
- Full description.
- Category and subcategory.
- Address or location.
- Website.
- Public email address (optional).
- Public phone number (optional).
- Public contact person's name (optional).
- Social media links.
- Opening hours or meeting times.
- Activities and services.
- Accessibility information.
- Age groups catered for.
- Cost or membership information, if applicable.
- Relevant additional information.

Provide clear website and contact links.

Do not display private registration information under any circumstances.

## 6. GET FOUND – Organisation registration and listing management

This section enables organisations, groups and businesses to register and promote themselves.

### Important principle: One registration, multiple listings

A registered organisation may have multiple public listings.

For example, a church might register once and then create:

- Its main church listing.
- A children's programme.
- A youth programme.
- A community outreach programme.
- An ESOL programme.
- A venue listing for its hall.

All these listings should belong to the same registered organisation account.

The same principle applies to schools, businesses, charities, sports clubs and other organisations.

Do not require a new account for every listing.

### Registration process

Create a registration and account creation process.

Required registration information:

- Organisation/account name.
- Registration contact person's name.
- Email address.
- Contact phone number.
- Password.

The name, email and phone number supplied during registration are private account/administrative information.

They must never be automatically displayed on public listings.

Require email verification before allowing full account access.

Provide secure password reset functionality.

### Organisation dashboard

Once signed in, an organisation should have its own dashboard.

The dashboard should display:

- Organisation account details.
- All its submitted listings.
- Listing status.
- Publicly published listings.
- Listings awaiting approval.
- Listings requiring changes.
- Draft listings.
- Options to create additional listings.
- Options to edit existing listings.
- Account settings.
- Password management.

Allow the registered organisation to maintain all its listings from one account.

### Multiple listing types

Allow an organisation to create:

1. Organisation listing.
2. Programme or activity listing.
3. Service listing.
4. Business listing.
5. Venue for Hire listing.

Use appropriate forms depending on the listing type.

For example, a programme listing might include:
- Programme name.
- Parent organisation.
- Description.
- Target age group.
- Meeting times.
- Location.
- Cost.
- Contact information.

A venue listing should have its own dedicated information fields.

Allow organisations to create multiple listings of the same type.

### Listing submission and approval

All new listings must be reviewed by a BBCN administrator before appearing publicly.

The process should be:

1. Organisation creates a listing.
2. Organisation saves and submits it.
3. Listing receives a Pending Review status.
4. BBCN administrator reviews the submission.
5. Administrator approves, rejects or requests changes.
6. Approved listing becomes publicly visible.

The organisation should receive appropriate status information.

When an organisation edits an existing published listing:
- Save the proposed changes.
- Create a pending revision for administrator review.
- Retain the existing approved public version until the revision is approved.
- Publish the revised version only after administrator approval.

This is important. Editing a public listing must not immediately bypass administrator moderation.

Provide a clear revision history and submission status.

## 7. VENUES FOR HIRE

Create a dedicated Venues for Hire section with its own search and filtering system.

Venues can belong to existing registered organisations or be submitted by organisations that have not previously registered.

If an organisation already has an account, it should be able to add its venue without registering again.

If it is a new organisation, it must first create an account.

### Venue listing information

Include:

- Venue name.
- Parent organisation.
- Address and location.
- Main photograph.
- Additional photographs.
- Venue description.
- Room/facility types.
- Maximum capacity.
- Seating arrangements.
- Kitchen facilities.
- Toilets.
- Accessibility.
- Parking availability.
- Audio/visual equipment.
- Wi-Fi availability.
- Outdoor facilities.
- Suitable activities and functions.
- Indicative hire prices.
- Availability information, if provided.
- Public contact information.
- Website or booking link.

Allow venues to have multiple rooms or hire spaces under one venue listing where appropriate.

### Venue search filters

Include:
- Suburb/location.
- Capacity.
- Room type.
- Kitchen availability.
- Accessibility.
- Indoor/outdoor facilities.
- Suitable activities.
- Price, where supplied.

Venue listings must also be included in the main Find It search where relevant.

## 8. BBCN ADMINISTRATION

Create a secure administrator dashboard.

Administrator access must be separate from normal organisation accounts.

Administrators should be able to:

### Listing management
- View all submitted listings.
- Review pending submissions.
- Approve listings.
- Reject listings.
- Request changes.
- Edit listings.
- Unpublish listings.
- Archive or delete listings.
- Review proposed changes to existing listings.
- View revision history.

### Organisation management
- View registered organisations.
- View their private registration information.
- View all listings belonging to each organisation.
- Suspend accounts where necessary.
- Disable or restore listings.
- Assist organisations with account issues.

### Category management
- Create and edit categories.
- Create and edit subcategories.
- Reassign categories.
- Manage geographic locations and suburbs.

### Featured listings
Allow administrators to select organisations, programmes or services for featured placement on the homepage.

### Verification
Allow administrators to mark listings as verified.

Display a suitable verified indicator on the public listing.

### Dashboard overview
Include useful administrative statistics:
- Total registered organisations.
- Total public listings.
- Listings awaiting review.
- Venues listed.
- Recently updated listings.
- Suspended or archived listings.

### Security
The initial administrator account must be established through a documented secure setup process.

Never make the first registered user an administrator automatically.

Protect all administrator functions with server-side/database permissions and RLS policies, not just frontend visibility controls.

Keep an audit trail of important administrator actions.

## 9. DATABASE DESIGN

Create a properly structured relational database.

The design must support one organisation having many listings.

Suggested entities:

- users/accounts.
- organisation_profiles.
- listings.
- listing_revisions.
- categories.
- subcategories.
- suburbs/locations.
- listing_categories.
- venues.
- venue_spaces, if required.
- listing_images.
- administrator_roles.
- moderation_history.
- audit_logs.

An organisation must be linked to its account.

Every listing must have an organisation owner.

The database must support different listing types without creating separate registration systems.

Use appropriate foreign keys, indexes, constraints and timestamps.

### Listing statuses

Support:
- Draft.
- Pending Review.
- Changes Requested.
- Approved/Published.
- Rejected.
- Archived.
- Suspended.

Maintain a clear distinction between an approved public listing and a proposed unpublished revision.

### Privacy

Keep the following information private:
- Registration contact person's name.
- Registration email.
- Registration phone.
- Password/authentication information.
- Internal administrator notes.
- Moderation discussions.

Allow separate optional public contact information on each listing.

Never expose private registration data through public API queries, search results, frontend state or page source.

Include appropriate data access controls and a process for account deletion and data export.

Consider the New Zealand Privacy Act 2020 when designing data collection, access, retention and privacy information.

## 10. FUTURE DEVELOPMENT – EVENTS

Do not implement a full events system in the initial release.

However, design the database and application architecture so that a future update can allow registered organisations to advertise events.

The future system should allow an organisation to:
- Submit events.
- Add event descriptions and photographs.
- Specify dates and times.
- Specify venues.
- Include booking or registration links.
- Submit events for administrator approval.
- Edit and manage its own events.

Events should be associated with the organisation account, not require separate registration.

The future events feature should be capable of integrating into the main search directory and a dedicated events page.

Do not allow this future requirement to complicate or delay the initial directory.

## 11. DESIGN AND USER EXPERIENCE

Create a professional, welcoming and contemporary community directory.

The design should:
- Reflect the identity of BBCN.
- Have its own visual personality.
- Feel local, inclusive and accessible.
- Be easy for all ages to use.
- Work particularly well on mobile phones.
- Have clear navigation.
- Use attractive listing cards.
- Use clear category icons or illustrations.
- Avoid clutter.
- Have consistent typography and spacing.

Use the existing BBCN website as a branding reference:
https://bbcn.org.nz/

Use its general identity and colours as inspiration, but create a distinctive directory design.

Use the FOUND Directory as a functional reference only. Do not copy its branding or exact layout.

Avoid generic corporate dashboard styling on the public-facing website.

Prioritise a good search experience.

### Accessibility

Aim for WCAG 2.2 AA accessibility standards.

Include:
- Good colour contrast.
- Keyboard navigation.
- Accessible forms.
- Clear error messages.
- Screen-reader-friendly labels.
- Responsive text sizing.
- Appropriate image alt text.

## 12. SEARCH ENGINE OPTIMISATION

Build the directory with SEO in mind.

Include:
- Descriptive page titles.
- Meta descriptions.
- Clean, shareable listing URLs.
- Open Graph metadata.
- Appropriate structured data where relevant.
- Sitemap generation where practical.
- Robots.txt.
- Canonical URL configuration.

Make it easy for local residents to find community groups and services through Google.

Account and administration pages must not be indexed.

## 13. EMAIL AND NOTIFICATIONS

Use free email functionality where available.

At minimum, the system should support:
- Account verification.
- Password reset.
- Registration confirmation.
- New listing submission confirmation.
- Administrator notification of pending submissions.
- Approval notifications.
- Changes-requested notifications.

Do not introduce a paid email provider.

Check the limits of the chosen free authentication/email service. If an external SMTP service is required, identify a suitable genuinely free option and document its limitations before implementation.

Do not claim email functionality is operational until it has been configured and tested.

## 14. TESTING AND QUALITY ASSURANCE

The application must be functional, not merely a visual mock-up.

Test the complete workflows.

### Public website
- Homepage loads.
- Navigation works.
- Directory search works.
- Filters work.
- Categories work.
- Listing pages work.
- Venue search works.
- Mobile layouts work.

### Organisation accounts
- Registration works.
- Email verification works.
- Login and logout work.
- Password reset works.
- Private account details remain private.
- An organisation can create multiple listings.
- An organisation can edit its listings.
- An organisation cannot access another organisation's private listings or account.

### Administrator
- Administrator login works.
- Pending submissions appear.
- Approval works.
- Rejection and changes-requested workflows work.
- Listing revisions are correctly handled.
- Administrators can manage categories.
- Private registration information is accessible only to authorised administrators.

### Security
Test RLS policies and unauthorised access.

Test that changing IDs or API requests cannot allow an organisation to modify another organisation's records.

Test that pending revisions cannot appear publicly.

### Deployment
- GitHub repository builds successfully.
- GitHub Actions workflow operates.
- GitHub Pages deployment works.
- Environment variables are configured correctly.
- No secrets are committed to GitHub.
- The application can be configured for a future custom domain.

## 15. DOCUMENTATION AND HANDOVER

Provide the following documentation in the repository:

README.md
- Project overview.
- Technology stack.
- Local development instructions.
- Build instructions.
- Deployment instructions.

DATABASE.md
- Database structure.
- Table relationships.
- Database setup.
- Migration instructions.

ADMIN_SETUP.md
- Initial administrator setup.
- Administrator permissions.
- Managing submissions.

DEPLOYMENT.md
- GitHub setup.
- GitHub Pages configuration.
- Supabase configuration.
- Environment variables.
- Future custom domain migration.

PRIVACY.md
- Information collected.
- Public versus private information.
- Access controls.
- Data retention.
- Account deletion.

COSTS.md
- Every external service used.
- Its current free-tier allowance.
- Usage limitations.
- Confirmation that no subscription is required.
- Potential future costs or risks.

Include database migration scripts and a safe method for exporting and backing up directory data.

Include .env.example without real credentials.

## 16. DEVELOPMENT APPROACH

Do not attempt to build the entire application in one unstructured step.

Work in phases.

### Phase 1 – Project inspection and planning
- Inspect the existing GitHub repository and any existing project files.
- Identify existing BBCN design assets and branding.
- Confirm the proposed technology stack.
- Produce a system architecture.
- Produce the database schema.
- Identify all third-party services and verify their free-tier status.
- Identify technical limitations of GitHub Pages.
- Present the implementation plan.

Do not overwrite existing files or projects without first understanding their purpose.

### Phase 2 – Public-facing website
Build:
- Homepage.
- Main navigation.
- Find It search.
- Category pages.
- Public listing pages.
- Venues for Hire.
- Get Found landing page.

Use clearly labelled demonstration data until a real database is connected.

### Phase 3 – Database and authentication
Implement:
- Supabase connection.
- Database schema.
- Authentication.
- Email verification.
- Organisation accounts.
- Secure access policies.

### Phase 4 – Organisation dashboard
Implement:
- Account management.
- Multiple listings.
- Listing creation.
- Listing editing.
- Venue submissions.
- Submission status.
- Revision handling.

### Phase 5 – Administration
Implement:
- Administrator authentication.
- Review dashboard.
- Approval workflows.
- Organisation management.
- Category management.
- Moderation history.

### Phase 6 – Testing and deployment
- Run automated tests.
- Test security.
- Test mobile responsiveness.
- Test the complete user workflows.
- Configure GitHub deployment.
- Produce final documentation.

## 17. IMPORTANT INSTRUCTIONS TO CODEX

Treat this as a real community project intended for long-term use.

Prioritise:
1. Security and privacy.
2. Reliability.
3. Ease of use.
4. Low ongoing cost.
5. Maintainability.
6. Future portability.

Do not build features that require paid subscriptions.

Do not store private data in public GitHub repositories.

Do not expose registration contact details publicly.

Do not allow organisations to publish unapproved content.

Do not require separate registration for each listing.

Do not implement a complex events system yet.

Do not use dummy buttons or non-functional forms in the completed application.

Do not silently substitute a paid service for a free one.

Where a technical requirement cannot be met with the proposed free architecture, explain the limitation and offer alternatives.

Keep the application modular and well documented.

### Initial instruction

Begin with Phase 1.

Inspect the existing repository and prepare the architecture, database design and implementation plan.

Do not immediately start making extensive code changes.

Present the proposed architecture, technology choices, free-service dependencies and any significant technical limitations first.

Once the plan has been reviewed, proceed with implementation phase by phase.

The finished product should be a fully operational BBCN Community Directory that can grow over time without requiring a costly redevelopment.