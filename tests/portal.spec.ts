// UI contract tests with mocked transport. SQL security is tested separately
// against real PostgreSQL; these tests do not claim hosted Auth/Storage work.
import { test, expect, type Page, type Route } from "@playwright/test";
import { emptyListing } from "../src/domain";
import { Image } from "imagescript";
import AxeBuilder from "@axe-core/playwright";
async function openFilters(page: Page) {
  await expect(page.locator(".results-toolbar")).toBeVisible();
  const toggle = page.getByRole("button", { name: /^Filters/ });
  if (
    (await toggle.isVisible()) &&
    (await toggle.getAttribute("aria-expanded")) === "false"
  )
    await toggle.click();
}
const owner = "00000000-0000-4000-8000-000000000001",
  org = "00000000-0000-4000-8000-000000000011",
  id = "00000000-0000-4000-8000-000000000021";
const content = {
  ...emptyListing,
  name: "Community test programme",
  summary: "An approved introduction to the programme.",
  description: "A full description of this test community programme.",
  categories: ["Education and Learning"],
};
async function fixture(
  page: Page,
  {
    admin = false,
    publicOnly = false,
    gallery = false,
    items = [],
    publicRows,
    imageRows = [],
  }: {
    admin?: boolean;
    publicOnly?: boolean;
    gallery?: boolean;
    items?: any[];
    publicRows?: any[];
    imageRows?: any[];
  } = {},
) {
  const requests: { name: string; body: any }[] = [];
  const categoryRows = [
    {
      id: "category-1",
      name: "Education and Learning",
      active: true,
      parent_id: null as string | null,
    },
  ];
  const fixtureImage = await new Image(300, 200).fill(0x789366ff).encode();
  if (!publicOnly)
    await page.addInitScript(
      ({ owner }) => {
        const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })),
          payload = btoa(
            JSON.stringify({
              sub: owner,
              role: "authenticated",
              exp: Math.floor(Date.now() / 1000) + 3600,
            }),
          );
        localStorage.setItem(
          "sb-127-auth-token",
          JSON.stringify({
            access_token: `${header}.${payload}.fixture`,
            refresh_token: "local-fixture",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            expires_in: 3600,
            token_type: "bearer",
            user: {
              id: owner,
              aud: "authenticated",
              role: "authenticated",
              email: "private-owner@example.test",
              email_confirmed_at: "2026-10-27T00:00:00Z",
              app_metadata: { provider: "email" },
              user_metadata: {},
              created_at: "2026-10-27T00:00:00Z",
            },
          }),
        );
      },
      { owner },
    );
  await page.route("http://127.0.0.1:54321/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname;
    let data: any = [];
    let body: any = {};
    try {
      body = req.postDataJSON() || {};
    } catch {}
    if (path.endsWith("/auth/v1/token")) {
      const access_token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: owner, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 }))}.fixture`;
      data = {
        access_token,
        refresh_token: "fixture-refresh",
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: owner,
          email: "private-owner@example.test",
          aud: "authenticated",
          role: "authenticated",
          email_confirmed_at: "2026-10-27T00:00:00Z",
          app_metadata: { provider: "email" },
          user_metadata: {},
          created_at: "2026-10-27T00:00:00Z",
        },
      };
    } else if (path.includes("/rpc/")) {
      const name = path.split("/").pop()!;
      requests.push({ name, body });
      if (name === "is_admin") data = admin;
      else if (name === "directory_search")
        data = publicOnly
          ? publicRows || [
              {
                id,
                data: content,
                featured: false,
                verified: false,
                organisation_name: null,
              },
            ]
          : [];
      else if (name === "directory_images")
        data = gallery
          ? [
              {
                id: "image-1",
                listing_id: id,
                published: {
                  caption: "A room with space to connect",
                  alt: "A community hall",
                  primary: true,
                  position: 0,
                  remove: false,
                },
                proposed: null,
                status: "approved",
                note: null,
                thumbnail_path: "image/thumb.png",
                detail_path: "image/detail.png",
                large_path: "image/large.png",
              },
            ]
          : [];
      else if (name === "save_listing") {
        data = id;
        const next = {
          id,
          organisation_id: org,
          published: null,
          proposed: body.content,
          status: body.submit ? "pending_review" : "draft",
          review_note: null,
          featured: false,
          verified: false,
        };
        const existing = items.findIndex((i) => i.id === id);
        existing < 0 ? items.push(next) : items.splice(existing, 1, next);
      } else if (name === "manage_taxonomy") {
        const category = categoryRows.find((c) => c.id === body.record_id);
        if (category)
          Object.assign(category, {
            name: body.record_name,
            active: body.is_active,
            parent_id: body.parent_id,
          });
        else
          categoryRows.push({
            id: "category-2",
            name: body.record_name,
            active: body.is_active,
            parent_id: body.parent_id,
          });
        data = null;
      } else if (name === "review_listing") {
        const row = items.find((i) => i.id === body.listing_id);
        row.published = row.proposed;
        row.status = "published";
        data = null;
      } else data = null;
    } else if (path.includes("/organisations")) {
      const account = {
        id: org,
        owner_id: owner,
        name: "Our test organisation",
        contact_name: "Private contact",
        email: "private-owner@example.test",
        phone: "Private phone",
        suspended: false,
        deletion_requested_at: null,
      };
      data = req.headers()["accept"]?.includes("object") ? account : [account];
    } else if (path.includes("/categories"))
      data =
        url.searchParams.get("active") === "eq.true"
          ? categoryRows.filter((c) => c.active)
          : categoryRows;
    else if (path.includes("/locations"))
      data = [{ id: "location-1", name: "Burnside", active: true }];
    else if (path.includes("/listings")) data = items;
    else if (path.includes("/listing_images")) data = imageRows;
    else if (path.includes("/object/sign/") && req.method() === "POST")
      data = {
        signedURL:
          "/object/sign/directory-images/image/fixture.png?token=fixture",
      };
    else if (path.includes("/object/sign/")) {
      await route.fulfill({
        contentType: "image/png",
        body: Buffer.from(fixtureImage),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  return requests;
}
test("owner creates a draft then submits without private contact defaults", async ({
  page,
}) => {
  const requests = await fixture(page, {});
  await page.goto("http://127.0.0.1:5184/dashboard");
  await expect(
    page.getByRole("heading", { name: "Our test organisation" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create a listing", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "What would you like to list?" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /List an activity or programme/ })
    .click();
  await expect(
    page.getByRole("button", { name: "Save draft to add photos", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Listing name", { exact: true })
    .fill("Our local programme");
  await page
    .getByLabel("Short introduction")
    .fill("A welcoming programme in our neighbourhood.");
  await page
    .getByLabel("Full description")
    .fill("This programme is a friendly way to connect and learn together.");
  await page.getByLabel("Education and Learning", { exact: true }).check();
  await page.getByRole("button", { name: "Free", exact: true }).click();
  await expect(
    page.getByLabel("Cost or membership information", { exact: true }),
  ).toHaveValue("Free");
  await page.getByRole("button", { name: "Free", exact: true }).click();
  await expect(
    page.getByLabel("Cost or membership information", { exact: true }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Free", exact: true }).click();
  await page
    .getByRole("button", { name: "Save draft to add photos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Photos & images" }),
  ).toBeVisible();
  const imageInput = page.getByLabel("Image file", { exact: true });
  const submit = page.getByRole("button", {
    name: "Submit for review",
    exact: true,
  });
  expect(
    await imageInput.evaluate((element) => {
      const button = [...document.querySelectorAll("button")].find((b) =>
        b.textContent?.includes("Submit for review"),
      )!;
      return Boolean(
        element.compareDocumentPosition(button) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBe(true);
  expect(await page.locator("form form").count()).toBe(0);
  await expect(submit).toHaveAttribute("form");
  expect(
    requests.find((r) => r.name === "save_listing")?.body.content.cost,
  ).toBe("Free");
  expect(
    requests.find((r) => r.name === "save_listing")?.body.content.publicEmail,
  ).toBe("");
  let imageRequest: Route | undefined;
  await page.route(
    "http://127.0.0.1:54321/functions/v1/process-image",
    (route) => {
      imageRequest = route;
    },
  );
  await imageInput.setInputFiles({
    name: "example-photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(await new Image(300, 200).fill(0x789366ff).encode()),
  });
  await page
    .getByLabel("Image description (alt text)", { exact: true })
    .fill("A community test photo");
  await page
    .getByRole("button", { name: "Upload for review", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Finish uploading photos…", exact: true }),
  ).toBeDisabled();
  await expect.poll(() => Boolean(imageRequest)).toBe(true);
  expect(requests.some((r) => r.name === "save_listing" && r.body.submit)).toBe(
    false,
  );
  await imageRequest!.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ id: "processed-test-image" }),
  });
  await expect(
    page.getByText(/Image uploaded privately and sent for review/),
  ).toBeVisible();
  await expect(submit).toBeEnabled();
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(
    page.getByText("Your submission is being reviewed.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Listing name", { exact: true })).toBeDisabled();
  expect(
    requests.filter((r) => r.name === "save_listing").at(-1)?.body.submit,
  ).toBe(true);
});
test("free venues fit a maximum price without treating unknown prices as free", async ({
  page,
}) => {
  const row = (id: string, name: string, cost: string, price: number) => ({
    id,
    data: { ...content, type: "venue", name, cost, price },
    featured: false,
    verified: false,
    organisation_name: null,
  });
  await fixture(page, {
    publicOnly: true,
    publicRows: [
      row("free-room", "Free community room", "Free", 0),
      row("unknown-room", "Room with unknown cost", "", 0),
      row("paid-room", "Paid community room", "$25 per hour", 25),
    ],
  });
  await page.goto("http://127.0.0.1:5184/venues?price=0");
  await openFilters(page);
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Free community room" }),
  ).toBeVisible();
  await page.getByLabel("Maximum hourly price ($)").fill("25");
  await expect(page.locator(".listing-card")).toHaveCount(2);
  await page.getByLabel("Free only", { exact: true }).check();
  await expect(page.locator(".listing-card")).toHaveCount(1);
});
test("admin compares content and approves the reviewed proposal", async ({
  page,
}) => {
  const proposed = { ...content, name: "A new approved name" };
  const requests = await fixture(page, {
    admin: true,
    items: [
      {
        id,
        organisation_id: org,
        published: content,
        proposed,
        status: "pending_review",
        review_note: null,
        featured: false,
        verified: false,
      },
    ],
  });
  await page.goto("http://127.0.0.1:5184/admin");
  await page.getByRole("button", { name: "Review listing & images" }).click();
  await expect(page.getByText("CURRENT PUBLIC CONTENT")).toBeVisible();
  await expect(
    page.getByText("PROPOSED CONTENT", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Approve listing", exact: true })
    .click();
  await expect(page.getByText("Review saved.")).toBeVisible();
  expect(
    requests.find((r) => r.name === "review_listing")?.body.expected_content
      .name,
  ).toBe("A new approved name");
});
test("approved gallery opens and closes with keyboard focus restored", async ({
  page,
}) => {
  await fixture(page, { publicOnly: true, gallery: true });
  await page.goto(`http://127.0.0.1:5184/listing/${id}`);
  const opener = page.getByRole("button", {
    name: "Enlarge A community hall: A room with space to connect",
  });
  await opener.click();
  await expect(
    page.getByRole("dialog", { name: "Image gallery" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByRole("dialog")
        .locator("img")
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBe(300);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test("events are date ordered, include ongoing events, and combine age, place, free and date filters", async ({
  page,
}) => {
  // Fix time so the same event-boundary behavior is tested every day.
  await page.clock.setFixedTime(new Date("2028-02-28T23:30:00Z"));
  const row = (
    key: string,
    name: string,
    start: string,
    end: string,
    age: string[],
    suburb = "Burnside",
    featured = false,
  ) => ({
    id: key,
    data: {
      ...content,
      name,
      type: "event",
      eventStartDate: start,
      eventEndDate: end,
      suitableAges: age,
      suburb,
      cost: "Free",
    },
    featured,
    verified: false,
  });
  await fixture(page, {
    publicOnly: true,
    publicRows: [
      row(
        "late",
        "Later featured event",
        "2028-03-05",
        "",
        ["Adult"],
        "Burnside",
        true,
      ),
      row("past", "Past event", "2028-02-28", "", ["All"]),
      row(
        "today",
        "Today family event",
        "2028-02-29",
        "",
        ["Family"],
        "Bryndwr",
      ),
      row("ongoing", "Ongoing event", "2028-02-27", "2028-03-02", ["All"]),
      {
        id: "regular",
        data: {
          ...content,
          name: "Regular activity",
          type: "activity",
          suitableAges: ["All"],
        },
        featured: false,
        verified: false,
      },
    ],
  });
  await page.goto("http://127.0.0.1:5184/events");
  await openFilters(page);
  const period = page.getByLabel("Show events", { exact: true });
  await expect(period.locator("option")).toHaveText([
    "This Week",
    "This Month",
    "Next Month",
    "Custom",
  ]);
  await expect(period).toHaveValue("month");
  await expect(page.getByLabel("From date", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("To date", { exact: true })).toHaveCount(0);
  await expect(page.locator(".listing-card h3")).toHaveText([
    "Ongoing event",
    "Past event",
    "Today family event",
  ]);
  await period.selectOption("week");
  await expect(page.locator(".listing-card h3")).toHaveText([
    "Ongoing event",
    "Past event",
    "Today family event",
    "Later featured event",
  ]);
  await period.selectOption("next-month");
  await expect(page.locator(".listing-card h3")).toHaveText([
    "Ongoing event",
    "Later featured event",
  ]);
  await period.selectOption("custom");
  await page.getByLabel("From date", { exact: true }).fill("2028-02-29");
  await expect(
    page.getByRole("heading", { name: "Your community calendar." }),
  ).toBeVisible();
  await expect(page.locator(".listing-card h3")).toHaveText([
    "Ongoing event",
    "Today family event",
    "Later featured event",
  ]);
  await page
    .getByLabel("Suitable Ages", { exact: true })
    .selectOption("Family");
  await expect(page.locator(".listing-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Bryndwr", exact: true }).click();
  await page.getByLabel("Free only", { exact: true }).check();
  await expect(page.locator(".listing-card h3")).toHaveText([
    "Today family event",
  ]);
  await page.reload();
  await openFilters(page);
  await expect(page.getByLabel("Suitable Ages", { exact: true })).toHaveValue(
    "Family",
  );
  await expect(
    page.getByRole("button", { name: "Bryndwr", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(period).toHaveValue("month");
  await expect(page.getByLabel("From date", { exact: true })).toHaveCount(0);
  await period.selectOption("custom");
  await page.getByLabel("From date", { exact: true }).fill("2028-03-01");
  await page.getByLabel("To date", { exact: true }).fill("2028-03-02");
  await expect(page.locator(".listing-card h3")).toHaveText(["Ongoing event"]);
  await page.getByRole("link", { name: "Ongoing event", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "When it’s happening" }),
  ).toBeVisible();
  await expect(page.locator(".event-date-panel")).toContainText(
    "27 February 2028",
  );
  await page.goto("http://127.0.0.1:5184/events?period=past");
  await expect(page.getByLabel("Show events", { exact: true })).toHaveValue(
    "custom",
  );
  // A custom end bound includes an event overlapping that day, even if it continues later.
  await expect(page.locator(".listing-card h3")).toHaveText([
    "Ongoing event",
    "Past event",
  ]);
  await page.goto("http://127.0.0.1:5184/find?age=Senior");
  await expect(page.locator(".listing-card h3")).toHaveText([
    "Regular activity",
  ]);
});

test("owner adds an event with structured ages and a draft for photos", async ({
  page,
}) => {
  const requests = await fixture(page);
  await page.goto("http://127.0.0.1:5184/dashboard");
  await page
    .getByRole("button", { name: "Create a listing", exact: true })
    .click();
  await page.getByRole("link", { name: /List an event/ }).click();
  await expect(
    page.getByRole("checkbox", { name: "All", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Create an event listing" }),
  ).toBeVisible();
  await expect(page.getByLabel("Listing type")).toHaveCount(0);
  await expect(
    page.getByLabel("Education and Learning", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Event name", { exact: true })
    .fill("Our community event");
  await page
    .getByLabel("Short introduction")
    .fill("A special gathering for our local families.");
  await page
    .getByLabel("Full description")
    .fill("Join our community for an afternoon of music and activities.");
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Please check the highlighted fields",
  );
  await expect(page.locator(".field-error")).toContainText(
    "Choose the event start date",
  );
  expect(requests.some((r) => r.name === "save_listing")).toBe(false);
  await page.getByLabel("Event start date", { exact: true }).fill("2028-02-29");
  await page.getByLabel("Event end date (optional)").fill("2028-03-01");
  await page.getByLabel("Family", { exact: true }).check();
  await page.getByLabel("0-5", { exact: true }).check();
  await page
    .getByRole("button", { name: "Save draft to add photos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Photos & images" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(
    page.getByText("Awaiting review", { exact: true }),
  ).toBeVisible();
  const saves = requests.filter((r) => r.name === "save_listing");
  expect(saves.map((r) => r.body.submit)).toEqual([false, true]);
  expect(saves[1].body.content).toMatchObject({
    type: "event",
    categories: [],
    eventStartDate: "2028-02-29",
    eventEndDate: "2028-03-01",
    suitableAges: ["Family", "0-5"],
  });
});

test("admin can add and rename categories with immediate directory filter refresh", async ({
  page,
}) => {
  const requests = await fixture(page, { admin: true });
  await page.goto("http://127.0.0.1:5184/admin");
  await page
    .getByRole("button", { name: "Categories & locations", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Learning together");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByText(
      "Saved. Directory filters and existing listings are up to date.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill("Community celebrations");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator(".taxonomy-list")).toContainText(
    "Community celebrations",
  );
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible())
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Find It", exact: true })
    .click();
  await expect(
    page.getByLabel("Category", { exact: true }).locator("option"),
  ).toHaveText([
    "All categories",
    "Community celebrations",
    "Learning together",
  ]);
  expect(
    requests
      .filter((r) => r.name === "manage_taxonomy")
      .map((r) => r.body.record_name),
  ).toEqual(["Learning together", "Community celebrations"]);
});

test("home event carousel highlights approved upcoming events in date order with keyboard controls", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2028-02-28T23:30:00Z"));
  const publicRows = Array.from({ length: 7 }, (_, index) => ({
    id: `event-${index}`,
    featured: index === 6,
    verified: false,
    data: {
      ...content,
      name: `Upcoming gathering ${index + 1}`,
      type: "event",
      eventStartDate: `2028-03-${String(index + 1).padStart(2, "0")}`,
      eventEndDate: "",
    },
  })).reverse();
  publicRows.push({
    id: "past",
    featured: true,
    verified: false,
    data: {
      ...content,
      name: "Past gathering",
      type: "event",
      eventStartDate: "2028-02-28",
      eventEndDate: "",
    },
  });
  await fixture(page, { publicOnly: true, publicRows });
  await page.goto("http://127.0.0.1:5184/");
  const carousel = page.getByRole("region", {
    name: "Upcoming community events",
    exact: true,
  });
  await expect(carousel.locator("h3")).toHaveText(
    Array.from({ length: 6 }, (_, index) => `Upcoming gathering ${index + 1}`),
  );
  await expect(
    page.getByRole("heading", { name: "Past gathering", exact: true }),
  ).toHaveCount(0);
  const track = carousel.locator(".events-track");
  await expect(
    carousel.getByRole("button", { name: "Previous events" }),
  ).toBeDisabled();
  await carousel
    .getByRole("button", { name: "Next events", exact: true })
    .click();
  await expect
    .poll(() => track.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(100);
  await track.focus();
  const before = await track.evaluate((element) => element.scrollLeft);
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => track.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(before + 100);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const report = await new AxeBuilder({ page })
    .include(".upcoming-section")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    report.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await carousel
    .getByRole("link", { name: "Upcoming gathering 1", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Upcoming gathering 1", exact: true }),
  ).toBeVisible();
});

test("three-card chooser leads to a tailored hire form and prominent Free choice", async ({
  page,
}) => {
  const requests = await fixture(page);
  await page.goto("http://127.0.0.1:5184/dashboard/new");
  await expect(page.locator(".listing-choice")).toHaveCount(3);
  const chooserScan = await new AxeBuilder({ page })
    .include(".listing-chooser")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(chooserScan.violations.map((v) => v.id)).toEqual([]);
  await page
    .getByRole("link", { name: /List a facility or room for hire/ })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/new\/venue$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Create a facility or room listing" }),
  ).toBeVisible();
  await expect(page.locator(".listing-editor")).toHaveClass(
    /listing-theme-venue/,
  );
  await expect(page.getByLabel("Listing type")).toHaveCount(0);
  await expect(
    page.getByLabel("Education and Learning", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: "Suitable Ages", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Event start date", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Facility / room name", { exact: true })
    .fill("Our community hall");
  await page
    .getByLabel("Short introduction")
    .fill("A useful local room for meetings and celebrations.");
  await page
    .getByLabel("Full description")
    .fill(
      "Our hall offers flexible layouts and facilities for community gatherings.",
    );
  await page.getByLabel("Room / facility type").fill("Community hall");
  await page.getByLabel("Maximum capacity").fill("80");
  await page.getByLabel("Kitchen", { exact: true }).check();
  const free = page.getByRole("button", { name: "Free", exact: true });
  await expect(free).toHaveClass(/free-choice/);
  await free.click();
  await expect(free).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByLabel("Hire cost information", { exact: true }),
  ).toHaveValue("Free");
  await expect(
    page.getByLabel("Indicative hourly price", { exact: false }),
  ).toBeDisabled();
  const formScan = await new AxeBuilder({ page })
    .include(".listing-editor")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    formScan.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Save draft to add photos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Photos & images" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(
    page.getByText("Awaiting review", { exact: true }),
  ).toBeVisible();
  const saved = requests.filter((r) => r.name === "save_listing");
  expect(saved[1].body.content).toMatchObject({
    type: "venue",
    categories: [],
    suitableAges: [],
    capacity: 80,
    roomType: "Community hall",
    kitchen: true,
    cost: "Free",
    price: 0,
  });
});

test("Get Found selection survives sign-in and opens the plum event form", async ({
  page,
}) => {
  await fixture(page, { publicOnly: true });
  await page.goto("http://127.0.0.1:5184/get-found");
  await page.getByRole("link", { name: /List an event/ }).click();
  await expect(
    page.getByRole("heading", { name: "Organisation sign in" }),
  ).toBeVisible();
  await page
    .getByLabel("Email address", { exact: false })
    .fill("private-owner@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Test-password-2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/new\/event$/);
  await expect(
    page.getByRole("heading", { name: "Create an event listing" }),
  ).toBeVisible();
  await expect(page.locator(".listing-editor")).toHaveClass(
    /listing-theme-event/,
  );
  await expect(
    page.getByLabel("Education and Learning", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Ticket or booking link (optional)"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Free", exact: true }).click();
  const scan = await new AxeBuilder({ page })
    .include(".listing-editor")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    scan.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Choose another listing type", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Leave without saving", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/new$/);
  await expect(page.locator(".listing-choice")).toHaveCount(3);
});

test("incomplete drafts, focused field errors and private previews protect publication", async ({
  page,
}) => {
  const requests = await fixture(page);
  await page.goto("http://127.0.0.1:5184/dashboard/new/event");
  await page
    .getByLabel("Event name", { exact: true })
    .fill("An event in progress");
  await page
    .getByRole("button", { name: "Save draft to add photos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Photos & images" }),
  ).toBeVisible();
  expect(requests.find((r) => r.name === "save_listing")?.body).toMatchObject({
    submit: false,
    content: { summary: "", description: "", eventStartDate: "" },
  });
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(
    page.getByLabel("Short introduction", { exact: false }),
  ).toBeFocused();
  await expect(page.locator(".field-error")).toHaveCount(3);
  expect(requests.some((r) => r.name === "save_listing" && r.body.submit)).toBe(
    false,
  );
  await page
    .getByRole("button", { name: "Preview listing", exact: true })
    .click();
  const preview = page.getByRole("dialog", { name: "Private listing preview" });
  await expect(
    preview.getByRole("heading", { name: "An event in progress", exact: true }),
  ).toBeVisible();
  await expect(
    preview.getByRole("button", { name: "Submit for review", exact: true }),
  ).toBeDisabled();
  await expect(preview).not.toContainText("private-owner@example.test");
  await preview
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await page
    .getByLabel("Short introduction")
    .fill("A completed introduction for our event.");
  await page
    .getByLabel("Full description")
    .fill("A full public description explaining our community event.");
  await page.getByLabel("Event start date", { exact: true }).fill("2028-05-01");
  await page
    .getByRole("button", { name: "Preview listing", exact: true })
    .click();
  await preview
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(
    page.getByText("Awaiting review", { exact: true }),
  ).toBeVisible();
  expect(
    requests.filter((r) => r.name === "save_listing").map((r) => r.body.submit),
  ).toEqual([false, true]);
});

test("unsaved listing guard supports staying, private saving and leaving", async ({
  page,
}) => {
  const requests = await fixture(page);
  await page.goto("http://127.0.0.1:5184/dashboard/new/event");
  await page
    .getByLabel("Event name", { exact: true })
    .fill("Do not lose this event");
  await page
    .getByRole("button", { name: /Choose another listing type/ })
    .click();
  const guard = page.getByRole("dialog", {
    name: "Save your changes before leaving?",
  });
  await expect(guard).toBeVisible();
  await guard
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await expect(page.getByLabel("Event name", { exact: true })).toHaveValue(
    "Do not lose this event",
  );
  await page
    .getByRole("button", { name: /Choose another listing type/ })
    .click();
  await guard
    .getByRole("button", { name: "Save draft and leave", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/new$/);
  expect(requests.find((r) => r.name === "save_listing")?.body).toMatchObject({
    submit: false,
    content: { name: "Do not lose this event" },
  });
  await page
    .getByRole("link", { name: /List an activity or programme/ })
    .click();
  await page
    .getByLabel("Listing name", { exact: true })
    .fill("Unsaved activity");
  // Main navigation is protected by the router blocker too.
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible())
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Events", exact: true })
    .click();
  await guard
    .getByRole("button", { name: "Leave without saving", exact: true })
    .click();
  await expect(page).toHaveURL(/\/events$/);
  expect(requests.filter((r) => r.name === "save_listing")).toHaveLength(1);
  await page.goto("http://127.0.0.1:5184/dashboard/new");
  await page.getByRole("link", { name: /List an event/ }).click();
  await page
    .getByLabel("Event name", { exact: true })
    .fill("Browser back protection");
  await page.evaluate(() => history.back());
  await expect(guard).toBeVisible();
  await guard
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await expect(page.getByLabel("Event name", { exact: true })).toHaveValue(
    "Browser back protection",
  );
  await page.evaluate(() => history.back());
  await guard
    .getByRole("button", { name: "Leave without saving", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/new$/);
});

test("dashboard explains live text and pending photos, with a direct business profile entry", async ({
  page,
}) => {
  const item = {
    id,
    organisation_id: org,
    published: content,
    proposed: content,
    status: "published",
    review_note: null,
    featured: false,
    verified: false,
  };
  await fixture(page, {
    items: [item],
    imageRows: [
      { id: "pending-1", listing_id: id, status: "pending_review" },
      { id: "pending-2", listing_id: id, status: "pending_review" },
    ],
  });
  await page.goto("http://127.0.0.1:5184/dashboard");
  await expect(
    page.getByText("Listing live: visitors can find your approved content."),
  ).toBeVisible();
  await expect(
    page.getByText("2 photos awaiting approval.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create a listing", exact: true })
    .click();
  await page
    .getByRole("link", {
      name: "List an organisation or business",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/new\/profile$/);
  await expect(page.getByLabel("Listing type")).toHaveValue("organisation");
  await page.getByLabel("Listing type").selectOption("business");
  await expect(page.locator(".listing-editor")).toHaveClass(
    /listing-theme-activity/,
  );
});

test("admin review filters include pending photos and order by oldest outstanding work", async ({
  page,
}) => {
  const oldText = {
    id: "old-text",
    organisation_id: org,
    published: null,
    proposed: { ...content, name: "Text to review" },
    status: "pending_review",
    review_note: null,
    featured: false,
    verified: false,
    updated_at: "2028-04-02T00:00:00Z",
  };
  const photo = {
    id: "photo-work",
    organisation_id: org,
    published: content,
    proposed: { ...content, type: "venue", name: "Venue photos to review" },
    status: "published",
    review_note: null,
    featured: false,
    verified: false,
    updated_at: "2028-04-03T00:00:00Z",
  };
  await fixture(page, {
    admin: true,
    items: [oldText, photo],
    imageRows: [
      {
        id: "photo-1",
        listing_id: photo.id,
        status: "pending_review",
        created_at: "2028-04-01T00:00:00Z",
      },
    ],
  });
  await page.goto("http://127.0.0.1:5184/admin");
  await expect(page.locator(".managed-listings article h3")).toHaveText([
    "Venue photos to review",
    "Text to review",
  ]);
  await page.getByLabel("Filter review needed").selectOption("images");
  await expect(page.locator(".managed-listings article h3")).toHaveText([
    "Venue photos to review",
  ]);
  await page.getByLabel("Filter listing type").selectOption("programme");
  await expect(page.locator(".managed-listings article")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Clear review filters", exact: true })
    .click();
  await page.getByLabel("Filter review needed").selectOption("text");
  await expect(page.locator(".managed-listings article h3")).toHaveText([
    "Text to review",
  ]);
});

test("venue detail distinguishes unknown values and offers a supported enquiry action", async ({
  page,
}) => {
  await fixture(page, {
    publicOnly: true,
    publicRows: [
      {
        id,
        data: {
          ...content,
          type: "venue",
          name: "Unpriced venue",
          cost: "",
          price: 0,
          capacity: 0,
          publicEmail: "hall@example.test",
        },
        featured: false,
        verified: false,
      },
    ],
  });
  await page.goto(`http://127.0.0.1:5184/listing/${id}`);
  await expect(
    page.getByText("Capacity not supplied", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Enquire for pricing", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Enquire about this space", exact: false }),
  ).toHaveAttribute("href", "mailto:hall@example.test");
  await expect(
    page
      .locator(".breadcrumb")
      .getByRole("link", { name: "Venues for Hire", exact: true }),
  ).toHaveCount(1);
});

test("event and venue details, previews and unsaved dialogs retain feature colours", async ({
  page,
}) => {
  for (const [type, ink, soft] of [
    ["event", "rgb(81, 55, 79)", "rgb(246, 237, 243)"],
    ["venue", "rgb(98, 68, 46)", "rgb(248, 236, 221)"],
  ]) {
    await fixture(page, {
      publicOnly: true,
      gallery: true,
      publicRows: [
        {
          id,
          data: {
            ...content,
            type,
            eventStartDate: type === "event" ? "2028-03-01" : "",
            publicEmail: "contact@example.test",
            cost: "Free",
          },
          featured: false,
          verified: true,
        },
      ],
    });
    await page.goto(`http://127.0.0.1:5184/listing/${id}`);
    await expect(page.locator(".detail-layout h1")).toHaveCSS("color", ink);
    await expect(page.locator(".contact-panel")).toHaveCSS(
      "background-color",
      soft,
    );
    await expect(page.locator(".listing-primary-action")).toHaveCSS(
      "background-color",
      ink,
    );
    await expect(page.locator(".tags > *").first()).toHaveCSS(
      "background-color",
      soft,
    );
    await page
      .getByRole("button", {
        name: "Enlarge A community hall: A room with space to connect",
      })
      .click();
    const gallery = page.getByRole("dialog", { name: "Image gallery" });
    await expect(gallery).toHaveCSS(
      "background-color",
      type === "event" ? "rgb(41, 31, 44)" : "rgb(43, 33, 24)",
    );
    await expect(
      gallery.getByRole("button", { name: "Close gallery" }),
    ).toHaveCSS("background-color", ink);
    await page.keyboard.press("Escape");
  }
  await fixture(page);
  await page.goto("http://127.0.0.1:5184/dashboard/new/event");
  await page
    .getByLabel("Event name", { exact: true })
    .fill("A preview of our event");
  await page
    .getByRole("button", { name: "Preview listing", exact: true })
    .click();
  const preview = page.getByRole("dialog", { name: "Private listing preview" });
  await expect(preview.locator("h2")).toHaveCSS("color", "rgb(81, 55, 79)");
  await expect(preview.locator(".message").first()).toHaveCSS(
    "background-color",
    "rgb(246, 237, 243)",
  );
  await preview
    .getByRole("button", { name: "Continue editing", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Choose another listing type/ })
    .click();
  const guard = page.getByRole("dialog", {
    name: "Save your changes before leaving?",
  });
  await expect(guard.locator("h2")).toHaveCSS("color", "rgb(81, 55, 79)");
  await expect(
    guard.getByRole("button", { name: "Save draft and leave", exact: true }),
  ).toHaveCSS("background-color", "rgb(81, 55, 79)");
});
