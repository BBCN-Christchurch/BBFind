import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Star,
  Upload,
  X,
} from "lucide-react";
import { imageUrl, ownerImages, proposeImage, rpc, uploadImage } from "./api";
import { type ImageRecord, type ImageMeta, friendlyStatus } from "./domain";
import { Message } from "./App";
export function StoredImage({
  path,
  alt,
  onClick,
}: {
  path: string;
  alt: string;
  onClick?: () => void;
}) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void imageUrl(path)
      .then((u) => {
        if (active) setUrl(u);
      })
      .catch(() => setError(true));
    return () => {
      active = false;
    };
  }, [path]);
  if (error)
    return <span className="image-unavailable">Image unavailable</span>;
  return url ? (
    <img src={url} alt={alt} loading="lazy" onClick={onClick} />
  ) : (
    <span className="image-loading" role="status">
      Loading image…
    </span>
  );
}
export function ImageGallery({ images }: { images: ImageRecord[] }) {
  const sorted = [...images].sort(
    (a, b) =>
      Number(b.published?.primary) - Number(a.published?.primary) ||
      (a.published?.position || 0) - (b.published?.position || 0),
  );
  const [current, setCurrent] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (current !== null && !dialog.current?.open) dialog.current?.showModal();
    if (current === null && dialog.current?.open) dialog.current.close();
  }, [current]);
  return (
    <>
      <div className="gallery-grid">
        {sorted.map((img, i) => (
          <button
            className={i === 0 ? "gallery-featured" : ""}
            key={img.id}
            onClick={() => setCurrent(i)}
            aria-label={`Enlarge ${img.published?.alt || "image"}${img.published?.caption ? ": " + img.published.caption : ""}`}
          >
            <StoredImage
              path={i === 0 ? img.detail_path : img.thumbnail_path}
              alt={img.published?.alt || ""}
            />
            {img.published?.caption && <span>{img.published.caption}</span>}
          </button>
        ))}
      </div>
      <dialog
        className="lightbox"
        ref={dialog}
        onClose={() => setCurrent(null)}
        onCancel={() => setCurrent(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setCurrent((v) =>
              v === null ? 0 : (v - 1 + sorted.length) % sorted.length,
            );
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            setCurrent((v) => (v === null ? 0 : (v + 1) % sorted.length));
          }
        }}
        aria-label="Image gallery"
      >
        <button
          className="icon-button lightbox-close"
          aria-label="Close gallery"
          onClick={() => setCurrent(null)}
        >
          <X />
        </button>
        {current !== null && sorted[current] && (
          <>
            <div className="lightbox-image">
              <StoredImage
                path={sorted[current].large_path}
                alt={sorted[current].published?.alt || ""}
              />
            </div>
            <div className="lightbox-caption">
              <button
                className="icon-button"
                aria-label="Previous image"
                onClick={() =>
                  setCurrent((current - 1 + sorted.length) % sorted.length)
                }
              >
                <ChevronLeft />
              </button>
              <div>
                <p>{sorted[current].published?.caption}</p>
                <small>
                  {current + 1} of {sorted.length}
                </small>
              </div>
              <button
                className="icon-button"
                aria-label="Next image"
                onClick={() => setCurrent((current + 1) % sorted.length)}
              >
                <ChevronRight />
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
export function ImageManager({
  listingId,
  admin = false,
  onChange,
}: {
  listingId: string;
  admin?: boolean;
  onChange?: () => void;
}) {
  const [images, setImages] = useState<ImageRecord[]>([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  async function refresh() {
    try {
      setImages(await ownerImages(listingId));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
  }, [listingId]);
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form),
      file = data.get("image") as File;
    if (!file?.size) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await uploadImage(
        listingId,
        file,
        String(data.get("caption")),
        String(data.get("alt")),
        images.length,
        String(data.get("replacesId") || ""),
      );
      form.reset();
      await refresh();
      setMessage(
        "Image uploaded privately and sent for review. Existing approved images stay visible.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      await refresh();
      onChange?.();
      setMessage("Saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="image-manager">
      <h2>
        <ImagePlus size={23} /> Photos & images
      </h2>
      <p>
        Each listing has its own images. Upload JPG, PNG or WebP files up to 5
        MiB (128–6000 pixels per side, up to 24 megapixels). Images are resized
        to 1200 pixels before secure processing. Up to 12 active images per
        listing.
      </p>
      <Message>
        Uploads, captions, featured selections, reordering and removal requests
        require BBCN approval. Approved photos remain visible until changes are
        approved.
      </Message>
      {error && <Message error>{error}</Message>}
      {message && <Message>{message}</Message>}
      <div className="managed-images">
        {images
          .filter((i) => i.published || i.status !== "approved")
          .map((img) => (
            <ImageEditor
              key={img.id}
              image={img}
              busy={busy}
              admin={admin}
              onSave={(meta) => action(() => proposeImage(img.id, meta))}
              onReview={(decision, note) =>
                action(() =>
                  rpc("review_image", {
                    image_id: img.id,
                    decision,
                    note,
                    expected_metadata: img.proposed,
                  }),
                )
              }
            />
          ))}
      </div>
      {!admin && (
        <form className="upload-form" onSubmit={upload}>
          <h3>Add a photograph</h3>
          <label>
            Image file
            <input
              ref={fileRef}
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              disabled={busy}
            />
          </label>
          <label>
            Replace an approved image (optional)
            <select name="replacesId">
              <option value="">Add a new image</option>
              {images
                .filter((i) => i.published)
                .map((i) => (
                  <option value={i.id} key={i.id}>
                    {i.published?.caption ||
                      i.published?.alt ||
                      "Approved image"}
                  </option>
                ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Caption
              <input
                name="caption"
                maxLength={300}
                placeholder="e.g. Main hall set up for a workshop"
              />
            </label>
            <label>
              Image description (alt text)
              <input
                name="alt"
                maxLength={300}
                required
                placeholder="Describe what the photograph shows"
              />
            </label>
          </div>
          <button
            className="button"
            disabled={
              busy ||
              images.filter((i) => i.published || i.status === "pending_review")
                .length >= 13
            }
          >
            <Upload size={16} />
            {busy ? "Processing image…" : "Upload for review"}
          </button>
          <p className="help">
            Select an approved image to replace it. The existing photograph
            stays public until BBCN approves its replacement. Only upload
            photographs you have permission to share.
          </p>
        </form>
      )}
    </section>
  );
}
function ImageEditor({
  image,
  busy,
  admin,
  onSave,
  onReview,
}: {
  image: ImageRecord;
  busy: boolean;
  admin: boolean;
  onSave: (m: ImageMeta) => void;
  onReview: (d: string, n: string) => void;
}) {
  const base = image.proposed ||
    image.published || {
      caption: "",
      alt: "",
      position: 0,
      primary: false,
      remove: false,
    };
  const [meta, setMeta] = useState(base),
    [note, setNote] = useState("");
  useEffect(() => setMeta(base), [image.proposed, image.published]);
  return (
    <div className="managed-image">
      <StoredImage path={image.thumbnail_path} alt={base.alt} />
      <div>
        <span className={`status ${image.status}`}>
          {friendlyStatus(image.status)}
        </span>
        {image.published && (
          <small className="published-label">
            Currently public {image.published.primary && "· Featured"}
          </small>
        )}
        {image.replaces_id && (
          <p className="help">
            Replacement image: approval will replace the previous approved
            photograph.
          </p>
        )}
        {image.note && <p className="review-note">BBCN: {image.note}</p>}
        {admin && image.published && image.proposed && (
          <p className="help">
            Currently approved caption: {image.published.caption || "(none)"}
          </p>
        )}
        <label>
          Caption
          <input
            value={meta.caption}
            maxLength={300}
            onChange={(e) => setMeta({ ...meta, caption: e.target.value })}
            disabled={admin || busy}
          />
        </label>
        <label>
          Alt text
          <input
            value={meta.alt}
            maxLength={300}
            onChange={(e) => setMeta({ ...meta, alt: e.target.value })}
            disabled={admin || busy}
          />
        </label>
        <div className="image-options">
          <label>
            Order
            <input
              type="number"
              min="0"
              max="100"
              value={meta.position}
              disabled={admin || busy}
              onChange={(e) =>
                setMeta({ ...meta, position: Number(e.target.value) })
              }
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={meta.primary}
              disabled={admin || busy}
              onChange={(e) => setMeta({ ...meta, primary: e.target.checked })}
            />
            <Star size={14} /> Featured
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={meta.remove}
              disabled={admin || busy}
              onChange={(e) => setMeta({ ...meta, remove: e.target.checked })}
            />
            Request removal
          </label>
        </div>
        {admin ? (
          <>
            <label>
              Review note
              <input
                value={note}
                maxLength={1000}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <div className="button-row">
              <button
                className="button small"
                disabled={busy || image.status !== "pending_review"}
                onClick={() => onReview("approve", note)}
              >
                Approve {meta.remove ? "removal" : "image"}
              </button>
              <button
                className="button secondary small"
                disabled={busy || image.status !== "pending_review"}
                onClick={() => onReview("reject", note)}
              >
                Reject changes
              </button>
            </div>
          </>
        ) : (
          <button
            className="button secondary small"
            disabled={busy || !meta.alt.trim()}
            onClick={() => onSave(meta)}
          >
            Submit image changes
          </button>
        )}
      </div>
    </div>
  );
}
