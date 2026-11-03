import { describe, it, expect } from "vitest";
import {
  isFreeListing,
  draftSchema,
  venuePriceLabel,
  listingAction,
  listingSchema,
  matchesSearch,
  publicUrl,
  matchesAge,
  validDate,
  localToday,
} from "./domain";
import { demoListings } from "./demo";
describe("directory data and search", () => {
  it("preserves legacy listings and requires real, ordered event dates", () => {
    const legacy = { ...demoListings[0] } as Record<string, unknown>;
    delete legacy.suitableAges;
    delete legacy.eventStartDate;
    delete legacy.eventEndDate;
    expect(listingSchema.parse(legacy).suitableAges).toEqual([]);
    const event = { ...legacy, type: "event", eventStartDate: "2028-02-29" };
    expect(listingSchema.safeParse(event).success).toBe(true);
    for (const date of [
      "",
      "2027-02-29",
      "2028-04-31",
      "2028-2-3",
      "not a date",
      "2101-01-01",
    ])
      expect(
        listingSchema.safeParse({ ...event, eventStartDate: date }).success,
      ).toBe(false);
    expect(
      listingSchema.safeParse({ ...event, eventEndDate: "2028-02-28" }).success,
    ).toBe(false);
    expect(
      listingSchema.safeParse({ ...event, suitableAges: ["unknown"] }).success,
    ).toBe(false);
    expect(validDate(localToday())).toBe(true);
  });
  it("saves incomplete private drafts while retaining strict submission validation", () => {
    const partial = {
      ...demoListings[0],
      type: "event",
      summary: "",
      description: "",
      categories: [],
      eventStartDate: "",
      eventEndDate: "",
    };
    expect(draftSchema.safeParse(partial).success).toBe(true);
    expect(listingSchema.safeParse(partial).success).toBe(false);
    expect(draftSchema.safeParse({ ...partial, name: "" }).success).toBe(false);
    expect(
      draftSchema.safeParse({ ...partial, website: "javascript:alert(1)" })
        .success,
    ).toBe(false);
  });
  it("distinguishes unknown venue prices and only offers actions with supplied contact routes", () => {
    const venue = {
      ...demoListings[0],
      type: "venue" as const,
      cost: "",
      price: 0,
      bookingUrl: "",
      website: "",
      publicPhone: "",
      publicEmail: "",
    };
    expect(venuePriceLabel(venue)).toBe("Enquire for pricing");
    expect(venuePriceLabel({ ...venue, cost: "Free" })).toBe("Free");
    expect(venuePriceLabel({ ...venue, price: 30 })).toContain("$30 per hour");
    expect(listingAction(venue)).toBeNull();
    expect(
      listingAction({ ...venue, publicEmail: "hall@example.test" }),
    ).toEqual({
      href: "mailto:hall@example.test",
      label: "Enquire about this space",
    });
    expect(
      listingAction({
        ...venue,
        type: "event",
        bookingUrl: "https://example.test/tickets",
      })?.label,
    ).toBe("Tickets / Register");
  });
  it("requires interest categories only for Find Me listings", () => {
    const base = { ...demoListings[0], categories: [] };
    expect(listingSchema.safeParse({ ...base, type: "activity" }).success).toBe(
      false,
    );
    expect(listingSchema.safeParse({ ...base, type: "venue" }).success).toBe(
      true,
    );
    expect(
      listingSchema.safeParse({
        ...base,
        type: "event",
        eventStartDate: "2028-03-01",
      }).success,
    ).toBe(true);
  });
  it("filters explicit ages and treats All as suitable for every age", () => {
    expect(matchesAge({ suitableAges: [] }, "Adult")).toBe(false);
    expect(matchesAge({ suitableAges: ["All"] }, "Senior")).toBe(true);
    expect(matchesAge({ suitableAges: ["Family", "0-5"] }, "Family")).toBe(
      true,
    );
    expect(matchesAge({ suitableAges: ["Adult"] }, "Senior")).toBe(false);
  });
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
