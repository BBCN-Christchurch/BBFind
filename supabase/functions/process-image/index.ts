import { createClient } from "@supabase/supabase-js";
import { processRaster } from "../_shared/process.ts";
import { readImageForm } from "../_shared/limits.ts";
import { cors, json, originAllowed } from "../_shared/http.ts";
Deno.serve(async (req) => {
  if (!originAllowed(req))
    return json(req, { error: "Origin not permitted." }, 403);
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "POST required." }, 405);
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization)
    return json(req, { error: "Sign in to upload images." }, 401);
  const url = Deno.env.get("SUPABASE_URL")!,
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const service = createClient(url, key, { auth: { persistSession: false } });
  const {
    data: { user },
    error: authError,
  } = await service.auth.getUser(token);
  if (authError || !user?.email_confirmed_at)
    return json(req, { error: "A verified account is required." }, 401);
  const actor = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  let paths: string[] = [],
    id: string | null = null;
  try {
    const contentLength = Number(req.headers.get("Content-Length") || 0);
    if (contentLength > 7 * 1024 * 1024) throw new Error("Upload too large.");
    const form = await readImageForm(req);
    const file = form.get("file"),
      listingId = String(form.get("listingId") || "");
    if (
      !/^[a-f0-9-]{36}$/i.test(listingId) ||
      !(file instanceof File) ||
      file.size > 6 * 1024 * 1024
    )
      throw new Error("Invalid image upload.");
    const { data: permitted, error } = await actor.rpc("can_manage_listing", {
      target: listingId,
    });
    if (error || !permitted)
      return json(req, { error: "You cannot manage this listing." }, 403);
    const metadata = {
      caption: String(form.get("caption") || ""),
      alt: String(form.get("alt") || ""),
      position: Number(form.get("position") || 0),
      primary: false,
      remove: false,
    };
    if (
      metadata.caption.length > 300 ||
      !metadata.alt.trim() ||
      metadata.alt.length > 300 ||
      !Number.isInteger(metadata.position) ||
      metadata.position < 0 ||
      metadata.position > 100
    )
      throw new Error("Check image caption, alt text and order.");
    const replacesId = String(form.get("replacesId") || "");
    const processed = await processRaster(
      new Uint8Array(await file.arrayBuffer()),
    );
    id = crypto.randomUUID();
    const total =
      processed.thumbnail.length +
      processed.detail.length +
      processed.large.length;
    const registered = await service.rpc("register_processed_image", {
      image_id: id,
      target_listing: listingId,
      actor: user.id,
      metadata,
      bytes: total,
      format: processed.format,
      replacement: replacesId || null,
    });
    if (registered.error) throw registered.error;
    for (const [name, bytes] of [
      ["thumb", processed.thumbnail],
      ["detail", processed.detail],
      ["large", processed.large],
    ] as const) {
      const path = `${id}/${name}.${processed.format}`;
      paths.push(path);
      const { error } = await service.storage
        .from("directory-images")
        .upload(path, bytes, {
          contentType: processed.mime,
          cacheControl: "60",
          upsert: false,
        });
      if (error) throw error;
    }
    return json(req, { id, status: "pending_review" });
  } catch (e) {
    if (paths.length)
      await service.storage.from("directory-images").remove(paths);
    if (id) await service.from("listing_images").delete().eq("id", id);
    const message =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e && "message" in e
          ? String(e.message)
          : "Could not process image.";
    return json(req, { error: message }, 400);
  }
});
