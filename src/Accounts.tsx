import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import {
  accountsEnabled,
  configured,
  db,
  managedListings,
  rpc,
  saveListing,
  type Account,
} from "./api";
import {
  emptyListing,
  friendlyStatus,
  listingSchema,
  listingTypes,
  type ListingData,
  type ManagedListing,
} from "./domain";
import { AccountLink, Message, useApp } from "./App";
import { ImageManager } from "./Images";
export function AuthPage() {
  const { auth } = useApp();
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") || "login";
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const navigate = useNavigate();
  if (!configured || !accountsEnabled)
    return (
      <section className="container page narrow">
        <span className="eyebrow">ORGANISATION ACCOUNTS</span>
        <h1>A home for your organisation.</h1>
        <Message>
          {!configured
            ? "Live accounts are not connected in this demonstration."
            : "Account forms are not enabled on this public website."}
        </Message>
        <p>
          No registration information is collected here.{" "}
          {import.meta.env.VITE_ACCOUNT_PORTAL_URL
            ? "Use the secure organisation portal to sign in."
            : "BBCN must configure its secure account portal, email verification and privacy contact before registrations open."}
        </p>
        {import.meta.env.VITE_ACCOUNT_PORTAL_URL && (
          <AccountLink>
            Open organisation portal <ArrowUpRight size={16} />
          </AccountLink>
        )}
        <Link className="arrow-link" to="/find">
          Explore the directory <ArrowRight size={16} />
        </Link>
      </section>
    );
  if (auth.session)
    return (
      <section className="container page narrow">
        <h1>You’re signed in.</h1>
        <Link className="button" to="/dashboard">
          Open your dashboard <ArrowRight size={18} />
        </Link>
      </section>
    );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!db) return;
    const f = new FormData(e.currentTarget),
      email = String(f.get("email"));
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "register") {
        const { error } = await db.auth.signUp({
          email,
          password: String(f.get("password")),
          options: {
            emailRedirectTo: new URL(
              `${import.meta.env.BASE_URL}dashboard`,
              location.origin,
            ).href,
            data: {
              organisation_name: f.get("organisation"),
              contact_name: f.get("contact"),
              phone: f.get("phone"),
            },
          },
        });
        if (error) throw error;
        setMessage(
          "Check your email to verify your account before signing in. If an account already exists, use sign in or reset your password.",
        );
      } else if (mode === "reset") {
        const { error } = await db.auth.resetPasswordForEmail(email, {
          redirectTo: new URL(
            `${import.meta.env.BASE_URL}reset`,
            location.origin,
          ).href,
        });
        if (error) throw error;
        setMessage(
          "If an account exists for this email, you’ll receive a password reset link.",
        );
      } else {
        const { error } = await db.auth.signInWithPassword({
          email,
          password: String(f.get("password")),
        });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function switchMode(value: string) {
    setError("");
    setMessage("");
    setParams({ mode: value });
  }
  return (
    <section className="container page auth-layout">
      <div>
        <span className="eyebrow">ONE ACCOUNT. MANY CONNECTIONS.</span>
        <h1>
          {mode === "register"
            ? "Let your community find you."
            : mode === "reset"
              ? "A fresh start."
              : "Welcome back."}
        </h1>
        <p className="lead">
          Manage your organisation, programmes and spaces in one place.
        </p>
        <div className="auth-benefits">
          <p>
            <Check /> Free to join. Local by nature.
          </p>
          <p>
            <Check /> Private registration information.
          </p>
          <p>
            <Check /> BBCN review before publication.
          </p>
        </div>
      </div>
      <div className="form-card">
        <h2>
          {mode === "register"
            ? "Create your account"
            : mode === "reset"
              ? "Reset your password"
              : "Organisation sign in"}
        </h2>
        {error && <Message error>{error}</Message>}
        {message && <Message>{message}</Message>}
        <form onSubmit={submit} className="stack-form">
          {mode === "register" && (
            <>
              <label>
                Organisation name
                <input
                  name="organisation"
                  required
                  minLength={3}
                  maxLength={150}
                  autoComplete="organization"
                />
              </label>
              <label>
                Your contact name <small>Private</small>
                <input
                  name="contact"
                  required
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
              <label>
                Contact phone <small>Private</small>
                <input
                  name="phone"
                  type="tel"
                  required
                  maxLength={80}
                  autoComplete="tel"
                />
              </label>
            </>
          )}
          <label>
            Email address {mode === "register" && <small>Private</small>}
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
            />
          </label>
          {mode !== "reset" && (
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
              />
              {mode === "register" && (
                <small>At least 12 characters. Use a unique password.</small>
              )}
            </label>
          )}
          {mode === "register" && (
            <label className="check-label">
              <input type="checkbox" required />I have permission to represent
              this organisation and have read the{" "}
              <Link to="/privacy">privacy information</Link>.
            </label>
          )}
          <button className="button" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "register"
                ? "Create account"
                : mode === "reset"
                  ? "Send reset link"
                  : "Sign in"}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className="auth-switch">
          {mode === "login" ? (
            <>
              <button
                className="text-button"
                onClick={() => switchMode("reset")}
              >
                Forgot your password?
              </button>
              <p>
                New here?{" "}
                <button
                  className="text-button"
                  onClick={() => switchMode("register")}
                >
                  Create an organisation account
                </button>
              </p>
            </>
          ) : (
            <button className="text-button" onClick={() => switchMode("login")}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
export function ResetPassword() {
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (!configured || !accountsEnabled) return <AuthPage />;
  return (
    <section className="container page narrow">
      <h1>Choose a new password</h1>
      {message && <Message>{message}</Message>}
      {error && <Message error>{error}</Message>}
      <form
        className="form-card stack-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!db) return;
          setBusy(true);
          setError("");
          const password = String(
            new FormData(e.currentTarget).get("password"),
          );
          const { error } = await db.auth.updateUser({ password });
          error
            ? setError(error.message)
            : setMessage("Password updated. You can return to your dashboard.");
          setBusy(false);
        }}
      >
        <label>
          New password
          <input
            name="password"
            type="password"
            minLength={12}
            required
            autoComplete="new-password"
          />
        </label>
        <button className="button" disabled={busy}>
          Update password
        </button>
        <Link to="/dashboard">Back to dashboard</Link>
      </form>
    </section>
  );
}
export function Dashboard() {
  const { auth, refreshAuth, refreshListings } = useApp();
  const [items, setItems] = useState<ManagedListing[]>([]),
    [selected, setSelected] = useState<ManagedListing | "new" | null>(null),
    [tab, setTab] = useState("listings"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  async function refresh() {
    try {
      setItems(await managedListings());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (auth.session) void refresh();
  }, [auth.session?.user.id]);
  if (!configured || !accountsEnabled || !auth.session) return <AuthPage />;
  async function logout() {
    await db?.auth.signOut();
    await refreshAuth();
  }
  return (
    <section className="container page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR COMMUNITY STARTS HERE</span>
          <h1>{auth.account?.name || "Your organisation"}</h1>
          <p>One account. A place for everything you do.</p>
        </div>
        <button
          className="button secondary small"
          onClick={() => void logout()}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
      {auth.account?.suspended && (
        <Message error>
          Your organisation is suspended. Contact BBCN to resolve this before
          submitting changes.
        </Message>
      )}
      {error && <Message error>{error}</Message>}
      <div className="dashboard-tabs">
        <button
          className={tab === "listings" ? "active" : ""}
          onClick={() => {
            setTab("listings");
            setSelected(null);
          }}
        >
          <LayoutDashboard size={17} />
          Your listings
        </button>
        <button
          className={tab === "settings" ? "active" : ""}
          onClick={() => {
            setTab("settings");
            setSelected(null);
          }}
        >
          <Settings size={17} />
          Account settings
        </button>
        {auth.admin && (
          <Link to="/admin">
            <ShieldCheck size={17} />
            BBCN administration
          </Link>
        )}
      </div>
      {tab === "settings" ? (
        <AccountSettings account={auth.account} />
      ) : selected ? (
        <ListingEditor
          item={selected === "new" ? undefined : selected}
          onCancel={() => setSelected(null)}
          onSaved={async (id) => {
            await refresh();
            await refreshListings();
            const rows = await managedListings();
            setSelected(rows.find((i) => i.id === id) || null);
          }}
        />
      ) : (
        <>
          <div className="stats-grid">
            <Stat label="Your listings" value={items.length} />
            <Stat
              label="Published"
              value={items.filter((i) => i.published).length}
            />
            <Stat
              label="Awaiting review"
              value={items.filter((i) => i.status === "pending_review").length}
            />
            <Stat
              label="Drafts & changes"
              value={
                items.filter((i) =>
                  ["draft", "changes_requested", "rejected"].includes(i.status),
                ).length
              }
            />
          </div>
          <div className="section-heading">
            <h2>Your listings</h2>
            <button
              className="button"
              onClick={() => setSelected("new")}
              disabled={!auth.account || auth.account.suspended}
            >
              <FilePlus2 size={17} />
              Create a listing
            </button>
          </div>
          {loading ? (
            <p role="status">Loading your listings…</p>
          ) : !items.length ? (
            <div className="empty">
              <Users size={34} />
              <h3>Let’s introduce you.</h3>
              <p>
                Add your organisation, a programme, a service or a venue. You
                can save a draft before submitting.
              </p>
              <button className="button" onClick={() => setSelected("new")}>
                Create your first listing <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="managed-listings">
              {items.map((item) => (
                <article key={item.id}>
                  <div>
                    <span className={`status ${item.status}`}>
                      {friendlyStatus(item.status)}
                    </span>
                    {item.published && item.status !== "published" && (
                      <span className="published-label">
                        Approved version remains public
                      </span>
                    )}
                    <h3>{item.proposed.name || "Untitled listing"}</h3>
                    <p>
                      {item.proposed.type} · {item.proposed.suburb}
                    </p>
                    {item.review_note && (
                      <p className="review-note">BBCN: {item.review_note}</p>
                    )}
                  </div>
                  <div className="button-row">
                    {item.published && (
                      <Link className="text-button" to={`/listing/${item.id}`}>
                        View public listing <ArrowUpRight size={15} />
                      </Link>
                    )}
                    <button
                      className="button secondary small"
                      onClick={() => setSelected(item)}
                    >
                      {item.status === "pending_review"
                        ? "View submission"
                        : "Manage listing"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
export function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
export function ListingEditor({
  item,
  onSaved,
  onCancel,
  admin = false,
}: {
  item?: ManagedListing;
  onSaved: (id: string) => void;
  onCancel: () => void;
  admin?: boolean;
}) {
  const { categories, locations } = useApp();
  const [data, setData] = useState<ListingData>({
      ...emptyListing,
      ...item?.proposed,
    }),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const locked = item?.status === "pending_review" && !admin;
  useEffect(() => {
    setData({ ...emptyListing, ...item?.proposed });
  }, [item?.id, item?.status]);
  function field<K extends keyof ListingData>(name: K, value: ListingData[K]) {
    setData((d) => ({ ...d, [name]: value }));
  }
  async function save(submit: boolean) {
    setError("");
    setMessage("");
    const parsed = listingSchema.safeParse(data);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(" "),
      );
      return;
    }
    setBusy(true);
    try {
      const id = await saveListing(item?.id || null, parsed.data, submit);
      onSaved(id);
      setMessage(
        submit
          ? "Submitted to BBCN for review. Your current approved content is unchanged."
          : "Draft saved.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const input = (
    name: keyof ListingData,
    label: string,
    opts: { area?: boolean; type?: string; help?: string } = {},
  ) => (
    <label>
      {label}
      {opts.area ? (
        <textarea
          rows={name === "description" ? 6 : 3}
          value={String(data[name])}
          onChange={(e) => field(name, e.target.value as never)}
        />
      ) : (
        <input
          type={opts.type || "text"}
          value={String(data[name])}
          onChange={(e) =>
            field(
              name,
              (opts.type === "number"
                ? Number(e.target.value)
                : e.target.value) as never,
            )
          }
        />
      )}{" "}
      {opts.help && <small>{opts.help}</small>}
    </label>
  );
  return (
    <div>
      <button className="text-button back-link" onClick={onCancel}>
        ← Back to listings
      </button>
      <div className="section-heading">
        <div>
          <h2>{item ? "Manage your listing" : "Create a listing"}</h2>
          <p>
            Tell your community what you do. Public contact details are optional
            and separate from your private registration.
          </p>
        </div>
        {item && (
          <span className={`status ${item.status}`}>
            {friendlyStatus(item.status)}
          </span>
        )}
      </div>
      {error && <Message error>{error}</Message>}
      {message && <Message>{message}</Message>}
      {item?.review_note && <Message>BBCN: {item.review_note}</Message>}
      {locked && (
        <Message>
          Your submission is being reviewed. You can manage images below;
          listing changes are locked until BBCN responds.
        </Message>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save(true);
        }}
      >
        <fieldset disabled={busy || locked} className="listing-form">
          <section className="form-section">
            <h3>The basics</h3>
            <div className="form-grid">
              <label>
                Listing type
                <select
                  value={data.type}
                  onChange={(e) =>
                    field("type", e.target.value as ListingData["type"])
                  }
                >
                  {listingTypes.map((t) => (
                    <option key={t} value={t}>
                      {t === "venue"
                        ? "Venue for hire"
                        : t[0].toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              {input("name", "Listing name")}
            </div>
            {input("summary", "Short introduction (10–220 characters)")}
            {input("description", "Full description", { area: true })}
            <fieldset>
              <legend>
                Categories <small>Select up to 10</small>
              </legend>
              <div className="category-checks">
                {categories.map((c) => (
                  <label key={c} className="check-label">
                    <input
                      type="checkbox"
                      checked={data.categories.includes(c)}
                      onChange={(e) =>
                        field(
                          "categories",
                          e.target.checked
                            ? [...data.categories, c]
                            : data.categories.filter((v) => v !== c),
                        )
                      }
                    />
                    {c}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>
          <section className="form-section">
            <h3>Where & when</h3>
            <div className="form-grid">
              <label>
                Neighbourhood
                <select
                  value={data.suburb}
                  onChange={(e) => field("suburb", e.target.value)}
                >
                  {[...new Set([...locations, data.suburb])].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              {input("address", "Public address")}
            </div>
            {input("times", "Opening hours or meeting times", { area: true })}
            <div className="form-grid">
              {input("ageGroups", "Age groups catered for")}
              {input("cost", "Cost or membership information")}
            </div>
            {input("accessibility", "Accessibility information", {
              area: true,
            })}
          </section>
          <section className="form-section">
            <h3>Public contact details</h3>
            <Message>
              Only enter contact information you want visitors to see. Your
              registration details are never copied here.
            </Message>
            <div className="form-grid">
              {input("website", "Website", { type: "url" })}
              {input("publicEmail", "Public email (optional)", {
                type: "email",
              })}
              {input("publicPhone", "Public phone (optional)", { type: "tel" })}
              {input("publicContact", "Public contact name (optional)")}
            </div>
            {input("socialLinks", "Social media links", {
              area: true,
              help: "One full https:// address per line.",
            })}
          </section>
          {data.type === "venue" && (
            <section className="form-section">
              <h3>Your venue</h3>
              <div className="form-grid">
                {input("capacity", "Maximum capacity", { type: "number" })}
                {input("roomType", "Room / facility type")}
                {input(
                  "price",
                  "Indicative hourly price ($, 0 if not supplied)",
                  { type: "number" },
                )}
                {input("bookingUrl", "Booking information link", {
                  type: "url",
                })}
              </div>
              <div className="category-checks">
                {(
                  [
                    ["kitchen", "Kitchen"],
                    ["accessible", "Accessible"],
                    ["outdoor", "Outdoor space"],
                    ["wifi", "Wi-Fi"],
                    ["parking", "Parking"],
                    ["av", "Audio/visual equipment"],
                    ["toilets", "Toilets"],
                  ] as const
                ).map(([k, label]) => (
                  <label className="check-label" key={k}>
                    <input
                      type="checkbox"
                      checked={data[k]}
                      onChange={(e) => field(k, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {input("spaces", "Rooms, capacities & seating layouts", {
                area: true,
                help: "One room per line, including its capacity and layout options.",
              })}
              {input("facilities", "Facilities & equipment", { area: true })}
              {input("suitableFor", "Suitable activities & functions", {
                area: true,
              })}
              {input("availability", "Availability information", {
                area: true,
              })}
            </section>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => void save(false)}
            >
              <Save size={17} />
              Save draft
            </button>
            <button type="submit" className="button">
              <Send size={17} />
              {busy ? "Saving…" : "Submit for review"}
            </button>
          </div>
        </fieldset>
      </form>
      {item ? (
        <ImageManager listingId={item.id} admin={false} />
      ) : (
        <Message>
          Save your listing first, then add its logo, primary image and gallery.
        </Message>
      )}
    </div>
  );
}
function AccountSettings({ account }: { account: Account | null }) {
  const { refreshAuth } = useApp();
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (!account)
    return (
      <Message>
        Your account information is loading. Try refreshing if it does not
        appear.
      </Message>
    );
  async function action(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    try {
      await fn();
      setMessage(success);
      await refreshAuth();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-layout">
      <section className="form-card">
        <h2>Private account details</h2>
        <p>
          Visible only to your organisation and authorised BBCN administrators.
        </p>
        {message && <Message>{message}</Message>}
        {error && <Message error>{error}</Message>}
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void action(
              () =>
                rpc("update_account", {
                  account_name: f.get("name"),
                  contact_name: f.get("contact"),
                  contact_phone: f.get("phone"),
                }),
              "Account details updated.",
            );
          }}
        >
          <label>
            Organisation name
            <input
              name="name"
              defaultValue={account.name}
              minLength={3}
              maxLength={150}
              required
            />
          </label>
          <label>
            Contact name
            <input
              name="contact"
              defaultValue={account.contact_name}
              required
              maxLength={100}
            />
          </label>
          <label>
            Contact phone
            <input
              name="phone"
              defaultValue={account.phone}
              required
              maxLength={80}
            />
          </label>
          <label>
            Registration email
            <input value={account.email} readOnly />
          </label>
          <button className="button" disabled={busy}>
            Save account details
          </button>
        </form>
      </section>
      <section className="form-card">
        <h2>Security & your data</h2>
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            const password = String(
              new FormData(e.currentTarget).get("password"),
            );
            void action(async () => {
              const { error } = await db!.auth.updateUser({ password });
              if (error) throw error;
            }, "Password updated.");
          }}
        >
          <label>
            New password
            <input
              name="password"
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
            />
          </label>
          <button className="button secondary" disabled={busy}>
            Update password
          </button>
        </form>
        <hr />
        <h3>Change your email</h3>
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            const email = String(new FormData(e.currentTarget).get("newEmail"));
            void action(async () => {
              const { error } = await db!.auth.updateUser({ email });
              if (error) throw error;
            }, "Check your old and new email addresses to confirm the change.");
          }}
        >
          <label>
            New registration email
            <input
              name="newEmail"
              type="email"
              maxLength={254}
              required
              autoComplete="email"
            />
          </label>
          <button className="button secondary" disabled={busy}>
            Request email change
          </button>
        </form>
        <hr />
        <h3>Export your information</h3>
        <p>
          Download your account, listings and image records. Image files must be
          downloaded separately.
        </p>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() =>
            void action(async () => {
              const records = await rpc("export_account");
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(records, null, 2)], {
                  type: "application/json",
                }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "bbfind-account-export.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }, "Export downloaded. Keep it private. The image records identify your files; contact BBCN for a complete file export.")
          }
        >
          Export account data
        </button>
        <hr />
        <h3>Request account deletion</h3>
        <p>
          BBCN will review your request and contact you. It does not
          automatically delete your account or public listings.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void action(
              () => rpc("request_deletion"),
              "Your account deletion request has been sent to BBCN.",
            );
          }}
        >
          <label className="check-label">
            <input type="checkbox" required />I want BBCN to delete my
            organisation account.
          </label>
          <button className="button danger" disabled={busy}>
            Request deletion
          </button>
        </form>
      </section>
    </div>
  );
}
