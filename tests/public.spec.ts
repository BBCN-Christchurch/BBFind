import { demoListings } from "../src/demo";
import { isFreeListing, matchesSearch } from "../src/domain";
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
test("age filters offer Any age and individual groups without All, including old links", async ({
  page,
}) => {
  for (const path of ["/find", "/events"]) {
    await page.goto(`${path}?age=All`);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await openFilters(page);
    const ages = page.getByRole("combobox", {
      name: "Suitable Ages",
      exact: true,
    });
    await expect(ages.locator("option")).toHaveText([
      "Any age",
      "0-5",
      "5-12",
      "13-20",
      "Adult",
      "Senior",
      "Family",
    ]);
    await expect(ages).toHaveValue("");
  }
});
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
  await openFilters(page);
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("Arts, Heritage and Culture");
  await expect(page.locator(".listing-card")).toHaveCount(
    demoListings.filter((item) =>
      item.categories.includes("Arts, Heritage and Culture"),
    ).length,
  );
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
  await openFilters(page);
  await page.getByLabel("Free only", { exact: true }).check();
  await expect(page.locator(".listing-card")).toHaveCount(
    demoListings.filter((item) => item.type !== "event" && isFreeListing(item))
      .length,
  );
  await expect(page.locator(".free-label")).toHaveCount(
    demoListings.filter((item) => item.type !== "event" && isFreeListing(item))
      .length,
  );
  await page.getByLabel("Search the directory").fill("nexus english");
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.reload();
  await openFilters(page);
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
  await expect(page.locator(".listing-card")).toHaveCount(
    demoListings.filter((item) => item.type !== "event").length,
  );
});
test("venue filters combine and clear", async ({ page }) => {
  await page.goto("/venues");
  await openFilters(page);
  await expect(page.locator(".listing-card")).toHaveCount(
    demoListings.filter((item) => item.type === "venue").length,
  );
  await page.getByLabel("People to accommodate").fill("150");
  await expect(page.locator(".listing-card")).toHaveCount(0);
  await page.getByLabel("People to accommodate").fill("30");
  await page.getByLabel("Kitchen facilities", { exact: true }).check();
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.getByLabel("Maximum hourly price").fill("10");
  await expect(page.locator(".listing-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page.locator(".listing-card")).toHaveCount(
    demoListings.filter((item) => item.type === "venue").length,
  );
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
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});
test("requested community samples are searchable and Kendal Medical is a business", async ({
  page,
}) => {
  for (const [query, name] of [
    ["Elim", "Elim Church — Burnside"],
    ["Burnside Park Tennis", "Burnside Park Tennis Club"],
    ["Plunket", "Whānau Āwhina Plunket — Fendalton Clinic"],
    ["Kendal Medical", "Kendal Medical Centre"],
  ]) {
    await page.goto(`/find?q=${encodeURIComponent(query)}`);
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".listing-card")).toHaveCount(
      demoListings.filter((item) => matchesSearch(item, query)).length,
    );
  }
  await page.goto("/find?category=Local%20Businesses%20and%20Services");
  await expect(page.locator(".listing-card")).toHaveCount(
    demoListings.filter((item) =>
      item.categories.includes("Local Businesses and Services"),
    ).length,
  );
  await expect(
    page
      .locator(".listing-card")
      .filter({
        has: page.getByRole("heading", {
          name: "Kendal Medical Centre",
          exact: true,
        }),
      })
      .locator(".card-type"),
  ).toHaveText("business");
  await page
    .getByRole("link", { name: "Kendal Medical Centre", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "View the official information" }),
  ).toHaveAttribute("href", "https://www.kendalmedical.co.nz/");
});

test("feature pages have clear identities and Get Found follows Venues", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-03T23:00:00Z"));
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
    page.getByRole("region", { name: "Upcoming community events" }),
  ).toBeVisible();
  await expect(page.locator(".events-track .listing-card")).toHaveCount(6);
  await page
    .getByRole("link", { name: "View all events", exact: true })
    .click();
  await expect(page).toHaveURL(
    /\/events\?period=custom&from=\d{4}-\d{2}-\d{2}$/,
  );
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
  await page.getByLabel("Search the directory").fill("nexus");
  await expect(
    page.getByRole("button", { name: "Remove search filter" }),
  ).toBeVisible();
  const link = page.getByRole("link", {
    name: "Nexus Free English Classes",
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
  await expect(page).toHaveURL(/\/find\?q=nexus$/);
  await expect(page.getByLabel("Search the directory")).toHaveValue("nexus");
  await expect
    .poll(() => page.evaluate((saved) => Math.abs(scrollY - saved), position))
    .toBeLessThan(100);
  await page.goBack();
  await expect(
    page.getByRole("heading", {
      name: "Nexus Free English Classes",
      exact: true,
    }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/find\?q=nexus$/);
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
  await expect(page.locator(".listing-card h3").first()).toHaveCSS(
    "color",
    "rgb(98, 68, 46)",
  );
  await expect(page.locator(".listing-card h3 svg").first()).toHaveCSS(
    "color",
    "rgb(98, 68, 46)",
  );
});

test("printed directory records expose dated provenance, corrections and explicit gaps", async ({
  page,
}) => {
  await page.goto("/find?q=Parent%20Help");
  await page
    .getByRole("link", {
      name: "Parent Help — Parenting Helpline",
      exact: true,
    })
    .click();
  await expect(page.getByRole("link", { name: /0800 568 856/ })).toBeVisible();
  await expect(page.locator(".demo-source")).toContainText("page 3");
  await expect(page.locator(".demo-source")).toContainText("July 2025");
  await expect(page.locator(".demo-source")).toContainText(
    "PDF repeats the PlunketLine number",
  );
  await page.goto("/listing/directory-jellie-park-recreation-and-sport-centre");
  await expect(page.locator(".preserve")).toContainText(
    "closed for scheduled maintenance until 2027",
  );
  await page.goto("/listing/directory-burnside-garden-club");
  await expect(page.locator(".demo-source")).toContainText(
    "could not be verified",
  );
  await expect(
    page.getByRole("link", { name: "View the official information" }),
  ).toHaveCount(0);
  await page.goto("/listing/directory-creative-capers-messy-playgroup");
  await expect(page.locator(".gallery-grid")).toContainText(
    "public Facebook page",
  );
});

test("imported brands decode locally and wider-area and age filters find the right entries", async ({
  page,
}) => {
  await page.goto("/find");
  await expect(page.locator(".listing-card")).toHaveCount(120);
  const failures = await page
    .locator(".listing-card img")
    .evaluateAll(async (images) => {
      const sources = [
        ...new Set(images.map((element) => (element as HTMLImageElement).src)),
      ];
      return (
        await Promise.all(
          sources.map(async (src) => {
            const image = new Image();
            image.src = src;
            try {
              await image.decode();
              return "";
            } catch {
              return src;
            }
          }),
        )
      ).filter(Boolean);
    });
  expect(failures).toEqual([]);
  await openFilters(page);
  await page
    .getByLabel("Neighbourhood", { exact: true })
    .selectOption("Merivale");
  await expect(
    page.getByRole("heading", { name: "Nor'West Brass", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.goto("/find?q=BestStart%20Roydvale&age=0-5");
  await expect(
    page.getByRole("heading", { name: "BestStart Roydvale", exact: true }),
  ).toBeVisible();
});

test("fifteen fictional events populate calendar presets and expose custom dates only when selected", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-03T23:00:00Z"));
  await page.goto("/events");
  await openFilters(page);
  const period = page.getByLabel("Show events", { exact: true });
  await expect(period).toHaveValue("month");
  await expect(page.locator(".listing-card")).toHaveCount(4);
  await expect(page.getByLabel("From date", { exact: true })).toHaveCount(0);
  await period.selectOption("week");
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await period.selectOption("next-month");
  await expect(page.locator(".listing-card")).toHaveCount(3);
  await period.selectOption("custom");
  await expect(page.locator(".listing-card")).toHaveCount(15);
  await expect(page.getByLabel("From date", { exact: true })).toBeVisible();
  await expect(page.getByLabel("To date", { exact: true })).toBeVisible();
  await page.getByLabel("From date", { exact: true }).fill("2027-01-01");
  await page.getByLabel("To date", { exact: true }).fill("2027-02-28");
  await expect(page.locator(".listing-card")).toHaveCount(8);
  await page.reload();
  await openFilters(page);
  await expect(period).toHaveValue("custom");
  await expect(page.getByLabel("From date", { exact: true })).toHaveValue(
    "2027-01-01",
  );
  await page
    .getByRole("link", { name: "Example: New Year Outdoor Games", exact: true })
    .click();
  await expect(page.locator(".demo-source")).toContainText(
    "About this example event",
  );
  await expect(page.locator(".demo-source")).toContainText("not a real event");
  await expect(
    page.getByRole("link", { name: "Tickets / Register", exact: true }),
  ).toHaveCount(0);
});
