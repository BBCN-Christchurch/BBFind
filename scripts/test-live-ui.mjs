import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
export async function testLiveUI(config, owner, admin, check, imageBytes) {
  const server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "5175",
      "--strictPort",
    ],
    {
      stdio: "ignore",
      env: {
        ...process.env,
        VITE_SUPABASE_URL: config.API_URL,
        VITE_SUPABASE_ANON_KEY: config.ANON_KEY,
        VITE_ENABLE_ACCOUNTS: "true",
      },
    },
  );
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        if (
          (
            await fetch("http://127.0.0.1:5175/", {
              signal: AbortSignal.timeout(1000),
            })
          ).ok
        ) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!ready) throw new Error("Live UI test server did not start.");
    const executablePath =
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
    browser = await chromium.launch({ executablePath, headless: true });
    async function signIn(account) {
      const page = await browser.newPage();
      page.on("requestfailed", (request) =>
        console.error(
          "Live browser request failed:",
          new URL(request.url()).pathname,
          request.failure()?.errorText,
        ),
      );
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          message.text().includes("Access-Control")
        )
          console.error("Live browser CORS:", message.text());
      });
      await page.goto("http://127.0.0.1:5175/account");
      await page
        .getByLabel("Email address", { exact: true })
        .fill(account.email);
      await page.getByLabel("Password", { exact: true }).fill(account.password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      try {
        await expect(
          page.getByRole("heading", {
            name: account === owner ? "Test owner-a" : "Test administrator",
            exact: true,
          }),
        ).toBeVisible({ timeout: 10000 });
      } catch (error) {
        console.error(
          "Live sign-in screen:",
          await page.locator("main").innerText(),
        );
        throw error;
      }
      return page;
    }
    const page = await signIn(owner);
    check(
      true,
      "real browser signs in with Supabase Auth and loads the private dashboard",
    );
    await page
      .getByRole("button", { name: "Create a listing", exact: true })
      .click();
    await page
      .getByLabel("Listing name", { exact: true })
      .fill("A programme from the live browser");
    await page
      .getByLabel("Short introduction")
      .fill("A real browser-to-backend integration check.");
    await page
      .getByLabel("Full description")
      .fill(
        "This listing was submitted using the real React dashboard and Supabase services.",
      );
    await page.getByLabel("Education and Learning", { exact: true }).check();
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Photos & images" }),
    ).toBeVisible();
    check(true, "browser saves a real listing draft");
    await page.getByLabel("Image file", { exact: true }).setInputFiles({
      name: "community-test.png",
      mimeType: "image/png",
      buffer: Buffer.from(imageBytes),
    });
    await page
      .getByLabel("Image description (alt text)", { exact: true })
      .fill("A green community illustration");
    await page
      .getByRole("button", { name: "Upload for review", exact: true })
      .click();
    await expect(
      page.getByText("Image uploaded privately and sent for review.", {
        exact: false,
      }),
    ).toBeVisible({ timeout: 20000 });
    check(
      true,
      "browser uploads an image through the real Edge processor and private Storage",
    );
    await page
      .getByRole("button", { name: "Submit for review", exact: true })
      .click();
    await expect(
      page.getByText("Your submission is being reviewed.", { exact: false }),
    ).toBeVisible();
    const reviewer = await signIn(admin);
    await reviewer.goto("http://127.0.0.1:5175/admin");
    await reviewer
      .getByRole("button", { name: "Review listing & images" })
      .click();
    await reviewer
      .getByRole("button", { name: "Approve listing", exact: true })
      .click();
    await expect(reviewer.getByText("Review saved.")).toBeVisible();
    await reviewer
      .getByRole("button", { name: "Review listing & images" })
      .click();
    await reviewer
      .getByRole("button", { name: "Approve image", exact: true })
      .click();
    await expect(reviewer.getByText("Saved.", { exact: true })).toBeVisible();
    check(
      true,
      "administrator approves listing text and image independently through the real interface",
    );
    const rows = await owner.c
      .from("listings")
      .select("id,published")
      .eq(
        "organisation_id",
        (await owner.c.from("organisations").select("id").single()).data.id,
      );
    const listing = rows.data?.find(
      (r) => r.published?.name === "A programme from the live browser",
    );
    if (!listing) throw new Error("Browser-created listing was not published.");
    const visitor = await browser.newPage();
    await visitor.goto(`http://127.0.0.1:5175/listing/${listing.id}`);
    await expect(
      visitor.getByRole("heading", {
        name: "A programme from the live browser",
        exact: true,
      }),
    ).toBeVisible();
    await visitor
      .getByRole("button", {
        name: "Enlarge A green community illustration",
        exact: true,
      })
      .click();
    await expect(
      visitor.getByRole("dialog", { name: "Image gallery" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        visitor
          .getByRole("dialog")
          .locator("img")
          .evaluate((img) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
    check(
      true,
      "anonymous browser can view the published listing and approved gallery",
    );
    await page
      .getByRole("button", { name: "Back to listings", exact: false })
      .click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Welcome back." }),
    ).toBeVisible();
    check(true, "real browser signs out and loses dashboard access");
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
    await new Promise((r) => server.once("exit", r));
  }
}
