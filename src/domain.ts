import { z } from "zod";
export const listingTypes = [
  "organisation",
  "programme",
  "activity",
  "service",
  "business",
  "venue",
] as const;
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
  .max(1000)
  .refine(
    (v) => !v || /^https?:\/\//i.test(v),
    "Use a full http:// or https:// address.",
  );
export const listingSchema = z.object({
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
  categories: z
    .array(z.string().min(1).max(150))
    .min(1, "Choose a category.")
    .max(10),
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
export type ListingData = z.infer<typeof listingSchema>;
export type Listing = ListingData & {
  id: string;
  organisation_id?: string;
  featured?: boolean;
  verified?: boolean;
  illustration?: string;
  organisation_name?: string;
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
