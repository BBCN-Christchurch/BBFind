import { test, expect } from "@playwright/test";
test("home connects search to matching listings", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Your people. Your place. Your community.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Demonstration directory", { exact: false }),
  ).toBeVisible();
  await page.getByRole("searchbox").count();
  await page
    .getByLabel("Search organisations, activities or services")
    .fill("garden");
  await page.getByRole("button", { name: "Find it", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The neighbourhood garden" }),
  ).toBeVisible();
  await expect(page.locator(".listing-card")).toHaveCount(1);
});
test("category filters and listing detail work", async ({ page }) => {
  await page.goto("/find");
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("Arts, Heritage and Culture");
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Make a little something" }).click();
  await expect(
    page.getByRole("heading", { name: "Make a little something", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("This is a fictional example.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A little about us" }),
  ).toBeVisible();
});
test("venue filters combine and clear", async ({ page }) => {
  await page.goto("/venues");
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.getByLabel("People to accommodate").fill("150");
  await expect(page.locator(".listing-card")).toHaveCount(0);
  await page.getByLabel("People to accommodate").fill("50");
  await page.getByLabel("Kitchen facilities", { exact: true }).check();
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.getByLabel("Maximum hourly price").fill("10");
  await expect(page.locator(".listing-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page.locator(".listing-card")).toHaveCount(1);
});
test("search handles a typo and a no-result query", async ({ page }) => {
  await page.goto("/find?q=gardem");
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.getByLabel("Search the directory").fill("nonexistentxyz");
  await expect(page.locator(".listing-card")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "A little room for discovery." }),
  ).toBeVisible();
});
test("demo never pretends to accept registration", async ({ page }) => {
  await page.goto("/account?mode=register");
  await expect(
    page.getByText("Live accounts are not connected in this demonstration."),
  ).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "BBCN administration" }),
  ).toBeVisible();
});
test("navigation, mobile layout and missing pages", async ({ page }, info) => {
  await page.goto("/");
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("navigation")).toBeVisible();
  }
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "About", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A little closer to your community." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.goto("/missing-page");
  await expect(
    page.getByRole("heading", { name: "That page has wandered off." }),
  ).toBeVisible();
});
test("keyboard skip link reaches main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});
