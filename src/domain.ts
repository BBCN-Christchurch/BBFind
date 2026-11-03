import { z } from "zod";
export const listingTypes = [
  "organisation",
  "programme",
  "activity",
  "service",
  "business",
  "venue",
  "event",
] as const;
export const suitableAges = [
  "0-5",
  "5-12",
  "13-20",
  "Adult",
  "Senior",
  "Family",
  "All",
] as const;
export const priorityNeighbourhoods = ["Burnside", "Bryndwr"];
export function validDate(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "1900-01-01" ||
    value > "2100-12-31"
  )
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}
export function localToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function formatEventDate(value: string) {
  return validDate(value)
    ? new Intl.DateTimeFormat("en-NZ", {
        timeZone: "Pacific/Auckland",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(`${value}T00:00:00Z`))
    : "Date to be confirmed";
}
export function matchesAge(
  listing: Pick<ListingData, "suitableAges">,
  age: string,
) {
  return (
    !age ||
    Boolean(
      listing.suitableAges?.includes(age as (typeof suitableAges)[number]) ||
      listing.suitableAges?.includes("All"),
    )
  );
}
const eventDate = z
  .string()
  .refine(
    (v) => !v || validDate(v),
    "Enter a valid date between 1900 and 2100.",
  )
  .default("");
export const suburbs = [
  "Burnside",
  "Bryndwr",
  "Harewood",
  "Bishopdale",
  "Papanui",
  "Fendalton",
  "Ilam",
  "Avonhead",
  "Casebrook",
  "Russley",
];
export const initialCategories = [
  "Arts, Heritage and Culture",
  "Churches and Faith Communities",
  "Community Groups and Special Interests",
  "Education and Learning",
  "Health and Wellbeing",
  "Health and Welfare Services",
  "Local Businesses and Services",
  "Recreation and Hobbies",
  "Sports and Exercise",
  "Children, Youth and Families",
  "Older People and Seniors",
  "Ethnic and Multicultural Communities",
  "Government and Community Support",
  "Schools and Early Childhood",
  "Venues and Facilities",
];
const safeUrl = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (v) => !v || Boolean(publicUrl(v)),
    "Use a full http:// or https:// address.",
  );
const listingFields = z.object({
  name: z.string().trim().min(3, "Enter at least 3 characters.").max(150),
  summary: z
    .string()
    .trim()
    .min(10, "Add a short introduction (at least 10 characters).")
    .max(220),
  description: z
    .string()
    .trim()
    .min(20, "Tell visitors a little more (at least 20 characters).")
    .max(10000),
  type: z.enum(listingTypes),
  categories: z.array(z.string().min(1).max(150)).max(10),
  suburb: z.string().trim().min(2).max(100),
  address: z.string().max(300),
  website: safeUrl,
  publicEmail: z.union([z.literal(""), z.string().email()]),
  publicPhone: z.string().max(80),
  publicContact: z.string().max(100),
  socialLinks: z
    .string()
    .max(2000)
    .refine(
      (v) => !v || v.split("\n").every((s) => /^https?:\/\//i.test(s.trim())),
      "Use one full web address per line.",
    ),
  times: z.string().max(1000),
  ageGroups: z.string().max(300),
  suitableAges: z.array(z.enum(suitableAges)).max(7).default([]),
  eventStartDate: eventDate,
  eventEndDate: eventDate,
  cost: z.string().max(300),
  accessibility: z.string().max(1000),
  capacity: z.number().int().min(0).max(100000),
  roomType: z.string().max(150),
  kitchen: z.boolean(),
  accessible: z.boolean(),
  outdoor: z.boolean(),
  wifi: z.boolean(),
  parking: z.boolean(),
  av: z.boolean(),
  toilets: z.boolean(),
  facilities: z.string().max(2000),
  suitableFor: z.string().max(1000),
  availability: z.string().max(1000),
  bookingUrl: safeUrl,
  price: z.number().min(0).max(100000),
  spaces: z.string().max(3000),
});
export const draftSchema = listingFields.extend({
  summary: z.string().trim().max(220),
  description: z.string().trim().max(10000),
});
export const listingSchema = listingFields.superRefine((data, ctx) => {
  if (!["event", "venue"].includes(data.type) && !data.categories.length)
    ctx.addIssue({
      code: "custom",
      path: ["categories"],
      message: "Choose a category.",
    });
  if (data.type === "event" && !data.eventStartDate)
    ctx.addIssue({
      code: "custom",
      path: ["eventStartDate"],
      message: "Choose the event start date.",
    });
  if (
    data.eventEndDate &&
    (!data.eventStartDate || data.eventEndDate < data.eventStartDate)
  )
    ctx.addIssue({
      code: "custom",
      path: ["eventEndDate"],
      message: "The end date must be on or after the start date.",
    });
});
export type ListingData = z.infer<typeof listingSchema>;
export function isFreeListing(
  listing: Pick<ListingData, "cost" | "type" | "price">,
) {
  return (
    listing.cost.trim().toLowerCase() === "free" &&
    (listing.type !== "venue" || listing.price === 0)
  );
}
export type DemoImage = {
  path: string;
  alt: string;
  caption: string;
  credit: string;
  sourceUrl: string;
  kind?: "logo" | "photo" | "artwork";
  dark?: boolean;
};
export function venuePriceLabel(
  item: Pick<ListingData, "type" | "cost" | "price">,
) {
  if (isFreeListing(item)) return "Free";
  if (item.cost.trim() && item.cost.trim().toLowerCase() !== "free")
    return item.cost;
  return item.price > 0
    ? `$${item.price.toLocaleString("en-NZ")} per hour (indicative)`
    : "Enquire for pricing";
}
export function listingAction(item: ListingData) {
  const booking = publicUrl(item.bookingUrl),
    website = publicUrl(item.website);
  const contact = item.publicEmail
    ? `mailto:${item.publicEmail}`
    : item.publicPhone
      ? `tel:${item.publicPhone.replace(/[^+\d]/g, "")}`
      : undefined;
  if (item.type === "event" && booking)
    return { href: booking, label: "Tickets / Register" };
  if (item.type === "venue" && (booking || contact))
    return { href: (booking || contact)!, label: "Enquire about this space" };
  if (item.type === "event" && contact)
    return { href: contact, label: "Contact the organiser" };
  if (contact || booking || website)
    return {
      href: (contact || booking || website)!,
      label:
        item.type === "venue"
          ? "Visit venue website"
          : item.type === "event"
            ? "Event information"
            : "Contact / Join",
    };
  return null;
}
export type Listing = ListingData & {
  id: string;
  organisation_id?: string;
  featured?: boolean;
  verified?: boolean;
  illustration?: string;
  organisation_name?: string;
  demoImages?: DemoImage[];
  sourceUrl?: string;
  sourceChecked?: string;
  sourceNote?: string;
};
export type ImageRecord = {
  id: string;
  listing_id: string;
  published: ImageMeta | null;
  proposed: ImageMeta | null;
  status: string;
  note: string | null;
  replaces_id?: string | null;
  thumbnail_path: string;
  detail_path: string;
  large_path: string;
};
export type ImageMeta = {
  caption: string;
  alt: string;
  position: number;
  primary: boolean;
  remove: boolean;
};
export type ManagedListing = {
  id: string;
  organisation_id: string;
  published: ListingData | null;
  proposed: ListingData;
  status: string;
  review_note: string | null;
  featured: boolean;
  verified: boolean;
  updated_at?: string;
};
export const emptyListing: ListingData = {
  name: "",
  summary: "",
  description: "",
  type: "organisation",
  categories: [],
  suburb: "Burnside",
  address: "",
  website: "",
  publicEmail: "",
  publicPhone: "",
  publicContact: "",
  socialLinks: "",
  times: "",
  ageGroups: "",
  suitableAges: [],
  eventStartDate: "",
  eventEndDate: "",
  cost: "",
  accessibility: "",
  capacity: 0,
  roomType: "",
  kitchen: false,
  accessible: false,
  outdoor: false,
  wifi: false,
  parking: false,
  av: false,
  toilets: false,
  facilities: "",
  suitableFor: "",
  availability: "",
  bookingUrl: "",
  price: 0,
  spaces: "",
};
export function matchesSearch(item: Listing, query: string): boolean {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const haystack = [
    item.name,
    item.organisation_name,
    item.summary,
    item.description,
    item.suburb,
    item.type,
    ...item.categories,
    item.suitableFor,
    item.facilities,
  ]
    .join(" ")
    .toLowerCase();
  return terms.every(
    (term) =>
      haystack.includes(term) ||
      haystack
        .split(/\W+/)
        .some((word) => term.length > 3 && distance(word, term) <= 1),
  );
}
function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    previous = next;
  }
  return previous[b.length];
}
export function friendlyStatus(s: string) {
  return (
    (
      {
        draft: "Draft",
        pending_review: "Awaiting review",
        changes_requested: "Changes requested",
        rejected: "Not approved",
        published: "Published",
        approved: "Approved",
        archived: "Archived",
        suspended: "Suspended",
      } as Record<string, string>
    )[s] || s
  );
}
export function publicUrl(url: string) {
  try {
    const u = new URL(url);
    return ["https:", "http:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
}
