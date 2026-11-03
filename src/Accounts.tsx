import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FilePlus2,
  Building2,
  CalendarDays,
  Gift,
  LayoutDashboard,
  LogOut,
  MailCheck,
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
  isFreeListing,
  listingSchema,
  draftSchema,
  listingTypes,
  suitableAges,
  type ListingData,
  type ManagedListing,
} from "./domain";
import { AccountLink, Message, useApp } from "./App";
import { ImageManager } from "./Images";
import { ListingPreview } from "./ListingPreview";
import { useUnsaved } from "./Unsaved";
import { NeighbourhoodOptions, PriorityNeighbourhoods } from "./Neighbourhood";
type EmailSubmission = {
  kind: "registration" | "verification" | "reset";
  email: string;
};
function emailRedirect(path: "dashboard" | "reset") {
  return new URL(`${import.meta.env.BASE_URL}${path}`, location.origin).href;
}
function emailLinkProblem() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const query = new URLSearchParams(location.search);
  return [hash, query].some(
    (params) => params.has("error") || params.has("error_code"),
  )
    ? "This email link is invalid or has expired. Try signing in below. If your email is not confirmed, request a new verification email."
    : "";
}
function EmailSubmitted({
  submission,
  busy,
  cooldown,
  error,
  onResend,
  onSignIn,
}: {
  submission: EmailSubmission;
  busy: boolean;
  cooldown: number;
  error: string;
  onResend: () => void;
  onSignIn: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const reset = submission.kind === "reset";
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section className="container page email-submitted">
      <div className="form-card email-submitted-card">
        <span className="email-submitted-icon" aria-hidden="true">
          <MailCheck size={32} />
        </span>
        <span className="eyebrow">
          {reset ? "PASSWORD RESET REQUESTED" : "ONE MORE STEP TO GET STARTED"}
        </span>
        <h1 ref={heading} tabIndex={-1}>
          Check your inbox.
        </h1>
        <p className="lead">
          {reset
            ? "Your password reset request has been submitted."
            : submission.kind === "registration"
              ? "Your registration request has been submitted."
              : "Your verification email request has been submitted."}
        </p>
        <p>
          {reset
            ? "If an account is associated with this email, we’ll send password reset instructions to"
            : "Check for an email from BBFind / BBCN at"}{" "}
          <strong className="email-submitted-address">
            {submission.email}
          </strong>
          .
        </p>
        <ol className="email-next-steps">
          <li>Open the latest email from BBFind / BBCN.</li>
          <li>
            {reset
              ? "Select Reset password and choose a new, unique password."
              : "Select Confirm email address to verify your account."}
          </li>
          <li>
            {reset
              ? "Return to your organisation dashboard."
              : "Sign in to start adding your organisation’s listings."}
          </li>
        </ol>
        <p className="email-delivery-help">
          Allow a few minutes and check your spam or junk folder. Use the newest
          email: links are time-limited and can only be used once.
          {!reset &&
            " If you already have an account, sign in or use Forgot your password."}
        </p>
        {error && <Message error>{error}</Message>}
        <div className="email-submitted-actions">
          <button className="button" onClick={onSignIn}>
            Back to sign in <ArrowRight size={17} />
          </button>
          <button
            className="text-button"
            onClick={onResend}
            disabled={busy || cooldown > 0}
          >
            {busy
              ? "Sending…"
              : cooldown > 0
                ? `Send again in ${cooldown}s`
                : "Send another email"}
          </button>
        </div>
        <p className="email-submitted-note">
          Your registration details are private. Listings and photographs are
          reviewed by BBCN before publication.
        </p>
      </div>
    </section>
  );
}
export function AuthPage() {
  const location = useLocation();
  const { auth } = useApp();
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") || "login";
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(emailLinkProblem),
    [submission, setSubmission] = useState<EmailSubmission | null>(null),
    [verificationEmail, setVerificationEmail] = useState(""),
    [resendAt, setResendAt] = useState(0),
    [now, setNow] = useState(Date.now);
  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => {
    if (!resendAt) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= resendAt) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);
  function startEmailCooldown() {
    const current = Date.now();
    setNow(current);
    setResendAt(current + 60_000);
  }
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
    const form = e.currentTarget,
      f = new FormData(form),
      email = String(f.get("email"));
    setBusy(true);
    setError("");
    setVerificationEmail("");
    try {
      if (mode === "register") {
        const { error } = await db.auth.signUp({
          email,
          password: String(f.get("password")),
          options: {
            emailRedirectTo: emailRedirect("dashboard"),
            data: {
              organisation_name: f.get("organisation"),
              contact_name: f.get("contact"),
              phone: f.get("phone"),
            },
          },
        });
        if (error) throw error;
        form.reset();
        setSubmission({ kind: "registration", email });
        startEmailCooldown();
      } else if (mode === "reset") {
        const { error } = await db.auth.resetPasswordForEmail(email, {
          redirectTo: emailRedirect("reset"),
        });
        if (error) throw error;
        form.reset();
        setSubmission({ kind: "reset", email });
        startEmailCooldown();
      } else {
        const { error } = await db.auth.signInWithPassword({
          email,
          password: String(f.get("password")),
        });
        if (error) throw error;
        navigate(
          /^\/dashboard\/new(?:\/(activity|event|venue|profile))?\/?$/.test(
            location.pathname,
          )
            ? location.pathname
            : "/dashboard",
        );
      }
    } catch (e) {
      if ((e as { code?: string }).code === "email_not_confirmed") {
        setVerificationEmail(email);
        setError(
          "Confirm your email address before signing in. Use the latest verification email or request a new one below.",
        );
      } else if ((e as { code?: string }).code === "signup_disabled") {
        setError("Registration is not open yet. Please try again later.");
      } else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function switchMode(value: string) {
    setError("");
    setSubmission(null);
    setVerificationEmail("");
    setParams({ mode: value });
  }
  async function sendAgain() {
    const email = submission?.email || verificationEmail;
    if (!db || !email || busy || cooldown > 0) return;
    setBusy(true);
    setError("");
    try {
      const { error } =
        submission?.kind === "reset"
          ? await db.auth.resetPasswordForEmail(email, {
              redirectTo: emailRedirect("reset"),
            })
          : await db.auth.resend({
              type: "signup",
              email,
              options: { emailRedirectTo: emailRedirect("dashboard") },
            });
      if (error) throw error;
      setSubmission({
        kind: submission?.kind === "reset" ? "reset" : "verification",
        email,
      });
      startEmailCooldown();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (submission)
    return (
      <EmailSubmitted
        submission={submission}
        busy={busy}
        cooldown={cooldown}
        error={error}
        onResend={() => void sendAgain()}
        onSignIn={() => switchMode("login")}
      />
    );
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
        {verificationEmail && (
          <p>
            <button
              className="text-button"
              disabled={busy || cooldown > 0}
              onClick={() => void sendAgain()}
            >
              {busy
                ? "Sending…"
                : cooldown > 0
                  ? `Send again in ${cooldown}s`
                  : "Send a new verification email"}
            </button>
          </p>
        )}
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

export function ListingChooser({ dashboard = false }: { dashboard?: boolean }) {
  return (
    <section
      className="listing-chooser"
      aria-labelledby="listing-choice-heading"
    >
      {dashboard && (
        <Link to="/dashboard" className="text-button">
          ← Back to your listings
        </Link>
      )}
      <span className="eyebrow">START WITH WHAT YOU WANT TO SHARE</span>
      <h2 id="listing-choice-heading">What would you like to list?</h2>
      <p>
        Choose one option. We’ll ask for the information that matters for your
        listing.
      </p>
      <div className="listing-choice-grid">
        {[
          {
            kind: "activity",
            label: "Find Me · Listed in Find It",
            name: "List an activity or programme",
            description:
              "Regular activities, programmes, organisations, services and local businesses.",
            Icon: Users,
          },
          {
            kind: "event",
            label: "Events",
            name: "List an event",
            description:
              "A dated gathering, celebration, workshop or special occasion.",
            Icon: CalendarDays,
          },
          {
            kind: "venue",
            label: "Venues for Hire",
            name: "List a facility or room for hire",
            description:
              "Rooms, halls and other spaces available for people to book.",
            Icon: Building2,
          },
        ].map(({ kind, label, name, description, Icon }) => (
          <AccountLink
            key={kind}
            path={`/dashboard/new/${kind}`}
            className={`listing-choice listing-theme-${kind} feature-theme feature-theme-${kind}`}
          >
            <span className="choice-icon">
              <Icon size={32} />
            </span>
            <span className="listing-family">{label}</span>
            <h3>{name}</h3>
            <p>{description}</p>
            <span className="choice-action">
              Create a listing <ArrowRight size={19} />
            </span>
          </AccountLink>
        ))}
      </div>
      <p>
        Listing your organisation itself?{" "}
        <AccountLink className="text-button" path="/dashboard/new/profile">
          List an organisation or business
        </AccountLink>
      </p>
      <p className="help">
        You can save a draft, add photos and submit for BBCN review. Nothing
        becomes public until approved.
      </p>
    </section>
  );
}
export function Dashboard() {
  const { request } = useUnsaved();
  const navigate = useNavigate();
  const location = useLocation();
  const creation =
    /^\/dashboard\/new(?:\/(activity|event|venue|profile))?\/?$/.exec(
      location.pathname,
    );
  const { auth, refreshAuth, refreshListings } = useApp();
  const [pendingPhotos, setPendingPhotos] = useState<Record<string, number>>(
    {},
  );
  const [items, setItems] = useState<ManagedListing[]>([]),
    [selected, setSelected] = useState<ManagedListing | null>(null),
    [tab, setTab] = useState("listings"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  async function refresh() {
    try {
      setItems(
        (await managedListings()).filter(
          (i) => !auth.account || i.organisation_id === auth.account.id,
        ),
      );
      if (db) {
        const result = await db
          .from("listing_images")
          .select("listing_id,status")
          .eq("status", "pending_review");
        if (result.error) throw result.error;
        const counts: Record<string, number> = {};
        for (const image of result.data || [])
          counts[image.listing_id] = (counts[image.listing_id] || 0) + 1;
        setPendingPhotos(counts);
      }
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
          onClick={() => request(() => void logout())}
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
          onClick={() =>
            request(() => {
              setTab("listings");
              setSelected(null);
              navigate("/dashboard");
            })
          }
        >
          <LayoutDashboard size={17} />
          Your listings
        </button>
        <button
          className={tab === "settings" ? "active" : ""}
          onClick={() =>
            request(() => {
              setTab("settings");
              setSelected(null);
              navigate("/dashboard");
            })
          }
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
      ) : creation && !creation[1] ? (
        <ListingChooser dashboard />
      ) : creation?.[1] || selected ? (
        <ListingEditor
          key={creation?.[1] || selected?.id}
          onImagesChanged={() => void refresh()}
          onDraftSaved={refresh}
          item={creation ? undefined : selected || undefined}
          initialType={
            (creation?.[1] === "profile"
              ? "organisation"
              : creation?.[1] || "activity") as ListingData["type"]
          }
          onCancel={() => {
            setSelected(null);
            navigate(creation ? "/dashboard/new" : "/dashboard");
          }}
          onSaved={async (id) => {
            await refresh();
            await refreshListings();
            const rows = await managedListings();
            setSelected(rows.find((i) => i.id === id) || null);
            if (creation) navigate("/dashboard", { replace: true });
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
            <div className="button-row">
              <button
                className="button"
                onClick={() => {
                  setSelected(null);
                  navigate("/dashboard/new");
                }}
                disabled={!auth.account || auth.account.suspended}
              >
                <FilePlus2 size={17} />
                Create a listing
              </button>
            </div>
          </div>
          {loading ? (
            <p role="status">Loading your listings…</p>
          ) : !items.length ? (
            <div className="empty">
              <Users size={34} />
              <h3>Let’s introduce you.</h3>
              <p>
                Add your organisation, a programme, an event, a service or a
                venue. You can save a draft before submitting.
              </p>
              <button
                className="button"
                onClick={() => {
                  setSelected(null);
                  navigate("/dashboard/new");
                }}
              >
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
                    <p className="next-action">
                      {item.status === "pending_review"
                        ? item.published
                          ? "Your approved listing is live; changes are with BBCN."
                          : "With BBCN for review. We’ll let you know the outcome."
                        : item.status === "changes_requested" ||
                            item.status === "rejected"
                          ? "Changes needed: read BBCN’s note, edit and resubmit."
                          : item.status === "draft"
                            ? "Draft: continue editing, add photos and submit when ready."
                            : item.published
                              ? "Listing live: visitors can find your approved content."
                              : "This listing is not currently public."}
                    </p>
                    {!!pendingPhotos[item.id] && (
                      <p className="photo-status">
                        {pendingPhotos[item.id]}{" "}
                        {pendingPhotos[item.id] === 1
                          ? "photo awaiting"
                          : "photos awaiting"}{" "}
                        approval. Listing and photo decisions are separate.
                      </p>
                    )}
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
                        : item.status === "changes_requested" ||
                            item.status === "rejected"
                          ? "Make requested changes"
                          : item.status === "draft"
                            ? "Continue editing"
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
  initialType = "organisation",
  onImagesChanged,
  onDraftSaved,
}: {
  item?: ManagedListing;
  initialType?: ListingData["type"];
  onImagesChanged?: () => void;
  onDraftSaved?: () => void | Promise<void>;
  onSaved: (id: string) => void | Promise<void>;
  onCancel: () => void;
  admin?: boolean;
}) {
  const { categories, locations } = useApp();
  const { register, request, clean } = useUnsaved();
  const [issues, setIssues] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState(false);
  const savedId = useRef(item?.id || null);
  const baseline = useRef(
    JSON.stringify({ ...emptyListing, type: initialType, ...item?.proposed }),
  );
  const formId = useId();
  const costId = `${formId}-cost`;
  const [data, setData] = useState<ListingData>({
      ...emptyListing,
      type: initialType,
      ...item?.proposed,
    }),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [imagesBusy, setImagesBusy] = useState(false);
  const kind =
    data.type === "event"
      ? "event"
      : data.type === "venue"
        ? "venue"
        : "activity";
  const title =
    kind === "event"
      ? "event"
      : kind === "venue"
        ? "facility or room"
        : "Find Me";
  const Icon =
    kind === "event" ? CalendarDays : kind === "venue" ? Building2 : Users;
  const locked = item?.status === "pending_review" && !admin;
  const selectedAges = data.suitableAges.includes("All")
    ? [...suitableAges]
    : data.suitableAges;
  useEffect(() => {
    const next = { ...emptyListing, type: initialType, ...item?.proposed };
    setData(next);
    baseline.current = JSON.stringify(next);
  }, [item?.id, item?.status, initialType]);
  function field<K extends keyof ListingData>(name: K, value: ListingData[K]) {
    setData((d) => ({ ...d, [name]: value }));
    setIssues((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  }
  const dirty = JSON.stringify(data) !== baseline.current;
  useEffect(() => {
    register({ dirty, theme: kind, save: () => save(false, true) });
  });
  useEffect(() => () => register(null), [register]);
  function showIssues(errors: { path: PropertyKey[]; message: string }[]) {
    const next: Record<string, string> = {};
    for (const issue of errors) next[String(issue.path[0])] = issue.message;
    setIssues(next);
    setError("Please check the highlighted fields.");
    requestAnimationFrame(() =>
      document
        .getElementById(`${formId}-${String(errors[0]?.path[0])}`)
        ?.focus(),
    );
  }
  const fieldError = (name: string) =>
    issues[name] ? (
      <span className="field-error" id={`${formId}-${name}-error`}>
        {issues[name]}
      </span>
    ) : null;
  async function save(submit: boolean, staying = false): Promise<boolean> {
    if (busy || imagesBusy || locked) return false;
    setError("");
    setMessage("");
    const parsed = (submit ? listingSchema : draftSchema).safeParse(data);
    if (!parsed.success) {
      showIssues(parsed.error.issues);
      return false;
    }
    setIssues({});
    setBusy(true);
    try {
      const id = await saveListing(savedId.current, parsed.data, submit);
      savedId.current = id;
      setData(parsed.data);
      baseline.current = JSON.stringify(parsed.data);
      clean();
      if (!staying) await onSaved(id);
      else if (onDraftSaved) await onDraftSaved();
      setMessage(
        submit
          ? "Submitted to BBCN for review. Your current approved content is unchanged."
          : "Draft saved privately. Complete the remaining details before submitting.",
      );
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const input = (
    name: keyof ListingData,
    label: string,
    opts: {
      area?: boolean;
      type?: string;
      help?: string;
      disabled?: boolean;
    } = {},
  ) => (
    <label>
      {label}
      {["name", "summary", "description"].includes(name) && (
        <span aria-hidden="true"> *</span>
      )}
      {opts.area ? (
        <textarea
          id={`${formId}-${name}`}
          aria-required={["name", "summary", "description"].includes(name)}
          aria-label={label}
          aria-invalid={Boolean(issues[name])}
          aria-describedby={
            issues[name] ? `${formId}-${name}-error` : undefined
          }
          rows={name === "description" ? 6 : 3}
          value={String(data[name])}
          onChange={(e) => field(name, e.target.value as never)}
        />
      ) : (
        <input
          id={`${formId}-${name}`}
          aria-required={["name", "summary", "description"].includes(name)}
          aria-label={label}
          aria-invalid={Boolean(issues[name])}
          aria-describedby={
            issues[name] ? `${formId}-${name}-error` : undefined
          }
          type={opts.type || "text"}
          disabled={opts.disabled}
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
      {fieldError(name)}
    </label>
  );
  return (
    <div
      className={`listing-editor listing-theme-${kind} feature-theme feature-theme-${kind}`}
    >
      <button
        className="text-button back-link"
        onClick={() => request(onCancel)}
      >
        {item ? "← Back to listings" : "← Choose another listing type"}
      </button>
      <div className="section-heading listing-editor-heading">
        <div>
          <span className="listing-family">
            <Icon size={22} />
            {kind === "event"
              ? "Events"
              : kind === "venue"
                ? "Venues for Hire"
                : "Find Me · Activities & programmes"}
          </span>
          <h2>
            {item
              ? `Manage your ${title} listing`
              : `Create ${kind === "event" ? "an" : "a"} ${title} listing`}
          </h2>
          <p>
            {kind === "event"
              ? "Share a dated occasion: tell people when it happens, where to go and how to attend."
              : kind === "venue"
                ? "Help people picture your space, explore its facilities and arrange a booking."
                : "Help people find your regular activities, programmes, organisation or services."}
          </p>
          <small>
            Public contact details are optional and separate from your private
            registration.
          </small>
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
        id={formId}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save(true);
        }}
      >
        <fieldset disabled={busy || locked} className="listing-form">
          <section className="form-section">
            <h3>The basics</h3>
            <p className="help">
              Fields marked * are required to submit. To save a private draft
              and add photos, only the listing name and type are required.
            </p>
            <div className="form-grid">
              {(kind === "activity" || admin) && (
                <label>
                  Listing type
                  <select
                    value={data.type}
                    onChange={(e) =>
                      field("type", e.target.value as ListingData["type"])
                    }
                  >
                    {listingTypes
                      .filter((t) => admin || !["event", "venue"].includes(t))
                      .map((t) => (
                        <option key={t} value={t}>
                          {t === "venue"
                            ? "Venue for hire"
                            : t[0].toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {input(
                "name",
                kind === "event"
                  ? "Event name"
                  : kind === "venue"
                    ? "Facility / room name"
                    : "Listing name",
              )}
            </div>
            {input("summary", "Short introduction (10–220 characters)")}
            {input("description", "Full description", { area: true })}
            {kind === "activity" && (
              <fieldset>
                <legend>
                  Categories <span aria-hidden="true">*</span>{" "}
                  <small>Select up to 10</small>
                </legend>
                <div className="category-checks">
                  {[...new Set([...categories, ...data.categories])].map(
                    (c) => (
                      <label key={c} className="check-label">
                        <input
                          type="checkbox"
                          id={
                            c ===
                            [...new Set([...categories, ...data.categories])][0]
                              ? `${formId}-categories`
                              : undefined
                          }
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
                    ),
                  )}
                </div>
                {fieldError("categories")}
              </fieldset>
            )}
          </section>
          <section className="form-section">
            <h3>
              {kind === "event"
                ? "When & where"
                : kind === "venue"
                  ? "Location & access"
                  : "Where & when"}
            </h3>
            <PriorityNeighbourhoods
              locations={locations}
              value={data.suburb}
              onChange={(v) => v && field("suburb", v)}
            />
            <div className="form-grid">
              <label>
                Neighbourhood
                <select
                  value={data.suburb}
                  onChange={(e) => field("suburb", e.target.value)}
                >
                  <NeighbourhoodOptions
                    locations={[...new Set([...locations, data.suburb])]}
                  />
                </select>
              </label>
              {input(
                "address",
                kind === "event" ? "Venue / event location" : "Public address",
                {
                  help:
                    kind === "event"
                      ? "Venue name and address, or details of how to join online."
                      : undefined,
                },
              )}
            </div>
            {data.type === "event" && (
              <>
                <div className="form-grid">
                  <label>
                    Event start date <span aria-hidden="true">*</span>
                    <input
                      type="date"
                      id={`${formId}-eventStartDate`}
                      aria-label="Event start date"
                      aria-required="true"
                      aria-invalid={Boolean(issues.eventStartDate)}
                      aria-describedby={
                        issues.eventStartDate
                          ? `${formId}-eventStartDate-error`
                          : undefined
                      }
                      min="1900-01-01"
                      max="2100-12-31"
                      value={data.eventStartDate}
                      onChange={(e) => field("eventStartDate", e.target.value)}
                    />
                    {fieldError("eventStartDate")}
                  </label>
                  <label>
                    Event end date (optional)
                    <input
                      type="date"
                      id={`${formId}-eventEndDate`}
                      aria-label="Event end date (optional)"
                      aria-invalid={Boolean(issues.eventEndDate)}
                      aria-describedby={
                        issues.eventEndDate
                          ? `${formId}-eventEndDate-error`
                          : undefined
                      }
                      min={data.eventStartDate || "1900-01-01"}
                      max="2100-12-31"
                      value={data.eventEndDate}
                      onChange={(e) => field("eventEndDate", e.target.value)}
                    />
                    {fieldError("eventEndDate")}
                  </label>
                </div>
                <p className="help">
                  Leave the end date blank for a one-day event. For separate
                  occurrences, create a listing for each date. Dates and times
                  are local to New Zealand.
                </p>
              </>
            )}
            {kind !== "venue" && (
              <>
                {input(
                  "times",
                  data.type === "event"
                    ? "Event times and arrival information"
                    : "Opening hours or meeting times",
                  { area: true },
                )}
                <fieldset>
                  <legend>Suitable Ages</legend>
                  <p className="help">
                    Choose each age group this listing is suitable for.
                  </p>
                  <div className="category-checks">
                    {suitableAges.map((age) => (
                      <label key={age} className="check-label">
                        <input
                          type="checkbox"
                          checked={selectedAges.includes(age)}
                          onChange={(e) =>
                            field(
                              "suitableAges",
                              e.target.checked
                                ? [...selectedAges, age]
                                : selectedAges.filter((a) => a !== age),
                            )
                          }
                        />
                        {age}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="form-grid">
                  {input("ageGroups", "Additional age information (optional)")}
                </div>
              </>
            )}
            {input("accessibility", "Accessibility information", {
              area: true,
            })}
          </section>
          <section className="form-section listing-cost-section">
            <h3>
              {kind === "event"
                ? "Tickets & entry"
                : kind === "venue"
                  ? "Hire costs & bookings"
                  : "Cost & membership"}
            </h3>
            <div className="cost-field">
              <div className="cost-options">
                <button
                  type="button"
                  className={`free-choice ${isFreeListing(data) ? "is-free" : ""}`}
                  aria-label="Free"
                  aria-pressed={isFreeListing(data)}
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      cost: isFreeListing(d) ? "" : "Free",
                      price: d.type === "venue" ? 0 : d.price,
                    }))
                  }
                >
                  {isFreeListing(data) ? (
                    <Check size={27} />
                  ) : (
                    <Gift size={27} />
                  )}
                  <span>
                    <strong>Free</strong>
                    <small>
                      {kind === "event"
                        ? "No compulsory entry or ticket charge"
                        : kind === "venue"
                          ? "No compulsory hire charge"
                          : "No compulsory participation or membership charge"}
                    </small>
                  </span>
                </button>
              </div>
              <label htmlFor={costId}>
                {kind === "event"
                  ? "Ticket or entry cost"
                  : kind === "venue"
                    ? "Hire cost information"
                    : "Cost or membership information"}
              </label>
              <input
                id={costId}
                aria-invalid={Boolean(issues.cost)}
                aria-describedby={
                  issues.cost ? `${formId}-cost-error` : undefined
                }
                value={data.cost}
                maxLength={300}
                onChange={(e) => field("cost", e.target.value)}
                placeholder={
                  kind === "venue"
                    ? "e.g. hourly rate, bond and any extra charges"
                    : "e.g. price, concessions or optional donations"
                }
              />
              {fieldError("cost")}
              <small>
                Choose Free when there is no compulsory charge. Leave the cost
                blank if it is not yet known.
              </small>
            </div>
            {kind === "venue" &&
              input("price", "Indicative hourly price ($, 0 if not supplied)", {
                type: "number",
                disabled: isFreeListing(data),
                help: isFreeListing(data)
                  ? "Free is selected. Clear it to enter a hire price."
                  : undefined,
              })}
            {kind !== "activity" &&
              input(
                "bookingUrl",
                kind === "event"
                  ? "Ticket or booking link (optional)"
                  : "Booking information link",
                { type: "url" },
              )}
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
        </fieldset>
      </form>
      {item ? (
        <ImageManager
          listingId={item.id}
          admin={false}
          onBusyChange={setImagesBusy}
          onChange={onImagesChanged}
        />
      ) : (
        <section className="image-manager">
          <h2>Photos & images</h2>
          <p>
            Save a private draft with a name to add your logo, primary image and
            gallery before submitting. Saving a draft does not publish your
            listing or send it for review. Photos are optional.
          </p>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => void save(false)}
          >
            <Save size={17} /> Save draft to add photos
          </button>
        </section>
      )}
      {preview && (
        <ListingPreview
          data={data}
          listingId={item?.id}
          canSubmit={!locked && !busy && !imagesBusy}
          onClose={() => setPreview(false)}
          onSubmit={() => {
            setPreview(false);
            void save(true);
          }}
        />
      )}
      <div className="listing-submit-section">
        <p>
          When your listing and photos are ready, submit your listing for BBCN
          review. Upload each selected photo before submitting; photos have
          their own approval process.
        </p>
        <div className="form-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy || imagesBusy}
            onClick={() => setPreview(true)}
          >
            Preview listing
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy || locked || imagesBusy}
            onClick={() => void save(false)}
          >
            <Save size={17} /> Save draft
          </button>
          <button
            type="submit"
            form={formId}
            className="button"
            disabled={busy || locked || imagesBusy}
          >
            <Send size={17} />
            {imagesBusy
              ? "Finish uploading photos…"
              : busy
                ? "Saving…"
                : "Submit for review"}
          </button>
        </div>
      </div>
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
