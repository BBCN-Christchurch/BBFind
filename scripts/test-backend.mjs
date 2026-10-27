import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { Image } from "imagescript";
import { testAuthEmail } from "./test-auth-email.mjs";
import { testLiveUI } from "./test-live-ui.mjs";
// Deliberately local-only: never creates test accounts against a hosted project.
const cli = process.env.SUPABASE_CLI || "supabase";
const config = JSON.parse(
  process.env.BBFIND_LOCAL_CONFIG
    ? readFileSync(process.env.BBFIND_LOCAL_CONFIG, "utf8")
    : execFileSync(cli, ["status", "-o", "json"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
);
const url = config.API_URL;
if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error("Backend tests only run against local Supabase.");
const service = createClient(url, config.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const client = () =>
  createClient(url, config.ANON_KEY, { auth: { persistSession: false } });
const anonymous = client(),
  users = [],
  objectPaths = [];
let passed = 0;
function check(condition, label) {
  assert.ok(condition, label);
  passed++;
  console.log("PASS", label);
}
async function ok(promise) {
  const result = await promise;
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
const suffix = randomBytes(5).toString("hex");
async function account(label, confirm = true) {
  const email = `${label}-${suffix}@example.test`,
    password = randomBytes(20).toString("base64url") + "Aa1!";
  const { user } = await ok(
    service.auth.admin.createUser({
      email,
      password,
      email_confirm: confirm,
      user_metadata: {
        organisation_name: `Test ${label}`,
        contact_name: `PRIVATE ${label}`,
        phone: "PRIVATE PHONE",
      },
    }),
  );
  users.push(user.id);
  const c = client();
  const login = await c.auth.signInWithPassword({ email, password });
  return { id: user.id, c, email, password, login };
}
const content = {
  name: "A real test programme",
  summary: "A programme created by the local integration tests.",
  description:
    "This test description is public. No registration contact is copied into it.",
  type: "programme",
  categories: ["Education and Learning"],
  suburb: "Burnside",
  address: "",
  website: "",
  publicEmail: "",
  publicPhone: "",
  publicContact: "",
  socialLinks: "",
  times: "",
  ageGroups: "",
  cost: "",
  accessibility: "",
  capacity: 0,
  roomType: "",
  kitchen: false,
  accessible: false,
  outdoor: false,
  wifi: false,
  parking: false,
  av: false,
  toilets: false,
  facilities: "",
  suitableFor: "",
  availability: "",
  bookingUrl: "",
  price: 0,
  spaces: "",
};
let a, b, admin, id, current, org;
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(url + "/functions/v1/process-image", {
        method: "POST",
        headers: { apikey: config.ANON_KEY },
      });
      if (response.status === 401) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready)
    throw new Error(
      "Image function did not become ready. Start supabase functions serve and inspect its logs.",
    );
  await testAuthEmail(config, service, client, users, check);
  a = await account("owner-a");
  b = await account("owner-b");
  admin = await account("administrator");
  const unverified = await account("unverified", false);
  check(Boolean(unverified.login.error), "unverified email cannot sign in");
  check(
    (await ok(a.c.rpc("is_admin"))) === false,
    "first registered user is not an administrator",
  );
  await ok(service.from("administrator_roles").insert({ user_id: admin.id }));
  check(
    (await ok(admin.c.rpc("is_admin"))) === true,
    "explicit administrator grant works",
  );
  const own = await ok(a.c.from("organisations").select("*"));
  org = own[0].id;
  check(
    own.length === 1 && own[0].owner_id === a.id,
    "owner sees only own private account",
  );
  const anonAccount = await anonymous.from("organisations").select("*");
  check(Boolean(anonAccount.error), "anonymous account-table access denied");
  const escalate = await a.c
    .from("administrator_roles")
    .insert({ user_id: a.id });
  check(Boolean(escalate.error), "owner cannot grant administrator access");
  id = await ok(
    a.c.rpc("save_listing", { listing_id: null, content, submit: false }),
  );
  check(
    !(await ok(anonymous.rpc("directory_search"))).some((l) => l.id === id),
    "draft does not appear publicly",
  );
  check(
    (await ok(b.c.from("listings").select("*").eq("id", id))).length === 0,
    "other organisation cannot read private listing",
  );
  check(
    Boolean(
      (
        await b.c.rpc("save_listing", {
          listing_id: id,
          content: { ...content, name: "Hijacked listing" },
          submit: true,
        })
      ).error,
    ),
    "ID tampering cannot edit another organisation",
  );
  check(
    Boolean(
      (
        await a.c
          .from("listings")
          .update({ published: content, status: "published" })
          .eq("id", id)
      ).error,
    ),
    "owner cannot bypass moderation through direct table writes",
  );
  await ok(a.c.rpc("save_listing", { listing_id: id, content, submit: true }));
  check(
    !(await ok(anonymous.rpc("directory_search"))).some((l) => l.id === id),
    "pending listing remains private",
  );
  check(
    Boolean(
      (
        await a.c.rpc("review_listing", {
          listing_id: id,
          decision: "approve",
          note: "",
          expected_content: content,
        })
      ).error,
    ),
    "owner cannot approve their listing",
  );
  check(
    Boolean(
      (
        await admin.c.rpc("review_listing", {
          listing_id: id,
          decision: "approve",
          note: "",
          expected_content: { ...content, name: "stale" },
        })
      ).error,
    ),
    "stale listing approval is rejected",
  );
  await ok(
    admin.c.rpc("review_listing", {
      listing_id: id,
      decision: "approve",
      note: "",
      expected_content: content,
    }),
  );
  let publicRows = await ok(anonymous.rpc("directory_search"));
  check(
    publicRows.some((l) => l.id === id && l.data.name === content.name),
    "approved listing appears publicly",
  );
  check(
    !JSON.stringify(publicRows).includes("PRIVATE") &&
      !JSON.stringify(publicRows).includes(a.email),
    "public payload excludes registration contacts",
  );
  current = { ...content, name: "A proposed replacement name" };
  await ok(
    a.c.rpc("save_listing", { listing_id: id, content: current, submit: true }),
  );
  publicRows = await ok(anonymous.rpc("directory_search"));
  check(
    publicRows.find((l) => l.id === id).data.name === content.name,
    "pending edit retains the existing approved content",
  );
  await ok(
    admin.c.rpc("review_listing", {
      listing_id: id,
      decision: "changes_requested",
      note: "Please clarify the name.",
      expected_content: current,
    }),
  );
  check(
    (await ok(a.c.from("listings").select("*").eq("id", id)))[0].review_note ===
      "Please clarify the name.",
    "owner receives private changes-requested feedback",
  );
  await ok(
    a.c.rpc("save_listing", { listing_id: id, content: current, submit: true }),
  );
  await ok(
    admin.c.rpc("review_listing", {
      listing_id: id,
      decision: "approve",
      note: "",
      expected_content: current,
    }),
  );
  const second = await ok(
    a.c.rpc("save_listing", {
      listing_id: null,
      content: { ...content, name: "Second listing, same organisation" },
      submit: false,
    }),
  );
  check(
    (await ok(a.c.from("listings").select("id").eq("organisation_id", org)))
      .length === 2,
    "one organisation can create multiple listings",
  );
  check(
    Boolean(
      (
        await a.c.rpc("register_processed_image", {
          image_id: crypto.randomUUID(),
          target_listing: id,
          actor: a.id,
          metadata: {
            caption: "",
            alt: "Photo",
            position: 0,
            primary: false,
            remove: false,
          },
          bytes: 100,
          format: "png",
          replacement: null,
        })
      ).error,
    ),
    "owner cannot register unvalidated image bytes",
  );
  const imageBytes = await new Image(640, 480).fill(0x799456ff).encode();
  async function upload(c, replacement = "") {
    const form = new FormData();
    form.append(
      "file",
      new Blob([imageBytes], { type: "image/png" }),
      "private-name-must-not-be-public.png",
    );
    form.append("listingId", id);
    form.append("alt", "A community photograph");
    form.append("caption", "Awaiting approval");
    form.append("position", "0");
    form.append("replacesId", replacement);
    const result = await c.functions.invoke("process-image", { body: form });
    if (result.error) {
      let reason = result.error.message;
      try {
        reason = (await result.error.context.json()).error || reason;
      } catch {}
      throw new Error("Image function: " + reason);
    }
    return result.data.id;
  }
  const imageId = await upload(a.c);
  let image = (
    await ok(a.c.from("listing_images").select("*").eq("id", imageId))
  )[0];
  objectPaths.push(image.thumbnail_path, image.detail_path, image.large_path);
  check(
    image.status === "pending_review" && image.published === null,
    "uploaded image remains private pending individual review",
  );
  check(
    (await ok(anonymous.rpc("directory_images", { target_listing: id })))
      .length === 0,
    "pending image excluded from public gallery",
  );
  check(
    Boolean(
      (
        await anonymous.storage
          .from("directory-images")
          .createSignedUrl(image.thumbnail_path, 60)
      ).error,
    ),
    "anonymous user cannot sign a pending image URL",
  );
  check(
    Boolean(
      (
        await b.c.storage
          .from("directory-images")
          .createSignedUrl(image.thumbnail_path, 60)
      ).error,
    ),
    "other organisation cannot access pending image bytes",
  );
  check(
    Boolean(
      (
        await a.c.storage
          .from("directory-images")
          .createSignedUrl(image.thumbnail_path, 60)
      ).data,
    ),
    "owner can preview their pending image",
  );
  await ok(
    admin.c.rpc("review_image", {
      image_id: imageId,
      decision: "approve",
      note: "",
      expected_metadata: image.proposed,
    }),
  );
  let publicImages = await ok(
    anonymous.rpc("directory_images", { target_listing: id }),
  );
  check(
    publicImages.length === 1 &&
      publicImages[0].proposed === null &&
      publicImages[0].note === null,
    "approved image public projection excludes pending metadata and notes",
  );
  const signed = await ok(
    anonymous.storage
      .from("directory-images")
      .createSignedUrl(image.thumbnail_path, 60),
  );
  check(
    (await fetch(signed.signedUrl)).ok,
    "approved image bytes can be fetched publicly",
  );
  const metadata = {
    ...publicImages[0].published,
    caption: "Proposed caption",
  };
  await ok(a.c.rpc("propose_image", { image_id: imageId, metadata }));
  check(
    (await ok(anonymous.rpc("directory_images", { target_listing: id })))[0]
      .published.caption === "Awaiting approval",
    "pending caption does not change the approved caption",
  );
  check(
    Boolean(
      (
        await admin.c.rpc("review_image", {
          image_id: imageId,
          decision: "approve",
          note: "",
          expected_metadata: { ...metadata, caption: "stale" },
        })
      ).error,
    ),
    "stale image approval is rejected",
  );
  await ok(
    admin.c.rpc("review_image", {
      image_id: imageId,
      decision: "reject",
      note: "Please clarify.",
      expected_metadata: metadata,
    }),
  );
  check(
    (await ok(anonymous.rpc("directory_images", { target_listing: id })))
      .length === 1,
    "rejecting changes retains the approved image",
  );
  const replacementId = await upload(a.c, imageId);
  const replacement = (
    await ok(a.c.from("listing_images").select("*").eq("id", replacementId))
  )[0];
  objectPaths.push(
    replacement.thumbnail_path,
    replacement.detail_path,
    replacement.large_path,
  );
  check(
    (await ok(anonymous.rpc("directory_images", { target_listing: id })))[0]
      .id === imageId,
    "replacement upload retains the old approved image",
  );
  await ok(
    admin.c.rpc("review_image", {
      image_id: replacementId,
      decision: "approve",
      note: "",
      expected_metadata: replacement.proposed,
    }),
  );
  publicImages = await ok(
    anonymous.rpc("directory_images", { target_listing: id }),
  );
  check(
    publicImages.length === 1 && publicImages[0].id === replacementId,
    "replacement approval atomically swaps the public image",
  );
  await ok(
    admin.c.rpc("set_organisation_suspended", {
      organisation_id: org,
      suspend: true,
    }),
  );
  check(
    !(await ok(anonymous.rpc("directory_search"))).some((l) => l.id === id),
    "suspension withdraws public listings",
  );
  check(
    Boolean(
      (
        await a.c.rpc("save_listing", {
          listing_id: second,
          content,
          submit: true,
        })
      ).error,
    ),
    "suspended owner cannot submit listing changes",
  );
  check(
    Boolean(
      (
        await anonymous.storage
          .from("directory-images")
          .createSignedUrl(replacement.thumbnail_path, 60)
      ).error,
    ),
    "suspension denies new public image access",
  );
  await ok(
    admin.c.rpc("set_organisation_suspended", {
      organisation_id: org,
      suspend: false,
    }),
  );
  const exported = await ok(a.c.rpc("export_account"));
  check(
    exported.account.id === org && exported.listings.length === 2,
    "private export contains only the requesting organisation",
  );
  await ok(a.c.rpc("request_deletion"));
  check(
    Boolean(
      (await ok(admin.c.from("organisations").select("*").eq("id", org)))[0]
        .deletion_requested_at,
    ),
    "deletion request reaches administrators",
  );
  check(
    Boolean((await a.c.from("notifications").select("*")).error),
    "notification queue is not client-readable",
  );
  if (config.MAIL_URL) await testLiveUI(config, a, admin, check, imageBytes);
  await ok(
    admin.c.rpc("set_listing_state", {
      listing_id: id,
      new_state: "unpublish",
    }),
  );
  check(
    !(await ok(anonymous.rpc("directory_search"))).some((l) => l.id === id),
    "unpublication removes public listing",
  );
  console.log(
    `\n${passed} backend integration checks passed. Local SMTP was tested when a local inbox was configured. Hosted services remain unverified.`,
  );
} finally {
  const organisationIds =
    (
      await service.from("organisations").select("id").in("owner_id", users)
    ).data?.map((o) => o.id) || [];
  if (organisationIds.length) {
    const listingIds =
      (
        await service
          .from("listings")
          .select("id")
          .in("organisation_id", organisationIds)
      ).data?.map((l) => l.id) || [];
    if (listingIds.length) {
      const images =
        (
          await service
            .from("listing_images")
            .select("thumbnail_path,detail_path,large_path")
            .in("listing_id", listingIds)
        ).data || [];
      for (const image of images)
        objectPaths.push(
          image.thumbnail_path,
          image.detail_path,
          image.large_path,
        );
    }
  }
  if (objectPaths.length)
    await service.storage
      .from("directory-images")
      .remove([...new Set(objectPaths)]);
  for (const id of users.reverse()) await service.auth.admin.deleteUser(id);
}
