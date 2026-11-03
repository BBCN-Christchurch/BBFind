import { describe, expect, it } from "vitest";
import { demoEvents } from "./demo-events";
import { eventDateRange, listingAction } from "./domain";

describe("fictional demo calendar", () => {
  it("provides fifteen dated examples across four months without suggesting real attendance or booking", () => {
    expect(demoEvents).toHaveLength(15);
    expect(
      new Set(demoEvents.map((item) => item.eventStartDate.slice(0, 7))).size,
    ).toBe(4);
    expect(demoEvents.map((item) => item.eventStartDate)).toEqual(
      demoEvents.map((item) => item.eventStartDate).sort(),
    );
    for (const item of demoEvents) {
      expect(item.type).toBe("event");
      expect(item.example).toBe(true);
      expect(item.name).toMatch(/^Example:/);
      expect(item.description).toContain("fictional");
      expect(item.sourceUrl).toBeUndefined();
      expect(listingAction(item)).toBeNull();
    }
    expect(demoEvents[0].eventStartDate).toBe("2026-11-07");
    expect(demoEvents.at(-1)?.eventStartDate).toBe("2027-02-27");
  });
  it("populates this week, this month and next month as of the demo release", () => {
    for (const [period, count] of [
      ["week", 1],
      ["month", 4],
      ["next-month", 3],
    ] as const) {
      const range = eventDateRange(period, "2026-11-04");
      expect(
        demoEvents.filter(
          (item) =>
            (item.eventEndDate || item.eventStartDate) >= range.from &&
            item.eventStartDate <= range.to,
        ),
      ).toHaveLength(count);
    }
  });
});
