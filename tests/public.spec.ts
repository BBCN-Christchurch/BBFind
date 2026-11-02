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
    .fill("nexus english");
  await page.getByRole("button", { name: "Find it", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nexus Free English Classes" }),
  ).toBeVisible();
  await expect(page.locator(".listing-card")).toHaveCount(1);
});
test("category filters and listing detail work", async ({ page }) => {
  await page.goto("/find");
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("Arts, Heritage and Culture");
  await expect(page.locator(".listing-card")).toHaveCount(2);
  await page
    .getByRole("link", { name: "Specialist Music Programme", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Specialist Music Programme",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("About this sample listing", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A little about us" }),
  ).toBeVisible();
});
test("free-only search combines with other filters and survives refresh", async ({
  page,
}) => {
  await page.goto("/find");
  await page.getByLabel("Free only", { exact: true }).check();
  await expect(page.locator(".listing-card")).toHaveCount(2);
  await expect(page.locator(".free-label")).toHaveCount(2);
  await page.getByLabel("Search the directory").fill("nexus english");
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.reload();
  await expect(page.getByLabel("Free only", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Search the directory")).toHaveValue(
    "nexus english",
  );
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page
    .getByLabel("Neighbourhood", { exact: true })
    .selectOption("Bryndwr");
  await expect(page.locator(".listing-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page.getByLabel("Free only", { exact: true })).not.toBeChecked();
  await expect(page.locator(".listing-card")).toHaveCount(13);
});
test("venue filters combine and clear", async ({ page }) => {
  await page.goto("/venues");
  await expect(page.locator(".listing-card")).toHaveCount(3);
  await page.getByLabel("People to accommodate").fill("150");
  await expect(page.locator(".listing-card")).toHaveCount(0);
  await page.getByLabel("People to accommodate").fill("30");
  await page.getByLabel("Kitchen facilities", { exact: true }).check();
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.getByLabel("Maximum hourly price").fill("10");
  await expect(page.locator(".listing-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page.locator(".listing-card")).toHaveCount(3);
});
test("search handles a typo and a no-result query", async ({ page }) => {
  await page.goto("/find?q=nexuz english");
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.getByLabel("Search the directory").fill("nonexistentxyz");
  await expect(page.locator(".listing-card")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "A little room for discovery." }),
  ).toBeVisible();
});
test("real demo venue photos load locally with source credits and a keyboard gallery", async ({
  page,
}) => {
  await page.goto("/listing/demo-aurora-centre");
  const opener = page.getByRole("button", {
    name: /^Enlarge Aurora Centre exterior/,
  });
  await expect(opener.locator("img")).toHaveAttribute(
    "src",
    "/demo/aurora-exterior.png",
  );
  await expect
    .poll(() =>
      opener
        .locator("img")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await expect(
    page.getByRole("link", { name: "View the official information" }),
  ).toHaveAttribute(
    "href",
    "https://www.burnside.school.nz/about-the-aurora-centre/",
  );
  await expect(
    page.getByRole("link", { name: "Image source", exact: true }),
  ).toHaveCount(2);
  await opener.click();
  await expect(
    page.getByRole("dialog", { name: "Image gallery" }),
  ).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog").getByText("2 of 2")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(opener).toBeFocused();
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
