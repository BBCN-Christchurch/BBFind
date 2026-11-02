// Browser contracts use synthetic Auth responses; no real email is sent.
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const portal = "http://127.0.0.1:5184";
const email = "registration@example.test";
const password = "A-test-password-2026!";
async function authFixture(
  page: Page,
  {
    signupError,
    resendError,
  }: { signupError?: { code: string; msg: string }; resendError?: string } = {},
) {
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  await page.route("http://127.0.0.1:54321/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    let data: unknown = [];
    let status = 200;
    if (path.startsWith("/auth/")) {
      requests.push({ path, body: req.postDataJSON() || {} });
      if (path.endsWith("/signup")) {
        if (signupError) {
          status = 422;
          data = signupError;
        } else
          data = {
            id: "00000000-0000-4000-8000-000000000001",
            aud: "authenticated",
            email,
            app_metadata: { provider: "email" },
            user_metadata: {},
            identities: [],
            created_at: new Date().toISOString(),
          };
      } else if (path.endsWith("/token")) {
        status = 400;
        data = { code: "email_not_confirmed", msg: "Email not confirmed" };
      } else if (path.endsWith("/resend") && resendError) {
        status = 429;
        data = { code: "over_email_send_rate_limit", msg: resendError };
      } else data = {};
    }
    await route.fulfill({
      status,
      headers: {
        "x-supabase-api-version": "2024-01-01",
        "access-control-expose-headers": "X-Supabase-Api-Version",
      },
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  return requests;
}
async function fillRegistration(page: Page) {
  await page.goto(`${portal}/account?mode=register`);
  await page
    .getByLabel("Organisation name", { exact: true })
    .fill("Test organisation");
  await page
    .getByLabel("Your contact name", { exact: false })
    .fill("Private test contact");
  await page.getByLabel("Contact phone", { exact: false }).fill("0200000000");
  await page.getByLabel("Email address", { exact: false }).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("checkbox").check();
}
test("submitted registration replaces and clears the form with an accessible notice", async ({
  page,
}) => {
  const requests = await authFixture(page);
  await fillRegistration(page);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const heading = page.getByRole("heading", { name: "Check your inbox." });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(page.locator("main input")).toHaveCount(0);
  await expect(
    page.getByText("Your registration request has been submitted."),
  ).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  for (const value of [
    "Test organisation",
    "Private test contact",
    "0200000000",
    password,
  ])
    await expect(page.locator("main")).not.toContainText(value);
  await expect(
    page.getByRole("button", { name: /Send again in/ }),
  ).toBeDisabled();
  expect(requests.filter((r) => r.path.endsWith("/signup"))).toHaveLength(1);
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(report.violations).toEqual([]);
  await page
    .getByRole("button", { name: "Back to sign in", exact: true })
    .click();
  await expect(page.getByLabel("Email address", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
});
test("registration errors retain entered fields for correction", async ({
  page,
}) => {
  await authFixture(page, {
    signupError: {
      code: "email_address_invalid",
      msg: "Please check your email address.",
    },
  });
  await fillRegistration(page);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText("Please check your email address."),
  ).toBeVisible();
  await expect(
    page.getByLabel("Organisation name", { exact: true }),
  ).toHaveValue("Test organisation");
  await expect(
    page.getByRole("heading", { name: "Check your inbox." }),
  ).toHaveCount(0);
});
test("closed signup explains availability without an instance error", async ({
  page,
}) => {
  await authFixture(page, {
    signupError: {
      code: "signup_disabled",
      msg: "Signups not allowed for this instance",
    },
  });
  await fillRegistration(page);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText("Registration is not open yet. Please try again later."),
  ).toBeVisible();
});
test("reset request replaces the form without revealing whether the account exists", async ({
  page,
}) => {
  const requests = await authFixture(page);
  await page.goto(`${portal}/account?mode=reset`);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Send reset link", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your inbox." }),
  ).toBeVisible();
  await expect(page.locator("main input")).toHaveCount(0);
  await expect(
    page.getByText(/If an account is associated with this email/),
  ).toBeVisible();
  expect(requests.filter((r) => r.path.endsWith("/recover"))).toHaveLength(1);
});
test("unconfirmed sign-in offers a fresh verification email and then hides the form", async ({
  page,
}) => {
  const requests = await authFixture(page);
  await page.goto(`${portal}/account`);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText(/Confirm your email address before signing in/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Send a new verification email" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your inbox." }),
  ).toBeVisible();
  await expect(page.locator("main input")).toHaveCount(0);
  expect(requests.find((r) => r.path.endsWith("/resend"))?.body).toMatchObject({
    email,
    type: "signup",
  });
});
test("resend rate limits show an error on the notice without restoring private fields", async ({
  page,
}) => {
  await page.clock.install();
  await authFixture(page, {
    resendError: "Please wait before requesting another email.",
  });
  await fillRegistration(page);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your inbox." }),
  ).toBeVisible();
  await page.clock.runFor(61000);
  await page
    .getByRole("button", { name: "Send another email", exact: true })
    .click();
  await expect(
    page.getByText("Please wait before requesting another email."),
  ).toBeVisible();
  await expect(page.locator("main input")).toHaveCount(0);
});
test("expired confirmation callbacks explain how to recover without echoing URL errors", async ({
  page,
}) => {
  await authFixture(page);
  await page.goto(
    `${portal}/account#error=access_denied&error_code=otp_expired&error_description=untrusted-provider-detail`,
  );
  await expect(
    page.getByText(/This email link is invalid or has expired/),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText(
    "untrusted-provider-detail",
  );
});
