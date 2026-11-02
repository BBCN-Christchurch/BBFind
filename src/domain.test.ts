import { describe, it, expect } from "vitest";
import {
  isFreeListing,
  listingSchema,
  matchesSearch,
  publicUrl,
} from "./domain";
import { demoListings } from "./demo";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
describe("directory data and search", () => {
  it("validates complete sample listing shapes", () => {
    for (const l of demoListings)
      expect(listingSchema.safeParse(l).success).toBe(true);
  });
  it("keeps community samples sourced and their credited images available locally", () => {
    for (const listing of demoListings) {
      expect(new URL(listing.sourceUrl!).protocol).toBe("https:");
      expect(listing.verified).not.toBe(true);
      expect(listing.demoImages?.length).toBeGreaterThan(0);
      for (const image of listing.demoImages || []) {
        expect(image.path).not.toContain("..");
        expect(existsSync(resolve(process.cwd(), "public", image.path))).toBe(
          true,
        );
        expect(image.alt.length).toBeGreaterThan(0);
        expect(image.credit.length).toBeGreaterThan(0);
        expect(new URL(image.sourceUrl).protocol).toBe("https:");
      }
    }
  });
  it("matches multiple terms across fields and one-character typos", () => {
    expect(matchesSearch(demoListings[0], "tots burnside")).toBe(true);
    expect(matchesSearch(demoListings[0], "tota")).toBe(true);
    expect(matchesSearch(demoListings[0], "tots harewood")).toBe(false);
  });
  it("rejects unsafe website links and incomplete forms", () => {
    expect(
      listingSchema.safeParse({
        ...demoListings[0],
        website: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      listingSchema.safeParse({ ...demoListings[0], categories: [] }).success,
    ).toBe(false);
  });
  it("only renders HTTP or HTTPS links", () => {
    expect(publicUrl("javascript:alert(1)")).toBeUndefined();
    expect(publicUrl("https://bbcn.org.nz/")).toBe("https://bbcn.org.nz/");
  });
  it("only classifies explicit free costs, never unknown fees or free trials", () => {
    const listing = demoListings[0];
    expect(isFreeListing({ ...listing, cost: " Free " })).toBe(true);
    for (const cost of [
      "",
      "Free trial then $10",
      "Free for members",
      "Donation required",
    ])
      expect(isFreeListing({ ...listing, cost })).toBe(false);
    expect(
      isFreeListing({ ...listing, type: "venue", cost: "Free", price: 25 }),
    ).toBe(false);
    expect(
      isFreeListing({ ...listing, type: "venue", cost: "Free", price: 0 }),
    ).toBe(true);
    expect(
      isFreeListing({ ...listing, type: "venue", cost: "", price: 0 }),
    ).toBe(false);
  });
});
