import { createClient, type Session } from "@supabase/supabase-js";
import type {
  ImageMeta,
  ImageRecord,
  Listing,
  ListingData,
  ManagedListing,
} from "./domain";
import { demoListings } from "./demo";
import { publicSupabaseConfig } from "./supabase-config";
const connection = publicSupabaseConfig(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
export const configured = connection.configured;
export const db = connection.configured
  ? createClient(connection.url, connection.key, {
      auth: { detectSessionInUrl: true },
    })
  : null;
export const accountsEnabled = import.meta.env.VITE_ENABLE_ACCOUNTS === "true";
export const portalUrl = import.meta.env.VITE_ACCOUNT_PORTAL_URL as
  string | undefined;
export type Account = {
  id: string;
  owner_id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  suspended: boolean;
};
export type SessionContext = {
  session: Session | null;
  account: Account | null;
  admin: boolean;
};
export async function rpc<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  if (!db) throw new Error("The live directory is not connected yet.");
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
export async function getPublicListings(): Promise<Listing[]> {
  if (!db) return demoListings;
  const rows: Listing[] = [];
  for (let offset = 0; ; offset += 200) {
    const batch = await rpc<
      {
        id: string;
        organisation_name: string;
        data: ListingData;
        featured: boolean;
        verified: boolean;
      }[]
    >("directory_search", { offset_count: offset, page_size: 200 });
    rows.push(
      ...batch.map(({ id, data, ...rest }) => ({ ...data, id, ...rest })),
    );
    if (batch.length < 200) break;
  }
  return rows;
}
export async function getContext(
  session: Session | null,
): Promise<SessionContext> {
  if (!session || !db) return { session: null, account: null, admin: false };
  const [account, admin] = await Promise.all([
    db
      .from("organisations")
      .select("*")
      .eq("owner_id", session.user.id)
      .maybeSingle(),
    rpc<boolean>("is_admin"),
  ]);
  if (account.error) throw new Error(account.error.message);
  return { session, account: account.data, admin };
}
export async function managedListings(all = false): Promise<ManagedListing[]> {
  if (!db) throw new Error("Connect Supabase first.");
  const { data, error } = await db
    .from("listings")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).filter((l) => all || l.status !== "archived");
}
export async function saveListing(
  id: string | null,
  data: ListingData,
  submit: boolean,
) {
  return rpc<string>("save_listing", { listing_id: id, content: data, submit });
}
export async function publicImages(id: string): Promise<ImageRecord[]> {
  return db ? rpc("directory_images", { target_listing: id }) : [];
}
export async function ownerImages(id: string): Promise<ImageRecord[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("listing_images")
    .select("*")
    .eq("listing_id", id);
  if (error) throw error;
  return data || [];
}
export async function imageUrl(path: string) {
  if (!db) return "";
  const { data, error } = await db.storage
    .from("directory-images")
    .createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}
export async function proposeImage(id: string, metadata: ImageMeta) {
  return rpc("propose_image", { image_id: id, metadata });
}
export async function uploadImage(
  listingId: string,
  file: File,
  caption: string,
  alt: string,
  position: number,
  replacesId = "",
) {
  if (!db) throw new Error("Connect Supabase first.");
  const blob = await prepareImage(file);
  const form = new FormData();
  form.append("file", blob, "image.png");
  form.append("listingId", listingId);
  form.append("caption", caption);
  form.append("alt", alt);
  form.append("position", String(position));
  form.append("replacesId", replacesId);
  const { data, error } = await db.functions.invoke("process-image", {
    body: form,
  });
  if (error) {
    let message = error.message;
    try {
      message = (await error.context.json()).error || message;
    } catch {
      /* response is not JSON */
    }
    throw new Error(message);
  }
  return data;
}
export async function prepareImage(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG or WebP image.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Choose an image smaller than 5 MiB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (
      bitmap.width < 128 ||
      bitmap.height < 128 ||
      bitmap.width > 6000 ||
      bitmap.height > 6000 ||
      bitmap.width * bitmap.height > 24000000
    )
      throw new Error(
        "Images must be at least 128 × 128 pixels, at most 6000 pixels per side and 24 megapixels.",
      );
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("Could not read this image.")),
        "image/png",
      ),
    );
  } finally {
    bitmap.close();
  }
}
