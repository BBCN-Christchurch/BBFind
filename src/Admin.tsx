import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ImagePlus, ShieldCheck } from "lucide-react";
import { configured, db, managedListings, rpc, type Account } from "./api";
import { friendlyStatus, listingTypes, type ManagedListing } from "./domain";
import { Message, useApp } from "./App";
import { ListingEditor, Stat } from "./Accounts";
import { ImageManager } from "./Images";
import { useUnsaved } from "./Unsaved";
export function Admin() {
  const { auth, refreshListings } = useApp();
  const { request } = useUnsaved();
  const [filterType, setFilterType] = useState(""),
    [filterOrg, setFilterOrg] = useState(""),
    [reviewKind, setReviewKind] = useState("");
  const [items, setItems] = useState<ManagedListing[]>([]),
    [orgs, setOrgs] = useState<
      (Account & { deletion_requested_at: string | null })[]
    >([]),
    [selected, setSelected] = useState<ManagedListing | null>(null),
    [tab, setTab] = useState("queue"),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState(false),
    [pendingImages, setPendingImages] = useState<
      {
        listing_id: string;
        created_at?: string;
        review_requested_at?: string;
      }[]
    >([]);
  async function refresh() {
    if (!db) return;
    setItems(await managedListings(true));
    const { data, error } = await db
      .from("organisations")
      .select("*")
      .order("name");
    if (error) throw error;
    setOrgs(data || []);
    const imgs = await db
      .from("listing_images")
      .select("listing_id,review_requested_at,created_at")
      .eq("status", "pending_review");
    if (imgs.error) throw imgs.error;
    setPendingImages(imgs.data || []);
  }
  useEffect(() => {
    if (auth.admin) void refresh().catch((e) => setError(e.message));
  }, [auth.admin]);
  if (!configured || !auth.session)
    return (
      <section className="container page narrow">
        <h1>BBCN administration</h1>
        <p>Sign in with an authorised BBCN administrator account.</p>
        <Link className="button" to="/account">
          Sign in
        </Link>
      </section>
    );
  if (!auth.admin)
    return (
      <section className="container page narrow">
        <h1>Administrator access required</h1>
        <Message error>
          Your account does not have BBCN administrator permissions.
        </Message>
        <Link to="/dashboard">Back to your dashboard</Link>
      </section>
    );
  async function action(fn: () => Promise<unknown>, success = "Saved.") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      await refresh();
      await refreshListings();
      setMessage(success);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function review(decision: string) {
    if (!selected) return;
    const saved = await action(
      () =>
        rpc("review_listing", {
          listing_id: selected.id,
          decision,
          note,
          expected_content: selected.proposed,
        }),
      "Review saved.",
    );
    if (saved) {
      setSelected(null);
      setNote("");
    }
  }
  const queueTime = (item: ManagedListing) => {
    const times = [
      ...(item.status === "pending_review" ? [item.updated_at || ""] : []),
      ...pendingImages
        .filter((i) => i.listing_id === item.id)
        .map(
          (i) => i.review_requested_at || i.created_at || item.updated_at || "",
        ),
    ].filter(Boolean);
    return times.sort()[0] || item.updated_at || "9999";
  };
  const displayed = items
    .filter(
      (i) =>
        (tab !== "queue" ||
          i.status === "pending_review" ||
          pendingImages.some((im) => im.listing_id === i.id)) &&
        (!filterType || i.proposed.type === filterType) &&
        (!filterOrg || i.organisation_id === filterOrg) &&
        (!reviewKind ||
          (reviewKind === "text"
            ? i.status === "pending_review"
            : pendingImages.some((im) => im.listing_id === i.id))),
    )
    .sort((a, b) =>
      tab === "queue"
        ? queueTime(a).localeCompare(queueTime(b)) || a.id.localeCompare(b.id)
        : (b.updated_at || "").localeCompare(a.updated_at || ""),
    );
  return (
    <section className="container page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">
            <ShieldCheck size={16} /> BBCN ADMINISTRATION
          </span>
          <h1>A well-connected community.</h1>
          <p>
            Review submissions, support organisations and keep the directory
            useful.
          </p>
        </div>
        <Link className="button secondary small" to="/dashboard">
          Your dashboard
        </Link>
      </div>
      {error && <Message error>{error}</Message>}
      {message && <Message>{message}</Message>}
      <div className="stats-grid">
        <Stat label="Organisations" value={orgs.length} />
        <Stat
          label="Public listings"
          value={
            items.filter(
              (i) =>
                i.published && !["suspended", "archived"].includes(i.status),
            ).length
          }
        />
        <Stat
          label="Pending listings"
          value={items.filter((i) => i.status === "pending_review").length}
        />
        <Stat label="Pending images" value={pendingImages.length} />
        <Stat
          label="Venues"
          value={items.filter((i) => i.proposed.type === "venue").length}
        />
        <Stat
          label="Suspended / archived"
          value={
            items.filter((i) => ["suspended", "archived"].includes(i.status))
              .length
          }
        />
      </div>
      <div className="dashboard-tabs">
        {[
          ["queue", "Review queue"],
          ["all", "All listings"],
          ["organisations", "Organisations"],
          ["taxonomy", "Categories & locations"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() =>
              request(() => {
                setTab(key);
                setSelected(null);
                setEdit(false);
              })
            }
          >
            {label}
          </button>
        ))}
      </div>
      {selected ? (
        <>
          <button
            className="text-button back-link"
            onClick={() => {
              setSelected(null);
              setEdit(false);
            }}
          >
            <ArrowLeft size={15} /> Back to listings
          </button>
          {edit ? (
            <ListingEditor
              item={selected}
              admin
              onCancel={() => setEdit(false)}
              onSaved={async (id) => {
                await refresh();
                const updated = (await managedListings(true)).find(
                  (i) => i.id === id,
                );
                if (updated) setSelected(updated);
                setEdit(false);
              }}
            />
          ) : (
            <>
              <div className="section-heading">
                <h2>{selected.proposed.name}</h2>
                <span className={`status ${selected.status}`}>
                  {friendlyStatus(selected.status)}
                </span>
              </div>
              {selected.published && (
                <p className="change-explanation">
                  Highlighted fields show changes from the current public
                  listing. This comparison uses only the current and proposed
                  content.
                </p>
              )}
              <div className="review-columns">
                {selected.published && (
                  <section className="form-card">
                    <span className="eyebrow">CURRENT PUBLIC CONTENT</span>
                    <ListingReview data={selected.published} />
                  </section>
                )}
                <section className="form-card">
                  <span className="eyebrow">PROPOSED CONTENT</span>
                  <ListingReview
                    data={selected.proposed}
                    previous={selected.published}
                  />
                </section>
              </div>
              <div className="review-actions">
                <label>
                  Private review note
                  <textarea
                    value={note}
                    maxLength={1000}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Explain changes needed or the reason for rejection."
                  />
                </label>
                <div className="button-row">
                  <button
                    className="button"
                    disabled={busy || selected.status !== "pending_review"}
                    onClick={() => void review("approve")}
                  >
                    <CheckCircle2 size={17} />
                    Approve listing
                  </button>
                  <button
                    className="button secondary"
                    disabled={
                      busy ||
                      selected.status !== "pending_review" ||
                      !note.trim()
                    }
                    onClick={() => void review("changes_requested")}
                  >
                    Request changes
                  </button>
                  <button
                    className="button danger"
                    disabled={
                      busy ||
                      selected.status !== "pending_review" ||
                      !note.trim()
                    }
                    onClick={() => void review("reject")}
                  >
                    Reject submission
                  </button>
                  <button className="text-button" onClick={() => setEdit(true)}>
                    Edit listing
                  </button>
                </div>
                <p className="help">
                  Approving this listing does not approve its images. Review
                  each image below.
                </p>
              </div>
              <ImageManager
                listingId={selected.id}
                admin
                onChange={() => void refresh()}
              />
            </>
          )}
        </>
      ) : tab === "taxonomy" ? (
        <Taxonomy onError={setError} />
      ) : tab === "organisations" ? (
        <div className="managed-listings">
          {orgs.map((o) => (
            <article key={o.id}>
              <div>
                <h3>{o.name}</h3>
                <p>
                  Private contact: {o.contact_name} · {o.email} · {o.phone}
                </p>
                <p>
                  {items.filter((i) => i.organisation_id === o.id).length}{" "}
                  listings {o.suspended && "· Suspended"}
                </p>
                {o.deletion_requested_at && (
                  <Message>
                    Deletion requested{" "}
                    {new Date(o.deletion_requested_at).toLocaleDateString(
                      "en-NZ",
                    )}
                  </Message>
                )}
                <div className="button-row">
                  {items
                    .filter((i) => i.organisation_id === o.id)
                    .map((i) => (
                      <button
                        key={i.id}
                        className="text-button"
                        onClick={() => setSelected(i)}
                      >
                        {i.proposed.name}
                      </button>
                    ))}
                </div>
              </div>
              <div className="button-row">
                <button
                  className="button secondary small"
                  disabled={busy}
                  onClick={() =>
                    void action(() =>
                      rpc("set_organisation_suspended", {
                        organisation_id: o.id,
                        suspend: !o.suspended,
                      }),
                    )
                  }
                >
                  {o.suspended
                    ? "Restore organisation"
                    : "Suspend organisation"}
                </button>
                {o.deletion_requested_at && (
                  <button
                    className="button danger small"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Permanently delete ${o.name}, its listings and account? This cannot be undone. Image files must be cleaned up using the documented procedure.`,
                        )
                      )
                        void action(
                          () =>
                            rpc("admin_delete_account", {
                              organisation_id: o.id,
                            }),
                          "Account deleted. Run storage cleanup to remove unreferenced files.",
                        );
                    }}
                  >
                    Delete requested account
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="managed-listings">
          <div className="admin-queue-filters form-grid">
            <label>
              Listing type
              <select
                aria-label="Filter listing type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All listing types</option>
                {listingTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Organisation
              <select
                aria-label="Filter organisation"
                value={filterOrg}
                onChange={(e) => setFilterOrg(e.target.value)}
              >
                <option value="">All organisations</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Review needed
              <select
                aria-label="Filter review needed"
                value={reviewKind}
                onChange={(e) => setReviewKind(e.target.value)}
              >
                <option value="">Text or photos</option>
                <option value="text">Listing text</option>
                <option value="images">Photos</option>
              </select>
            </label>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setFilterType("");
                setFilterOrg("");
                setReviewKind("");
              }}
            >
              Clear review filters
            </button>
          </div>
          <p role="status">
            {displayed.length} listings shown
            {tab === "queue" ? " · Oldest outstanding first" : ""}.
          </p>
          {!displayed.length && (
            <div className="empty">
              <CheckCircle2 size={34} />
              <h3>All caught up.</h3>
              <p>New listing and image submissions will appear here.</p>
            </div>
          )}
          {displayed.map((item) => (
            <article key={item.id}>
              <div>
                <span className={`status ${item.status}`}>
                  {friendlyStatus(item.status)}
                </span>
                <h3>{item.proposed.name}</h3>
                <p>
                  {orgs.find((o) => o.id === item.organisation_id)?.name} ·{" "}
                  {item.proposed.type} · {item.proposed.suburb}
                </p>
                {pendingImages.some((im) => im.listing_id === item.id) && (
                  <span className="status pending_review">
                    <ImagePlus size={13} /> Images awaiting review
                  </span>
                )}
              </div>
              <div className="admin-listing-actions">
                <button
                  className="button small"
                  onClick={() => {
                    setSelected(item);
                    setNote("");
                  }}
                >
                  Review listing & images
                </button>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={item.featured}
                    disabled={busy}
                    onChange={(e) =>
                      void action(() =>
                        rpc("set_listing_flags", {
                          listing_id: item.id,
                          feature: e.target.checked,
                          verify: item.verified,
                        }),
                      )
                    }
                  />
                  Featured
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={item.verified}
                    disabled={busy}
                    onChange={(e) =>
                      void action(() =>
                        rpc("set_listing_flags", {
                          listing_id: item.id,
                          feature: item.featured,
                          verify: e.target.checked,
                        }),
                      )
                    }
                  />
                  Verified
                </label>
                <div className="button-row">
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      void action(() =>
                        rpc("set_listing_state", {
                          listing_id: item.id,
                          new_state: ["archived", "suspended"].includes(
                            item.status,
                          )
                            ? "restore"
                            : "archive",
                        }),
                      )
                    }
                  >
                    {["archived", "suspended"].includes(item.status)
                      ? "Restore"
                      : "Archive"}
                  </button>
                  <button
                    className="text-button"
                    disabled={busy || !item.published}
                    onClick={() =>
                      void action(() =>
                        rpc("set_listing_state", {
                          listing_id: item.id,
                          new_state: "unpublish",
                        }),
                      )
                    }
                  >
                    Unpublish
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Permanently delete this listing and its image records?",
                        )
                      )
                        void action(() =>
                          rpc("delete_listing", { listing_id: item.id }),
                        );
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
function ListingReview({
  data,
  previous,
}: {
  data: Record<string, unknown>;
  previous?: Record<string, unknown> | null;
}) {
  const display = (value: unknown) =>
    Array.isArray(value)
      ? value.join(", ") || "Not supplied"
      : value === false
        ? "No"
        : value === "" || value === null || value === undefined
          ? "Not supplied"
          : String(value);
  return (
    <dl className="review-data">
      {Object.entries(data)
        .filter(
          ([key, v]) =>
            (previous && JSON.stringify(previous[key]) !== JSON.stringify(v)) ||
            (v !== "" &&
              v !== 0 &&
              v !== false &&
              (!Array.isArray(v) || v.length)),
        )
        .map(([key, value]) => {
          const changed = Boolean(
            previous && JSON.stringify(previous[key]) !== JSON.stringify(value),
          );
          return (
            <div key={key} className={changed ? "changed-field" : ""}>
              <dt>
                {key.replace(/([A-Z])/g, " $1")}
                {changed && <span className="change-label">Changed</span>}
              </dt>
              <dd>
                {display(value)}
                {changed && (
                  <small className="previous-value">
                    Previously: {display(previous?.[key])}
                  </small>
                )}
              </dd>
            </div>
          );
        })}
    </dl>
  );
}
function Taxonomy({ onError }: { onError: (s: string) => void }) {
  const { refreshTaxonomy, refreshListings } = useApp();
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState("categories"),
    [rows, setRows] = useState<
      { id: string; name: string; active: boolean; parent_id: string | null }[]
    >([]),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState<string | null>(null),
    [name, setName] = useState(""),
    [parent, setParent] = useState("");
  async function refresh() {
    if (!db) return;
    const { data, error } = await db.from(kind).select("*").order("name");
    if (error) throw error;
    setRows(data || []);
  }
  useEffect(() => {
    void refresh().catch((e) => onError(e.message));
    setEdit(null);
    setName("");
    setParent("");
    setMessage("");
  }, [kind]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    onError("");
    setMessage("");
    try {
      await rpc("manage_taxonomy", {
        table_name: kind,
        record_id: edit,
        record_name: name.trim(),
        is_active: edit
          ? (rows.find((r) => r.id === edit)?.active ?? true)
          : true,
        parent_id: parent || null,
      });
      setName("");
      setParent("");
      setEdit(null);
      await refresh();
      await refreshTaxonomy();
      await refreshListings();
      setMessage(
        "Saved. Directory filters and existing listings are up to date.",
      );
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="form-card">
      <div className="button-row">
        <button
          className={`button ${kind === "categories" ? "" : "secondary"}`}
          disabled={busy}
          onClick={() => setKind("categories")}
        >
          Categories
        </button>
        <button
          className={`button ${kind === "locations" ? "" : "secondary"}`}
          disabled={busy}
          onClick={() => setKind("locations")}
        >
          Locations
        </button>
      </div>
      <h2>Manage {kind}</h2>
      {message && <Message>{message}</Message>}
      <p>
        Renaming a term updates its existing listings. Inactive terms stay
        attached to existing records, but are unavailable for new selections.
      </p>
      <form className="inline-form" onSubmit={save}>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={150}
            required
          />
        </label>
        {kind === "categories" && (
          <label>
            Parent category
            <select value={parent} onChange={(e) => setParent(e.target.value)}>
              <option value="">Top-level category</option>
              {rows
                .filter((r) => r.id !== edit && r.active)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <button className="button" disabled={busy}>
          {edit ? "Save changes" : "Add"}
        </button>
        {edit && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setEdit(null);
              setName("");
              setParent("");
            }}
          >
            Cancel edit
          </button>
        )}
      </form>
      <ul className="taxonomy-list">
        {rows.map((r) => (
          <li key={r.id}>
            <span>
              {r.name}
              {!r.active && " (inactive)"}
            </span>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setEdit(r.id);
                setName(r.name);
                setParent(r.parent_id || "");
              }}
            >
              Edit
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                onError("");
                try {
                  await rpc("manage_taxonomy", {
                    table_name: kind,
                    record_id: r.id,
                    record_name: r.name,
                    is_active: !r.active,
                    parent_id: r.parent_id,
                  });
                  await refresh();
                  await refreshTaxonomy();
                  await refreshListings();
                } catch (e) {
                  onError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {r.active ? "Deactivate" : "Activate"}
            </button>
          </li>
        ))}
      </ul>
      <Message>
        Changes update the directory immediately. Renaming preserves listing
        associations; deactivating hides a term from new selections while
        keeping it on existing listings. Categories cannot be permanently
        deleted here.
      </Message>
    </div>
  );
}
