import { describe, expect, it } from "vitest";
import records from "./directory-data.json";
import { directoryListings } from "./directory";
import { demoListings } from "./demo";
import { initialCategories, isFreeListing } from "./domain";

describe("printed directory import", () => {
  it("retains existing samples and gives each imported record a unique identity and PDF provenance", () => {
    expect(directoryListings).toHaveLength(103);
    expect(demoListings).toHaveLength(120);
    expect(new Set(demoListings.map((item) => item.id)).size).toBe(120);
    expect(
      new Set(demoListings.map((item) => item.name.toLowerCase())).size,
    ).toBe(120);
    for (const record of records) {
      expect(record.directoryPage).toBeGreaterThanOrEqual(2);
      expect(record.directoryPage).toBeLessThanOrEqual(14);
      expect(record.sourceNote).toContain(`page ${record.directoryPage}.`);
      expect(record.sourceNote).toContain("July 2025");
      expect(
        record.categories.every((category) =>
          initialCategories.includes(category),
        ),
      ).toBe(true);
    }
    for (const name of [
      "Tea and Tots",
      "Kendal Medical Centre",
      "Burnside Park Tennis Club",
      "Aurora Centre",
    ])
      expect(demoListings.filter((item) => item.name === name)).toHaveLength(1);
  });
  it("does not turn unknown venue rates, trial offers or old recurring schedules into free listings or events", () => {
    for (const item of directoryListings.filter(
      (item) => item.type === "venue",
    )) {
      expect(item.capacity).toBe(0);
      expect(isFreeListing(item)).toBe(false);
    }
    expect(directoryListings.some((item) => item.type === "event")).toBe(false);
    for (const phrase of [
      "Gordon Scout",
      "Delta Rhythmic",
      "Fendalton Park Croquet",
    ])
      expect(
        isFreeListing(
          directoryListings.find((item) => item.name.includes(phrase))!,
        ),
      ).toBe(false);
  });
  it("uses corrected official contacts and explains unavailable or superseded information", () => {
    const find = (text: string) =>
      directoryListings.find((item) => item.name.includes(text))!;
    expect(find("Parent Help").publicPhone).toBe("0800 568 856");
    expect(find("Suicide Crisis").publicPhone).toBe("0508 828 865");
    expect(find("Rabbit Patch").publicPhone).toBe("03 358 2549");
    expect(find("Jellie Park").description).toContain("until 2027");
    expect(find("Chinese Lifeline").publicPhone).toBe("");
    expect(find("Burnside Garden Club").website).toBe("");
    expect(find("BestStart Roydvale").address).toContain("139–141");
    expect(find("Creative Capers").demoImages?.[0].kind).toBe("artwork");
  });
});
