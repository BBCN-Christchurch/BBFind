import { describe, it, expect } from "vitest";
import { listingSchema, matchesSearch, publicUrl } from "./domain";
import { demoListings } from "./demo";
describe("directory data and search", () => {
  it("validates complete sample listing shapes", () => {
    for (const l of demoListings)
      expect(listingSchema.safeParse(l).success).toBe(true);
  });
  it("matches multiple terms across fields and one-character typos", () => {
    expect(matchesSearch(demoListings[0], "garden bryndwr")).toBe(true);
    expect(matchesSearch(demoListings[0], "gardem")).toBe(true);
    expect(matchesSearch(demoListings[0], "garden harewood")).toBe(false);
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
});
