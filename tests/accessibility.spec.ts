import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("public pages have no automated WCAG A/AA violations", async ({
  page,
}) => {
  for (const path of ["/", "/find", "/venues", "/get-found"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      report.violations.map((v) => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.map((n) => n.target),
      })),
      `Accessibility violations at ${path}`,
    ).toEqual([]);
  }
});
