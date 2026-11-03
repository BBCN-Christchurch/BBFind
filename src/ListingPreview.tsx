import { useEffect, useRef, useState } from "react";
import { ownerImages } from "./api";
import {
  formatEventDate,
  isFreeListing,
  venuePriceLabel,
  listingSchema,
  type ListingData,
  type ImageRecord,
} from "./domain";
import { StoredImage } from "./Images";

export function ListingPreview({
  data,
  listingId,
  canSubmit,
  onClose,
  onSubmit,
}: {
  data: ListingData;
  listingId?: string;
  canSubmit: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [images, setImages] = useState<ImageRecord[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    if (listingId)
      void ownerImages(listingId)
        .then(setImages)
        .catch(() =>
          setError(
            "Images could not be loaded. Close this preview and try again.",
          ),
        );
  }, [listingId]);
  const validation = listingSchema.safeParse(data);
  const visible = images
    .filter(
      (i) =>
        !i.proposed?.remove &&
        !images.some(
          (next) => next.replaces_id === i.id && !next.proposed?.remove,
        ),
    )
    .sort(
      (a, b) =>
        Number((b.proposed || b.published)?.primary) -
        Number((a.proposed || a.published)?.primary),
    );
  return (
    <dialog
      ref={dialog}
      className="workflow-dialog listing-preview"
      aria-labelledby="preview-heading"
      onCancel={onClose}
    >
      <div className="section-heading">
        <h2 id="preview-heading">Private listing preview</h2>
        <button className="button secondary small" onClick={onClose}>
          Continue editing
        </button>
      </div>
      <p className="message">
        Only you can see this preview. Proposed text and photos need BBCN
        approval before publication.
      </p>
      <article>
        <span className="eyebrow">
          {data.type} · {data.suburb}
        </span>
        <h3 className="preview-title">{data.name || "Your listing name"}</h3>
        <p className="lead">{data.summary || "Add a short introduction."}</p>
        {data.type === "event" && (
          <p className="event-date">
            {formatEventDate(data.eventStartDate)}
            {data.eventEndDate && <> – {formatEventDate(data.eventEndDate)}</>}
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        <div className="preview-images">
          {visible.map((i) => (
            <figure key={i.id}>
              <StoredImage
                path={i.detail_path}
                alt={(i.proposed || i.published)?.alt || "Listing image"}
              />
              <figcaption>{(i.proposed || i.published)?.caption}</figcaption>
            </figure>
          ))}
        </div>
        <div className="tags">
          {data.categories.map((category) => (
            <span key={category}>{category}</span>
          ))}
        </div>
        {data.type === "venue" && (
          <div className="facility-grid">
            {[
              ["Kitchen", data.kitchen],
              ["Accessible", data.accessible],
              ["Outdoor space", data.outdoor],
              ["Wi-Fi", data.wifi],
              ["Parking", data.parking],
              ["AV equipment", data.av],
              ["Toilets", data.toilets],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <small>{label}</small>
                <strong>{value ? "Available" : "Not specified"}</strong>
              </div>
            ))}
          </div>
        )}
        <p className="preserve">
          {data.description || "Add the full description."}
        </p>
        <dl className="review-data">
          {[
            ["Address", data.address],
            ["When", data.times],
            ["Suitable ages", data.suitableAges.join(", ")],
            ["Age information", data.ageGroups],
            [
              "Cost",
              data.type === "venue"
                ? venuePriceLabel(data)
                : isFreeListing(data)
                  ? "Free"
                  : data.cost || "Cost not supplied",
            ],
            [
              "Capacity",
              data.type === "venue"
                ? data.capacity > 0
                  ? `${data.capacity} people`
                  : "Capacity not supplied"
                : "",
            ],
            ["Room / facility", data.roomType],
            ["Facilities", data.facilities],
            ["Layouts", data.spaces],
            ["Accessibility", data.accessibility],
            ["Availability", data.availability],
            ["Public contact", data.publicContact],
            ["Public email", data.publicEmail],
            ["Public phone", data.publicPhone],
            ["Website", data.website],
            ["Booking link", data.bookingUrl],
            ["Social links", data.socialLinks],
            ["Suitable activities", data.suitableFor],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      </article>
      {!validation.success && (
        <div className="message">
          <strong>Before submitting</strong>
          <ul>
            {validation.error.issues.map((issue, i) => (
              <li key={i}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="button-row">
        <button className="button secondary" onClick={onClose}>
          Back to editing
        </button>
        <button
          className="button"
          disabled={!canSubmit || !validation.success}
          onClick={onSubmit}
        >
          Submit for review
        </button>
      </div>
    </dialog>
  );
}
