import { test, expect, type Page } from "@playwright/test";
async function openFilters(page: Page) {
  await expect(page.locator(".results-toolbar")).toBeVisible();
  const toggle = page.getByRole("button", { name: /^Filters/ });
  if (
    (await toggle.isVisible()) &&
    (await toggle.getAttribute("aria-expanded")) === "false"
  )
    await toggle.click();
}
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
  await openFilters(page);
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
test("free-only search combines with other filters and survives refresh", async ({
  page,
}) => {
  await page.goto("/find");
  await openFilters(page);
  await page.getByLabel("Free only", { exact: true }).check();
  await expect(page.locator(".listing-card")).toHaveCount(2);
  await expect(page.locator(".free-label")).toHaveCount(2);
  await page.getByLabel("Search the directory").fill("garden");
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.reload();
  await openFilters(page);
  await expect(page.getByLabel("Free only", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Search the directory")).toHaveValue("garden");
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page
    .getByLabel("Neighbourhood", { exact: true })
    .selectOption("Burnside");
  await expect(page.locator(".listing-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page.getByLabel("Free only", { exact: true })).not.toBeChecked();
  await expect(page.locator(".listing-card")).toHaveCount(6);
});
test("venue filters combine and clear", async ({ page }) => {
  await page.goto("/venues");
  await openFilters(page);
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
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("feature pages have clear identities and Get Found follows Venues", async ({
  page,
}) => {
  for (const [path, theme, label] of [
    ["/find", "intro-find", "Find It"],
    ["/events", "intro-events", "Events"],
    ["/venues", "intro-venues", "Venues for Hire"],
  ]) {
    await page.goto(path);
    await expect(page.locator(".feature-intro")).toHaveClass(new RegExp(theme));
    await expect(page.locator(".feature-label")).toHaveText(label);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible())
    await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation").locator("a")).toHaveText([
    "Home",
    "Find It",
    "Events",
    "Venues for Hire",
    "Get Found · Add a listing",
    "About",
  ]);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Coming up locally", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No upcoming events have been published yet.", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "View all events", exact: true })
    .click();
  await expect(page).toHaveURL(/\/events$/);
});

test("mobile filters collapse and result navigation preserves search and scroll", async ({
  page,
}, info) => {
  await page.goto("/");
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Find It", exact: true })
    .click();
  await expect(page.locator(".results-toolbar")).toBeVisible();
  if (info.project.name === "mobile") {
    await expect(
      page.getByRole("button", { name: /^Filters/ }),
    ).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".filters")).not.toBeVisible();
  }
  await page.getByLabel("Search the directory").fill("garden");
  await expect(
    page.getByRole("button", { name: "Remove search filter" }),
  ).toBeVisible();
  const link = page.getByRole("link", {
    name: "The neighbourhood garden",
    exact: true,
  });
  await link.scrollIntoViewIfNeeded();
  await link.evaluate((element) =>
    element.addEventListener(
      "click",
      () => sessionStorage.setItem("test-result-scroll", String(scrollY)),
      { once: true },
    ),
  );
  await link.click();
  const position = await page.evaluate(() =>
    Number(sessionStorage.getItem("test-result-scroll")),
  );
  await page
    .getByRole("link", { name: "Back to results", exact: false })
    .click();
  await expect(page).toHaveURL(/\/find\?q=garden$/);
  await expect(page.getByLabel("Search the directory")).toHaveValue("garden");
  await expect
    .poll(() => page.evaluate((saved) => Math.abs(scrollY - saved), position))
    .toBeLessThan(100);
  await page.goBack();
  await expect(
    page.getByRole("heading", {
      name: "The neighbourhood garden",
      exact: true,
    }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/find\?q=garden$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});

test("feature controls, selected filters and empty states use their page palette", async ({
  page,
}) => {
  for (const [path, ink, soft] of [
    ["/events", "rgb(81, 55, 79)", "rgb(246, 237, 243)"],
    ["/venues", "rgb(98, 68, 46)", "rgb(248, 236, 221)"],
    ["/find", "rgb(36, 75, 62)", "rgb(237, 242, 230)"],
  ]) {
    await page.goto(`${path}?suburb=Burnside&q=doesnotexist`);
    await openFilters(page);
    await expect(
      page.locator(".priority-neighbourhoods button.active"),
    ).toHaveCSS("background-color", ink);
    await expect(page.locator(".filter-chip").first()).toHaveCSS("color", ink);
    await expect(page.locator(".filter-chip").first()).toHaveCSS(
      "background-color",
      soft,
    );
    await expect(page.locator(".empty h3")).toHaveCSS("color", ink);
    await expect(page.getByLabel("Free only", { exact: true })).toHaveCSS(
      "accent-color",
      ink,
    );
    const action = page.locator(".empty .button");
    await expect(action).toHaveCSS("color", ink);
    await action.hover();
    await expect(action).toHaveCSS("background-color", soft);
  }
  await page.goto("/venues");
  await expect(page.locator(".listing-card h3")).toHaveCSS(
    "color",
    "rgb(98, 68, 46)",
  );
  await expect(page.locator(".listing-card h3 svg")).toHaveCSS(
    "color",
    "rgb(98, 68, 46)",
  );
});
