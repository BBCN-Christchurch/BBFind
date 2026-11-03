import records from "./directory-data.json" with { type: "json" };
import {
  emptyListing,
  listingSchema,
  type DemoImage,
  type Listing,
} from "./domain";

// Editorial import of the supplied July 2025 directory. This is demo-only data,
// never organisation submissions, verified accounts or hosted database records.
export const directoryListings: Listing[] = records.map((record) => ({
  ...record,
  ...listingSchema.parse({ ...emptyListing, ...record }),
  demoImages: record.demoImages?.map((image) => ({
    ...image,
    kind: image.kind as DemoImage["kind"],
  })),
}));
