// UI contract tests with mocked transport. SQL security is tested separately
// against real PostgreSQL; these tests do not claim hosted Auth/Storage work.
import { test, expect, type Page } from "@playwright/test";
import { emptyListing } from "../src/domain";
import { Image } from "imagescript";
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
  }: {
    admin?: boolean;
    publicOnly?: boolean;
    gallery?: boolean;
    items?: any[];
  } = {},
) {
  const requests: { name: string; body: any }[] = [];
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
    if (path.includes("/rpc/")) {
      const name = path.split("/").pop()!;
      requests.push({ name, body });
      if (name === "is_admin") data = admin;
      else if (name === "directory_search")
        data = publicOnly
          ? [
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
      data = [
        { id: "category-1", name: "Education and Learning", active: true },
      ];
    else if (path.includes("/locations"))
      data = [{ id: "location-1", name: "Burnside", active: true }];
    else if (path.includes("/listings")) data = items;
    else if (path.includes("/listing_images")) data = [];
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
  await page.goto("http://127.0.0.1:5174/dashboard");
  await expect(
    page.getByRole("heading", { name: "Our test organisation" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create a listing", exact: true })
    .click();
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
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Photos & images" }),
  ).toBeVisible();
  expect(
    requests.find((r) => r.name === "save_listing")?.body.content.publicEmail,
  ).toBe("");
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
  await page.goto("http://127.0.0.1:5174/admin");
  await page.getByRole("button", { name: "Review listing & images" }).click();
  await expect(page.getByText("CURRENT PUBLIC CONTENT")).toBeVisible();
  await expect(page.getByText("PROPOSED CONTENT")).toBeVisible();
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
  await page.goto(`http://127.0.0.1:5174/listing/${id}`);
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
