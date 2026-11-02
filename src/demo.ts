import { emptyListing, type DemoImage, type Listing } from "./domain";

// Editorial samples from official public pages. No live account/database data.
const checked = "3 November 2026";
const church = "https://burnsidechurch.nz";
const aidans = "https://www.staidans.org.nz";
const school = "https://www.burnside.school.nz";
const image = (
  path: string,
  alt: string,
  caption: string,
  credit: string,
  sourceUrl: string,
  kind: DemoImage["kind"] = "photo",
  dark = false,
): DemoImage => ({ path, alt, caption, credit, sourceUrl, kind, dark });
const churchPhoto = image(
  "demo/st-timothy-hall.jpg",
  "St Timothy's church and hall on Kendal Avenue",
  "St Timothy's, home to its church and community programmes.",
  "Photograph published on St Timothy's official hall-hire page.",
  `${church}/hall-hire`,
);
const aidansLogo = image(
  "demo/st-aidan-logo.png",
  "St Aidan's Anglican Church and Community Centre logo",
  "St Aidan's official organisation logo.",
  "Logo: St Aidan's Anglican Church & Community Centre.",
  aidans,
  "logo",
);
const aidansPhoto = image(
  "demo/st-aidan-centre.jpg",
  "Entrance to St Aidan's community facilities",
  "Community facilities shown on St Aidan's official hire page.",
  "Photograph published on St Aidan's official facilities-hire page.",
  `${aidans}/facilities-hire`,
);
const schoolLogo = image(
  "demo/burnside-high-logo.svg",
  "Burnside High School crest",
  "Burnside High School's official crest.",
  "Crest: Burnside High School.",
  school,
  "logo",
  true,
);
const make = (
  id: string,
  data: Partial<Listing> &
    Pick<Listing, "name" | "summary" | "description" | "sourceUrl">,
): Listing => ({
  ...emptyListing,
  id,
  sourceChecked: checked,
  ...data,
});
const stTimothy = {
  organisation_name: "St Timothy's Church, Burnside",
  suburb: "Burnside",
  address: "46 Kendal Avenue, Christchurch 8053",
  publicEmail: "office@burnside.org.nz",
};
const stAidan = {
  organisation_name: "St Aidan's Anglican Church & Community Centre",
  suburb: "Bryndwr",
  address: "63 Brookside Terrace, Christchurch 8053",
  publicEmail: "staidans.bryndwr@gmail.com",
  publicPhone: "03 351 8075",
};
export const demoListings: Listing[] = [
  make("demo-tea-and-tots", {
    ...stTimothy,
    name: "Tea and Tots",
    type: "activity",
    summary:
      "A free playgroup for preschool children and their caregivers at St Timothy's in Burnside.",
    description:
      "Tea and Tots welcomes preschool children, from babies to school age, with their parents, grandparents and other caregivers. The official programme page describes toys, puzzles and play equipment, with a chance for adults to enjoy a cuppa and conversation while children play.",
    categories: [
      "Children, Youth and Families",
      "Community Groups and Special Interests",
    ],
    times:
      "The published schedule is 10am–noon on the second and fourth Monday of the month, except public holidays. Confirm the next session with the church.",
    ageGroups: "Preschool children and their caregivers",
    cost: "Free",
    featured: true,
    website: `${church}/tea-and-tots`,
    sourceUrl: `${church}/tea-and-tots`,
    demoImages: [
      image(
        "demo/tea-and-tots.png",
        "Giraffe artwork used on the official Tea and Tots page",
        "Programme artwork from the official Tea and Tots page.",
        "Artwork published on St Timothy's official Tea and Tots page.",
        `${church}/tea-and-tots`,
        "artwork",
      ),
      churchPhoto,
    ],
  }),
  make("demo-gold-card-club", {
    ...stTimothy,
    name: "Gold Card Club",
    type: "activity",
    summary:
      "A friendly seniors group with gentle exercise, morning tea, conversation, quizzes and games.",
    description:
      "St Timothy's Gold Card Club offers a welcoming morning for older people in the local community. The official page describes gentle exercise, morning tea, quizzes, discussions, crafts and games. The published contribution helps fund celebrations and equipment; confirm current arrangements before attending.",
    categories: ["Older People and Seniors", "Recreation and Hobbies"],
    times:
      "The programme page lists Thursdays, 10am–12:30pm, in the church hall. Confirm current sessions with the church.",
    ageGroups: "Older people and seniors",
    cost: "$3 per session, as published; confirm the current contribution.",
    website: `${church}/gold-card`,
    sourceUrl: `${church}/gold-card`,
    demoImages: [churchPhoto],
  }),
  make("demo-nexus-english", {
    ...stTimothy,
    name: "Nexus Free English Classes",
    type: "programme",
    summary:
      "Free English classes supporting connections between migrants and the local Burnside community.",
    description:
      "Nexus is St Timothy's multi-ethnic community, connecting and supporting migrants as they become involved locally. Its official page advertises free English classes at St Timothy's. Contact the church to confirm class availability and the current timetable. The separately advertised potluck dinner is listed as on hold and is not included here as an active programme.",
    categories: [
      "Education and Learning",
      "Ethnic and Multicultural Communities",
    ],
    times:
      "The published English class times are Tuesday at 6pm and Saturday at 10am. Confirm before attending.",
    cost: "Free",
    website: `${church}/nexus`,
    sourceUrl: `${church}/nexus`,
    demoImages: [churchPhoto],
  }),
  make("demo-st-timothy-hall", {
    ...stTimothy,
    name: "St Timothy's Church Hall",
    featured: true,
    type: "venue",
    summary:
      "A light-filled community hall on Kendal Avenue, seating up to 40 people around tables.",
    description:
      "The official hall-hire page describes a space suitable for a variety of groups and activities, with seating for up to 40 people around tables. It lists a kitchen serving window, windows along two exterior walls, a ramp and an accessible toilet. Ask the church office about current hire charges, availability and suitability for your event.",
    categories: ["Venues and Facilities"],
    capacity: 40,
    roomType: "Church hall",
    kitchen: true,
    accessible: true,
    toilets: true,
    accessibility:
      "The published hall information lists a ramp and an accessible toilet.",
    facilities: "Kitchen serving window, ramp and accessible toilet.",
    spaces: "Hall — up to 40 people seated around tables.",
    suitableFor:
      "Community groups and activities; confirm your intended use with the church.",
    cost: "Contact the church office for current hire rates.",
    website: `${church}/hall-hire`,
    bookingUrl: `${church}/hall-hire`,
    sourceUrl: `${church}/hall-hire`,
    demoImages: [churchPhoto],
  }),
  make("demo-st-aidans", {
    ...stAidan,
    name: "St Aidan's Anglican Church & Community Centre",
    type: "organisation",
    summary:
      "A Bryndwr church and community centre connecting neighbours through faith, food and shared spaces.",
    description:
      "St Aidan's describes community and relationships as central to its life in Bryndwr. Its official website introduces worship, the Rangatahi Bryndwr Breakfast Club, a vege co-op and facilities available for hire. Contact its public office for current programmes and enquiries.",
    categories: [
      "Churches and Faith Communities",
      "Community Groups and Special Interests",
    ],
    featured: true,
    website: aidans,
    sourceUrl: aidans,
    demoImages: [aidansLogo, aidansPhoto],
  }),
  make("demo-st-aidans-vege-coop", {
    ...stAidan,
    name: "St Aidan's Vege Co-op",
    type: "service",
    summary:
      "A weekly fruit and vegetable co-op with Wednesday morning collection in Bryndwr.",
    description:
      "The official St Aidan's vege co-op page advertises a bag of fresh fruit and vegetables for $18, with weekly Wednesday morning collection. Contact the church office to join and confirm the current price, collection arrangements and availability.",
    categories: [
      "Community Groups and Special Interests",
      "Health and Wellbeing",
    ],
    times: "Wednesday morning collection; contact the office to join.",
    cost: "$18 per bag, as published; confirm the current price.",
    website: `${aidans}/vege-coop`,
    sourceUrl: `${aidans}/vege-coop`,
    demoImages: [aidansLogo],
  }),
  make("demo-st-aidans-hire", {
    ...stAidan,
    name: "St Aidan's Spaces for Hire",
    type: "venue",
    summary:
      "Meeting rooms, a hall, church and kitchen available for community use in Bryndwr.",
    description:
      "St Aidan's official hire page advertises five spaces, including meeting rooms, the hall, church and kitchen. It describes discounts for regular bookings or multiple spaces and a bond for one-off hall or church hire. Contact the office for the appropriate room capacity, a current price list and booking conditions.",
    categories: ["Venues and Facilities"],
    roomType: "Meeting rooms, hall and church",
    kitchen: true,
    spaces:
      "Small meeting room; large meeting room; hall; church; kitchen. Confirm capacities and layouts with the office.",
    cost: "Room-specific rates and conditions apply; request the current price list.",
    website: `${aidans}/facilities-hire`,
    bookingUrl: `${aidans}/facilities-hire`,
    sourceUrl: `${aidans}/facilities-hire`,
    demoImages: [aidansPhoto, aidansLogo],
  }),
  make("demo-bbcn", {
    name: "Burnside and Bryndwr Community Network",
    type: "organisation",
    suburb: "Burnside",
    summary:
      "Connecting neighbours, schools, community groups and businesses across Burnside and Bryndwr.",
    description:
      "Formed in early 2023, BBCN brings neighbours, schools, local groups and businesses together to strengthen Burnside and Bryndwr. Its public website describes a focus on connection, collaboration and community wellbeing, and invites residents to share ideas and take part in community life.",
    categories: [
      "Community Groups and Special Interests",
      "Government and Community Support",
    ],
    website: "https://bbcn.org.nz/",
    publicEmail: "info@bbcn.org.nz",
    sourceUrl: "https://bbcn.org.nz/",
    demoImages: [
      image(
        "branding/bbcn-logo.png",
        "Burnside and Bryndwr Community Network logo",
        "BBCN's official organisation mark.",
        "Logo: Burnside and Bryndwr Community Network.",
        "https://bbcn.org.nz/",
        "logo",
      ),
    ],
  }),
  make("demo-aurora-centre", {
    name: "Aurora Centre",
    organisation_name: "Burnside High School",
    type: "venue",
    suburb: "Burnside",
    address: "151 Greers Road, Christchurch",
    publicEmail: "aurora@burnside.school.nz",
    publicPhone: "03 358 8383",
    summary:
      "Burnside High School's community and cultural venue for performances, events and gatherings.",
    description:
      "Burnside High School owns and operates the Aurora Centre as a community and cultural hub. Its official page describes a venue for music, theatre, dance, other performing arts and community gatherings. Contact the Aurora Centre team for venue specifications, availability and an estimate tailored to your event.",
    categories: ["Venues and Facilities", "Arts, Heritage and Culture"],
    roomType: "Performance and community venue",
    suitableFor:
      "Music, theatre, dance, performing arts and community gatherings.",
    availability:
      "The school lists venue access after 4:30pm. Confirm event-specific access and availability with the venue team.",
    cost: "Contact the venue team for an estimate.",
    website: `${school}/about-the-aurora-centre/`,
    bookingUrl: `${school}/about-the-aurora-centre/`,
    sourceUrl: `${school}/about-the-aurora-centre/`,
    demoImages: [
      image(
        "demo/aurora-exterior.png",
        "Aurora Centre exterior and surrounding school grounds",
        "An aerial view of the Aurora Centre published on the school's venue page.",
        "Photograph published by Burnside High School.",
        `${school}/about-the-aurora-centre/`,
      ),
      schoolLogo,
    ],
  }),
  make("demo-cobham", {
    name: "Wairarapa Cobham Intermediate",
    type: "organisation",
    suburb: "Burnside",
    address: "294 Ilam Road, Christchurch 8053",
    publicEmail: "office@wci.school.nz",
    publicPhone: "03 351 6381",
    summary:
      "A local intermediate school offering learning, cultural and sporting opportunities for Years 7 and 8.",
    description:
      "Wairarapa Cobham Intermediate's official website describes specialised programmes for Year 7 and 8 learners, with academic, cultural and sporting opportunities. Its community information includes enrolment, term dates, learning, music and sport. Families should use the school's official site for current enrolment and school information.",
    categories: ["Schools and Early Childhood", "Education and Learning"],
    ageGroups: "Year 7 and Year 8 learners",
    website: "https://www.cobham.school.nz/",
    sourceUrl: "https://www.cobham.school.nz/",
    demoImages: [
      image(
        "demo/cobham-logo.png",
        "Wairarapa Cobham Intermediate logo",
        "The school's official logo.",
        "Logo: Wairarapa Cobham Intermediate.",
        "https://www.cobham.school.nz/",
        "logo",
      ),
    ],
  }),
  make("demo-specialist-music", {
    name: "Specialist Music Programme",
    organisation_name: "Burnside High School",
    type: "programme",
    suburb: "Burnside",
    address: "151 Greers Road, Christchurch",
    publicEmail: "admin@burnside.school.nz",
    publicPhone: "03 358 8383",
    summary:
      "Specialist musical education for talented young musicians, connecting school and university learning.",
    description:
      "The Specialist Music Programme is a collaboration between Burnside High School, Westburn Primary School and the University of Canterbury. The official school page describes weekly tuition and musical opportunities for young people aged 10–18 with high musical talent and potential. Check the official programme information for entry requirements and current arrangements.",
    categories: ["Arts, Heritage and Culture", "Education and Learning"],
    ageGroups: "Ages 10–18; programme entry requirements apply.",
    website: `${school}/specialist-music-programme/`,
    sourceUrl: `${school}/specialist-music-programme/`,
    demoImages: [schoolLogo],
  }),
  make("demo-rangatahi-breakfast", {
    ...stAidan,
    name: "Rangatahi Bryndwr Breakfast Club",
    type: "programme",
    summary:
      "A welcoming morning space for Bryndwr children and whānau to connect before school.",
    description:
      "The official Rangatahi Bryndwr Breakfast Club page describes a place for children and whānau to spend time together, with breakfast, lunch and hot drinks available. Its published sessions run on Monday and Tuesday mornings during term time. Contact St Aidan's for current arrangements; the source page does not state a price.",
    categories: [
      "Children, Youth and Families",
      "Community Groups and Special Interests",
    ],
    times:
      "Monday and Tuesday, 7:30–8:20am during term time, as published. Confirm current sessions.",
    ageGroups: "Children and whānau",
    website: `${aidans}/breakfast-club`,
    sourceUrl: `${aidans}/breakfast-club`,
    demoImages: [
      image(
        "demo/rangatahi-bryndwr.png",
        "Rangatahi Bryndwr Trust logo",
        "The trust logo published on the official Breakfast Club page.",
        "Logo: Rangatahi Bryndwr Trust, published by St Aidan's.",
        `${aidans}/breakfast-club`,
        "logo",
      ),
    ],
  }),
  make("demo-st-timothys", {
    ...stTimothy,
    name: "St Timothy's Church, Burnside",
    type: "organisation",
    summary:
      "An Anglican church on Kendal Avenue with worship, playgroup, seniors and migrant community programmes.",
    description:
      "St Timothy's is a multi-ethnic Anglican church in Burnside. Its official website introduces Sunday worship and community programmes including Tea and Tots, the Gold Card Club and Nexus. Use the church's public website or office for current service and programme information.",
    categories: [
      "Churches and Faith Communities",
      "Community Groups and Special Interests",
    ],
    website: church,
    sourceUrl: church,
    demoImages: [churchPhoto],
  }),
];
