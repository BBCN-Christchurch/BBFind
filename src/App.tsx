import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
  ScrollRestoration,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  MapPin,
  Heart,
  Leaf,
  Palette,
  Users,
  BookOpen,
  Activity,
  Baby,
  Building2,
  Menu,
  X,
  Check,
  ChevronRight,
  Mail,
  Phone,
  Globe,
  Clock,
  Accessibility,
  CheckCircle2,
  Filter,
  SlidersHorizontal,
  CalendarDays,
} from "lucide-react";
import {
  accountsEnabled,
  configured,
  db,
  getContext,
  getPublicListings,
  portalUrl,
  publicImages,
  imageUrl,
  type SessionContext,
} from "./api";
import {
  initialCategories,
  suitableAges,
  matchesAge,
  localToday,
  eventPeriods,
  eventDateRange,
  formatEventDate,
  isFreeListing,
  venuePriceLabel,
  listingAction,
  matchesSearch,
  publicUrl,
  suburbs,
  type Listing,
  type ImageRecord,
} from "./domain";
import { Illustration, Neighbourhood } from "./Illustration";
import { AuthPage, Dashboard, ResetPassword, ListingChooser } from "./Accounts";
import { Admin } from "./Admin";
import { ImageGallery } from "./Images";
import { NeighbourhoodOptions, PriorityNeighbourhoods } from "./Neighbourhood";
import { UpcomingEvents } from "./UpcomingEvents";
export const AppContext = createContext<{
  auth: SessionContext;
  refreshAuth: () => Promise<void>;
  listings: Listing[];
  refreshListings: () => Promise<void>;
  refreshTaxonomy: () => Promise<void>;
  categories: string[];
  locations: string[];
}>({
  auth: { session: null, account: null, admin: false },
  refreshAuth: async () => {},
  listings: [],
  refreshListings: async () => {},
  refreshTaxonomy: async () => {},
  categories: initialCategories,
  locations: suburbs,
});
export function useApp() {
  return useContext(AppContext);
}
export function Message({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`message ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function ButtonLink({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={`button ${secondary ? "secondary" : ""}`} to={to}>
      {children}
    </Link>
  );
}
export function AccountLink({
  children,
  className = "button",
  path = "/account",
}: {
  children: ReactNode;
  className?: string;
  path?: string;
}) {
  return portalUrl ? (
    <a className={className} href={`${portalUrl.replace(/\/$/, "")}${path}`}>
      {children}
    </a>
  ) : (
    <Link className={className} to={path}>
      {children}
    </Link>
  );
}
export default function App() {
  const [listings, setListings] = useState<Listing[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [mobile, setMobile] = useState(false),
    [categories, setCategories] = useState(initialCategories),
    [locations, setLocations] = useState(suburbs);
  const [auth, setAuth] = useState<SessionContext>({
    session: null,
    account: null,
    admin: false,
  });
  const location = useLocation();
  async function refreshListings() {
    try {
      const loaded = await getPublicListings();
      setListings(loaded);
      if (!configured)
        setLocations([
          ...new Set([...suburbs, ...loaded.map((item) => item.suburb)]),
        ]);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function refreshTaxonomy() {
    if (!db) return;
    const [c, l] = await Promise.all([
      db.from("categories").select("name").eq("active", true).order("name"),
      db.from("locations").select("name").eq("active", true).order("name"),
    ]);
    if (c.error) throw c.error;
    if (l.error) throw l.error;
    setCategories(c.data.map((v) => v.name));
    setLocations(l.data.map((v) => v.name));
  }
  async function refreshAuth() {
    if (!db) return;
    const {
      data: { session },
    } = await db.auth.getSession();
    setAuth(await getContext(session));
  }
  useEffect(() => {
    void refreshListings();
    if (!db) return;
    void refreshAuth().catch((e) => setError(e.message));
    const { data } = db.auth.onAuthStateChange(() => {
      setTimeout(() => void refreshAuth().catch((e) => setError(e.message)), 0);
    });
    void refreshTaxonomy().catch((e) => setError(e.message));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    setMobile(false);
    const detail = listings.find(
      (i) => location.pathname === `/listing/${i.id}`,
    );
    document.title = detail
      ? `${detail.name} — BBFind`
      : location.pathname === "/"
        ? "BBFind — Your community, connected."
        : `${location.pathname.startsWith("/events") ? "Community events" : location.pathname.startsWith("/venues") ? "Venues for hire" : location.pathname.startsWith("/dashboard") ? "Your organisation" : location.pathname.startsWith("/admin") ? "BBCN administration" : "Community directory"} — BBFind`;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute(
      "content",
      detail?.summary ||
        "Find local groups, activities, services and venues across Burnside, Bryndwr and the wider Christchurch community.",
    );
    const site = import.meta.env.VITE_SITE_URL?.replace(/\/$/, "");
    let canonical = document.querySelector('link[rel="canonical"]');
    if (site && !/^\/(account|dashboard|admin|reset)/.test(location.pathname)) {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.append(canonical);
      }
      canonical.setAttribute(
        "href",
        site + (location.pathname === "/" ? "/" : location.pathname),
      );
    } else canonical?.remove();
    document.getElementById("listing-structured-data")?.remove();
    if (detail) {
      const script = document.createElement("script");
      script.id = "listing-structured-data";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type":
          detail.type === "event"
            ? "Event"
            : detail.type === "venue"
              ? "Place"
              : detail.type === "business"
                ? "LocalBusiness"
                : detail.type === "organisation"
                  ? "Organization"
                  : "Service",
        ...(detail.type === "event"
          ? {
              startDate: detail.eventStartDate,
              ...(detail.eventEndDate ? { endDate: detail.eventEndDate } : {}),
              location: {
                "@type": "Place",
                name: detail.address || detail.suburb,
                address: detail.address || detail.suburb,
              },
            }
          : {}),
        name: detail.name,
        description: detail.summary,
        ...(site ? { url: site + location.pathname } : {}),
        ...(detail.publicEmail ? { email: detail.publicEmail } : {}),
        ...(detail.publicPhone ? { telephone: detail.publicPhone } : {}),
        address: {
          "@type": "PostalAddress",
          streetAddress: detail.address,
          addressLocality: detail.suburb,
          addressRegion: "Canterbury",
          addressCountry: "NZ",
        },
      });
      document.head.append(script);
    }
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.append(robots);
    }
    robots.setAttribute(
      "content",
      /^\/(account|dashboard|admin|reset)/.test(location.pathname)
        ? "noindex, nofollow"
        : "index, follow",
    );
  }, [location.pathname, listings]);
  return (
    <AppContext.Provider
      value={{
        auth,
        refreshAuth,
        listings,
        refreshListings,
        categories,
        locations,
        refreshTaxonomy,
      }}
    >
      <ScrollRestoration
        getKey={(loc) =>
          /^\/(find|events|venues)$/.test(loc.pathname)
            ? loc.pathname + loc.search
            : loc.key
        }
      />
      <a
        className="skip"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main")?.focus();
          document.getElementById("main")?.scrollIntoView();
        }}
      >
        Skip to content
      </a>
      <div className="topline">
        <span>Rooted in Burnside & Bryndwr. Open to everyone.</span>
        <a href="https://bbcn.org.nz/" target="_blank" rel="noreferrer">
          A BBCN community initiative <ArrowUpRight size={13} />
        </a>
      </div>
      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <Leaf size={24} />
            </span>
            <span>
              BB<span className="brand-light">Find</span>
              <small>YOUR COMMUNITY, CONNECTED</small>
            </span>
          </Link>
          <button
            className="menu-toggle icon-button"
            aria-label={mobile ? "Close navigation" : "Open navigation"}
            aria-expanded={mobile}
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </button>
          <nav
            className={mobile ? "nav open" : "nav"}
            aria-label="Main navigation"
          >
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/find">Find It</NavLink>
            <NavLink to="/events">Events</NavLink>
            <NavLink to="/venues">Venues for Hire</NavLink>
            <NavLink to="/get-found">
              Get Found <span className="nav-action-hint">· Add a listing</span>
            </NavLink>
            <NavLink to="/about">About</NavLink>
          </nav>
          <AccountLink
            className="sign-in"
            path={auth.session ? "/dashboard" : "/account"}
          >
            {auth.session ? "My dashboard" : "Sign in"}{" "}
            <ArrowUpRight size={16} />
          </AccountLink>
        </div>
      </header>
      {!configured && (
        <div className="demo-banner">
          <span className="demo-dot" /> Demonstration directory{" "}
          <span>
            — real community examples from public sources, for demonstration
            only.
          </span>
        </div>
      )}
      <main id="main" tabIndex={-1}>
        {error && (
          <div className="container">
            <Message error>
              Could not load the live directory: {error}{" "}
              <button
                className="text-button"
                onClick={() => void refreshListings()}
              >
                Try again
              </button>
            </Message>
          </div>
        )}
        {loading ? (
          <div className="container loading" role="status">
            Finding your community…
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/find" element={<Directory key="find" />} />
            <Route path="/events" element={<Directory key="events" events />} />
            <Route path="/venues" element={<Directory key="venues" venues />} />
            <Route path="/listing/:id" element={<ListingPage />} />
            <Route path="/get-found" element={<GetFound />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/account" element={<AuthPage />} />
            <Route path="/reset" element={<ResetPassword />} />
            <Route path="/dashboard/*" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route
              path="*"
              element={
                <div className="container page">
                  <h1>That page has wandered off.</h1>
                  <p>Let’s get you back to your community.</p>
                  <ButtonLink to="/find">
                    Explore the directory <ArrowRight size={18} />
                  </ButtonLink>
                </div>
              }
            />
          </Routes>
        )}
      </main>
      <footer>
        <div className="container footer-main">
          <div>
            <Link to="/" className="brand footer-brand">
              BB<span className="brand-light">Find</span>
            </Link>
            <p>
              Good things happen
              <br />
              when we connect.
            </p>
            <div className="parent-brand">
              <img
                src={`${import.meta.env.BASE_URL}branding/bbcn-logo.png`}
                alt="Burnside and Bryndwr Community Network logo"
                width="36"
                height="36"
                loading="lazy"
              />
              <small>
                A Burnside Bryndwr
                <br />
                Community Network initiative.
              </small>
            </div>
          </div>
          <div>
            <strong>Find your community</strong>
            <Link to="/find">Explore the directory</Link>
            <Link to="/events">Community events</Link>
            <Link to="/venues">Venues for hire</Link>
            <Link to="/get-found">Add your organisation</Link>
          </div>
          <div>
            <strong>A little more about us</strong>
            <Link to="/about">About the directory</Link>
            <a href="https://bbcn.org.nz/" target="_blank" rel="noreferrer">
              Visit BBCN <ArrowUpRight size={13} />
            </a>
            <Link to="/privacy">Privacy & your information</Link>
          </div>
          <div className="footer-local">
            <MapPin size={26} />
            <strong>
              Local roots.
              <br />
              Stronger connections.
            </strong>
            <span>Ōtautahi Christchurch, Aotearoa</span>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} Burnside Bryndwr Community Network
          </span>
          <span>Made for our neighbourhood, together.</span>
        </div>
      </footer>
    </AppContext.Provider>
  );
}
function SearchBox({
  initial = "",
  large = false,
}: {
  initial?: string;
  large?: boolean;
}) {
  const [query, setQuery] = useState(initial);
  const navigate = useNavigate();
  function submit(e: FormEvent) {
    e.preventDefault();
    navigate(`/find?q=${encodeURIComponent(query)}`);
  }
  return (
    <form
      className={`search-box ${large ? "large" : ""}`}
      onSubmit={submit}
      role="search"
    >
      <Search size={22} />
      <label
        className="sr-only"
        htmlFor={large ? "home-search" : "page-search"}
      >
        Search organisations, activities or services
      </label>
      <input
        id={large ? "home-search" : "page-search"}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="What would you like to find?"
      />
      <button className="button" type="submit">
        Find it <ArrowRight size={18} />
      </button>
    </form>
  );
}
const categoryTiles = [
  {
    name: "Community & connection",
    value: "Community Groups and Special Interests",
    icon: Users,
    color: "green",
  },
  {
    name: "Arts & creativity",
    value: "Arts, Heritage and Culture",
    icon: Palette,
    color: "peach",
  },
  {
    name: "Health & wellbeing",
    value: "Health and Wellbeing",
    icon: Heart,
    color: "pink",
  },
  {
    name: "Sport & recreation",
    value: "Sports and Exercise",
    icon: Activity,
    color: "blue",
  },
  {
    name: "Learning & growing",
    value: "Education and Learning",
    icon: BookOpen,
    color: "yellow",
  },
  {
    name: "Children & families",
    value: "Children, Youth and Families",
    icon: Baby,
    color: "lilac",
  },
];
function Home() {
  const { listings, categories } = useApp();
  const regularListings = listings.filter((l) => l.type !== "event");
  const featured = regularListings.filter((l) => l.featured).slice(0, 3);
  const homeCategories = [
    ...new Set([
      ...categoryTiles
        .map((tile) => tile.value)
        .filter((value) => categories.includes(value)),
      ...categories,
    ]),
  ].slice(0, 6);
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">
              <span /> A LITTLE CLOSER. A LITTLE MORE CONNECTED.
            </span>
            <h1>
              Your people.
              <br />
              Your place.
              <br />
              <em>Your community.</em>
            </h1>
            <p>
              Discover local groups, activities, services and spaces
              <br className="desktop-break" /> in Burnside, Bryndwr and beyond.
            </p>
            <SearchBox large />
            <div className="popular">
              <span>A place to start:</span>
              <Link to="/find?category=Community%20Groups%20and%20Special%20Interests">
                Community groups
              </Link>
              <Link to="/venues">Venues</Link>
              <Link to="/find?category=Children%2C%20Youth%20and%20Families">
                For families
              </Link>
            </div>
          </div>
          <div className="hero-art">
            <Neighbourhood />
            <span className="art-label">
              <MapPin size={16} /> Good things, close to home.
            </span>
            <div className="floating-note">
              <span className="note-heart">
                <Heart size={18} />
              </span>
              <span>
                A place for everyone.<small>And something for you.</small>
              </span>
            </div>
            <span className="hero-spark">✳</span>
          </div>
        </div>
      </section>
      <UpcomingEvents listings={listings} />
      <section className="section categories-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FOLLOW YOUR CURIOSITY</span>
              <h2>What brings you here?</h2>
            </div>
            <Link className="arrow-link" to="/find">
              Explore all categories <ArrowRight size={17} />
            </Link>
          </div>
          <div className="category-grid">
            {homeCategories.map((value) => {
              const {
                name,
                icon: Icon,
                color,
              } = categoryTiles.find((t) => t.value === value) || {
                name: value,
                icon: Users,
                color: "green",
              };
              return (
                <Link
                  className="category-tile"
                  to={`/find?category=${encodeURIComponent(value)}`}
                  key={value}
                >
                  <span className={`category-icon ${color}`}>
                    <Icon size={25} strokeWidth={1.6} />
                  </span>
                  <span>{name}</span>
                  <ArrowUpRight size={17} />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <section className="section featured-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">RIGHT ON YOUR DOORSTEP</span>
              <h2>A few local possibilities</h2>
              <p>
                {configured
                  ? "Meet the people and places making our community a little brighter."
                  : "Explore sample listings based on real Burnside and Bryndwr organisations. Check current details with each organisation."}
              </p>
            </div>
            <Link className="arrow-link" to="/find">
              Find your thing <ArrowRight size={17} />
            </Link>
          </div>
          <div className="listing-grid">
            {(featured.length ? featured : regularListings.slice(0, 3)).map(
              (item) => (
                <ListingCard key={item.id} item={item} />
              ),
            )}
          </div>
          {!listings.length && <Empty />}
        </div>
      </section>
      <section className="container connection-band">
        <div className="band-symbol">
          <Users size={54} strokeWidth={1} />
          <span>✳</span>
        </div>
        <div>
          <span className="eyebrow">LOCAL ORGANISATION? YOU BELONG HERE.</span>
          <h2>
            Do good things.
            <br />
            Let your community find you.
          </h2>
          <p>
            One free account. A home for your organisation, programmes and
            spaces.
          </p>
        </div>
        <ButtonLink to="/get-found">
          Get found <ArrowUpRight size={19} />
        </ButtonLink>
      </section>
      <section className="section">
        <div className="container venue-teaser feature-theme feature-theme-venue">
          <div className="venue-art">
            <Illustration kind="hall" />
            <span className="little-tag">
              <Building2 size={15} /> ROOM FOR YOUR NEXT BIG IDEA
            </span>
          </div>
          <div className="venue-copy">
            <span className="eyebrow">MAKE ROOM FOR CONNECTION</span>
            <h2>
              The right space.
              <br />
              For your kind of gathering.
            </h2>
            <p>
              From a cosy meeting room to a hall full of possibilities. Find a
              local venue for your next workshop, celebration or community
              get-together.
            </p>
            <ButtonLink to="/venues" secondary>
              Explore venues for hire <ArrowRight size={18} />
            </ButtonLink>
          </div>
        </div>
      </section>
      <section className="how-section">
        <div className="container">
          <span className="eyebrow">
            SIMPLE CONNECTIONS. BIG POSSIBILITIES.
          </span>
          <h2>A community, waiting to be discovered.</h2>
          <div className="steps">
            <div>
              <span>01</span>
              <h3>Find your thing</h3>
              <p>
                Search by interest, place or the kind of connection you’re
                looking for.
              </p>
            </div>
            <div>
              <span>02</span>
              <h3>Get to know them</h3>
              <p>
                Explore local listings and find the details that matter to you.
              </p>
            </div>
            <div>
              <span>03</span>
              <h3>Make a connection</h3>
              <p>
                Get in touch, turn up, try something new. Your community starts
                with you.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
export function ListingCard({
  item,
  agenda = false,
  venueDetails = false,
}: {
  item: Listing;
  agenda?: boolean;
  venueDetails?: boolean;
}) {
  const location = useLocation();
  const backState = /^\/(find|events|venues)$/.test(location.pathname)
    ? { from: location.pathname + location.search }
    : undefined;
  const demoImage = !configured ? item.demoImages?.[0] : undefined;
  const [cover, setCover] = useState("");
  useEffect(() => {
    let live = true;
    if (configured)
      void publicImages(item.id)
        .then(async (imgs) => {
          const img = imgs.find((x) => x.published?.primary) || imgs[0];
          if (img) {
            const url = await imageUrl(img.thumbnail_path);
            if (live) setCover(url);
          }
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [item.id]);
  return (
    <article
      className={`listing-card feature-theme feature-theme-${item.type === "event" ? "event" : item.type === "venue" ? "venue" : "activity"}${agenda ? " agenda-card" : ""}`}
    >
      {agenda && (
        <div className="agenda-date" aria-hidden="true">
          <span>
            {new Intl.DateTimeFormat("en-NZ", {
              month: "short",
              timeZone: "Pacific/Auckland",
            }).format(new Date(`${item.eventStartDate}T00:00:00Z`))}
          </span>
          <strong>{item.eventStartDate.slice(8)}</strong>
        </div>
      )}
      <Link
        to={`/listing/${item.id}`}
        state={backState}
        className="card-visual"
        tabIndex={-1}
        aria-hidden="true"
      >
        {cover || demoImage ? (
          <img
            src={cover || `${import.meta.env.BASE_URL}${demoImage!.path}`}
            alt=""
            loading="lazy"
            className={`${demoImage?.kind === "logo" || demoImage?.kind === "artwork" ? "demo-logo" : ""} ${demoImage?.dark ? "demo-logo-dark" : ""}`}
          />
        ) : (
          <Illustration kind={item.illustration || "support"} />
        )}
        <span className="card-type">
          {item.type === "venue" ? "Venue for hire" : item.type}
        </span>
      </Link>
      <div className="card-body">
        <span className="location-label">
          <MapPin size={13} />
          {item.suburb}
          {item.verified && (
            <span className="verified">
              <CheckCircle2 size={13} /> Verified
            </span>
          )}
          {isFreeListing(item) && <span className="free-label">Free</span>}
        </span>
        {item.type === "event" && (
          <p className="event-date">
            <Clock size={15} />
            <time dateTime={item.eventStartDate}>
              {formatEventDate(item.eventStartDate)}
            </time>
            {item.eventEndDate && item.eventEndDate !== item.eventStartDate && (
              <> – {formatEventDate(item.eventEndDate)}</>
            )}
          </p>
        )}
        <h3>
          <Link to={`/listing/${item.id}`} state={backState}>
            {item.name}
            <ArrowUpRight size={19} />
          </Link>
        </h3>
        <p>{item.summary}</p>
        {venueDetails && (
          <div className="venue-facts">
            <span>
              <Building2 size={14} />
              {item.roomType || "Space for hire"}
            </span>
            {item.kitchen && <span>Kitchen</span>}
            {item.accessible && (
              <span>
                <Accessibility size={14} />
                Accessible
              </span>
            )}
          </div>
        )}
        <div className="card-bottom">
          <span>
            {item.categories[0] ||
              (item.type === "event"
                ? "Community event"
                : item.type === "venue"
                  ? "Room or facility for hire"
                  : "Find Me")}
          </span>
          {item.type === "venue" ? (
            <span>
              {item.capacity > 0
                ? `${item.capacity} people`
                : "Capacity not supplied"}
            </span>
          ) : (
            <ArrowRight size={16} />
          )}
        </div>
      </div>
    </article>
  );
}
function Empty() {
  return (
    <div className="empty">
      <Leaf size={34} />
      <h3>A little room for discovery.</h3>
      <p>
        No listings match yet. Try a different search or clear your filters.
      </p>
      <ButtonLink to="/find" secondary>
        Explore all listings
      </ButtonLink>
    </div>
  );
}
function Directory({
  venues = false,
  events = false,
}: {
  venues?: boolean;
  events?: boolean;
}) {
  const { listings, categories, locations } = useApp();
  const [urlParams, setParams] = useSearchParams();
  const directoryLocation = useLocation();
  const [filtersOpen, setFiltersOpen] = useState(() => {
    try {
      return (
        sessionStorage.getItem(
          `bbfind-filters:${directoryLocation.pathname}`,
        ) === "open"
      );
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(
        `bbfind-filters:${directoryLocation.pathname}`,
        filtersOpen ? "open" : "closed",
      );
    } catch {}
  }, [filtersOpen, directoryLocation.pathname]);
  const filterId = useId();
  const [params, setLocalParams] = useState(urlParams);
  const currentFilters = useRef(urlParams);
  const requested = useRef<string | null>(null);
  useEffect(() => {
    const legacyPeriod = urlParams.get("period");
    if (
      events &&
      legacyPeriod &&
      ["upcoming", "past", "all"].includes(legacyPeriod)
    ) {
      const next = new URLSearchParams(urlParams);
      next.set("period", "custom");
      if (legacyPeriod === "upcoming" && !next.has("from"))
        next.set("from", localToday());
      if (legacyPeriod === "past" && !next.has("to")) {
        const yesterday = new Date(`${localToday()}T00:00:00Z`);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        next.set("to", yesterday.toISOString().slice(0, 10));
      }
      setParams(next, { replace: true, preventScrollReset: true });
      return;
    }
    if (urlParams.get("age") === "All") {
      const next = new URLSearchParams(urlParams);
      next.delete("age");
      setParams(next, { replace: true, preventScrollReset: true });
      return;
    }
    if (
      requested.current === null ||
      urlParams.toString() === requested.current
    ) {
      currentFilters.current = urlParams;
      setLocalParams(urlParams);
      requested.current = null;
    }
  }, [urlParams, setParams, events]);
  const update = (next: URLSearchParams) => {
    currentFilters.current = next;
    requested.current = next.toString();
    setLocalParams(next);
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(currentFilters.current);
    value ? next.set(key, value) : next.delete(key);
    update(next);
  };
  const q = params.get("q") || "",
    category = params.get("category") || "",
    suburb = params.get("suburb") || "",
    sort = params.get("sort") || "recommended";
  const availableCategories = [
    ...new Set([...categories, ...listings.flatMap((l) => l.categories)]),
  ].sort((a, b) => a.localeCompare(b));
  const availableLocations = [
    ...new Set([...locations, ...listings.map((l) => l.suburb)]),
  ];
  const today = localToday();
  const datePeriod = eventPeriods.some(
    (period) => period.value === params.get("period"),
  )
    ? params.get("period")!
    : params.has("from") || params.has("to")
      ? "custom"
      : "month";
  const dateRange = eventDateRange(
    datePeriod,
    today,
    params.get("from") || "",
    params.get("to") || "",
  );
  const filtered = listings
    .filter(
      (l) =>
        (events
          ? l.type === "event" && Boolean(l.eventStartDate)
          : venues
            ? l.type === "venue"
            : l.type !== "event") &&
        matchesAge(l, params.get("age") || "") &&
        (!events ||
          ((!dateRange.from ||
            (l.eventEndDate || l.eventStartDate) >= dateRange.from) &&
            (!dateRange.to || l.eventStartDate <= dateRange.to))) &&
        matchesSearch(l, q) &&
        (!category || l.categories.includes(category)) &&
        (!suburb || l.suburb === suburb) &&
        (!params.get("free") || isFreeListing(l)) &&
        (!params.get("capacity") ||
          l.capacity >= Number(params.get("capacity"))) &&
        (!params.get("kitchen") || l.kitchen) &&
        (!params.get("accessible") || l.accessible) &&
        (!params.get("outdoor") || l.outdoor) &&
        (!params.get("indoor") || Boolean(l.roomType)) &&
        (!params.get("room") ||
          l.roomType
            .toLowerCase()
            .includes(params.get("room")!.toLowerCase())) &&
        (!params.get("use") ||
          l.suitableFor
            .toLowerCase()
            .includes(params.get("use")!.toLowerCase())) &&
        (!params.get("price") ||
          isFreeListing(l) ||
          (l.price > 0 && l.price <= Number(params.get("price")))),
    )
    .sort((a, b) =>
      events
        ? a.eventStartDate.localeCompare(b.eventStartDate) ||
          a.name.localeCompare(b.name)
        : sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "capacity"
            ? a.capacity - b.capacity
            : Number(b.featured) - Number(a.featured) ||
              a.name.localeCompare(b.name),
    );
  return (
    <>
      <section
        className={`page-intro feature-intro feature-theme feature-theme-${events ? "event" : venues ? "venue" : "activity"} ${events ? "intro-events" : venues ? "intro-venues" : "intro-find"}`}
      >
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link>
            <ChevronRight size={12} />
            {events ? "Events" : venues ? "Venues for hire" : "Find It"}
          </div>
          <div className="feature-intro-grid">
            <div className="feature-intro-copy">
              <span className="feature-label">
                {events ? (
                  <CalendarDays size={19} />
                ) : venues ? (
                  <Building2 size={19} />
                ) : (
                  <Users size={19} />
                )}
                {events ? "Events" : venues ? "Venues for Hire" : "Find It"}
              </span>
              <span className="eyebrow">
                {events
                  ? "WHAT’S HAPPENING LOCALLY"
                  : venues
                    ? "A SPACE FOR EVERY OCCASION"
                    : "A WORLD OF LOCAL POSSIBILITIES"}
              </span>
              <h1>
                {events
                  ? "Your community calendar."
                  : venues
                    ? "Bring people together."
                    : "Find your kind of community."}
              </h1>
              <p>
                {events
                  ? "Explore events in calendar date order. Choose a week, month or your own dates."
                  : venues
                    ? "Discover local rooms, halls and spaces for your next gathering."
                    : "People, places and possibilities. There’s something here for you."}
              </p>
              <form
                className="search-box"
                role="search"
                onSubmit={(e) => e.preventDefault()}
              >
                <Search size={21} />
                <label className="sr-only" htmlFor="directory-search">
                  Search the directory
                </label>
                <input
                  id="directory-search"
                  value={q}
                  placeholder={
                    events
                      ? "Search events, names or interests…"
                      : venues
                        ? "Search venues, facilities or activities…"
                        : "Search names, interests, activities…"
                  }
                  onChange={(e) => set("q", e.target.value)}
                />
                {q && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Clear search"
                    onClick={() => set("q", "")}
                  >
                    <X size={18} />
                  </button>
                )}
              </form>
            </div>
            <div className="feature-art" aria-hidden="true">
              {events ? (
                <div className="calendar-art">
                  <span>THE COMMUNITY CALENDAR</span>
                  <CalendarDays size={112} strokeWidth={1} />
                  <strong>
                    Make a date
                    <br />
                    with your community.
                  </strong>
                </div>
              ) : venues ? (
                <>
                  <Illustration kind="hall" />
                  <span className="feature-art-note">
                    ROOMS · HALLS · MEETING SPACES
                  </span>
                </>
              ) : (
                <>
                  <Illustration kind="garden" />
                  <span className="feature-art-note">
                    PEOPLE · ACTIVITIES · SERVICES
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
      <section
        className={`container directory-layout feature-theme feature-theme-${events ? "event" : venues ? "venue" : "activity"} ${events ? "directory-events" : venues ? "directory-venues" : "directory-find"}`}
      >
        <div className="filter-column">
          <button
            type="button"
            className="button secondary mobile-filter-toggle"
            aria-expanded={filtersOpen}
            aria-controls={filterId}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            Filters {params.size > 0 && `(${params.size})`}
          </button>
          <aside
            id={filterId}
            className={`filters ${filtersOpen ? "filters-open" : "filters-collapsed"}`}
          >
            <h2>
              <SlidersHorizontal size={18} />{" "}
              {events
                ? "Plan your visit"
                : venues
                  ? "Find your space"
                  : "Find a good fit"}
            </h2>
            {!events && !venues && (
              <label>
                Category
                <select
                  aria-label="Category"
                  value={category}
                  onChange={(e) => set("category", e.target.value)}
                >
                  <option value="">All categories</option>
                  {availableCategories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            )}
            <PriorityNeighbourhoods
              locations={availableLocations}
              value={suburb}
              onChange={(v) => set("suburb", v)}
            />
            <label>
              Neighbourhood
              <select
                aria-label="Neighbourhood"
                value={suburb}
                onChange={(e) => set("suburb", e.target.value)}
              >
                <option value="">All neighbourhoods</option>
                <NeighbourhoodOptions locations={availableLocations} />
              </select>
            </label>
            {!venues && (
              <label>
                Suitable Ages
                <select
                  aria-label="Suitable Ages"
                  value={params.get("age") || ""}
                  onChange={(e) => set("age", e.target.value)}
                >
                  <option value="">Any age</option>
                  {suitableAges.map((age) => (
                    <option key={age}>{age}</option>
                  ))}
                </select>
              </label>
            )}
            {events && (
              <>
                <label>
                  Show events
                  <select
                    aria-label="Show events"
                    value={datePeriod}
                    onChange={(e) => {
                      const next = new URLSearchParams(currentFilters.current);
                      next.set("period", e.target.value);
                      next.delete("from");
                      next.delete("to");
                      update(next);
                    }}
                  >
                    {eventPeriods.map((period) => (
                      <option key={period.value} value={period.value}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                </label>
                {datePeriod === "custom" && (
                  <>
                    <label>
                      From date
                      <input
                        type="date"
                        value={params.get("from") || ""}
                        onChange={(e) => set("from", e.target.value)}
                      />
                    </label>
                    <label>
                      To date
                      <input
                        type="date"
                        min={params.get("from") || undefined}
                        value={params.get("to") || ""}
                        onChange={(e) => set("to", e.target.value)}
                      />
                    </label>
                  </>
                )}
              </>
            )}
            <label className="check-label">
              <input
                type="checkbox"
                checked={Boolean(params.get("free"))}
                onChange={(e) => set("free", e.target.checked ? "true" : "")}
              />
              Free only
            </label>
            {venues && (
              <>
                <label>
                  People to accommodate
                  <input
                    type="number"
                    min="0"
                    value={params.get("capacity") || ""}
                    onChange={(e) => set("capacity", e.target.value)}
                    placeholder="Any capacity"
                  />
                </label>
                <label>
                  Room type
                  <input
                    value={params.get("room") || ""}
                    onChange={(e) => set("room", e.target.value)}
                    placeholder="e.g. hall, meeting room"
                  />
                </label>
                <label>
                  Suitable activity
                  <input
                    value={params.get("use") || ""}
                    onChange={(e) => set("use", e.target.value)}
                    placeholder="e.g. workshop"
                  />
                </label>
                <label>
                  Maximum hourly price ($)
                  <input
                    type="number"
                    min="0"
                    value={params.get("price") || ""}
                    onChange={(e) => set("price", e.target.value)}
                    placeholder="Any price"
                  />
                </label>
                {[
                  ["kitchen", "Kitchen facilities"],
                  ["accessible", "Accessible venue"],
                  ["indoor", "Indoor space"],
                  ["outdoor", "Outdoor space"],
                ].map(([k, label]) => (
                  <label key={k} className="check-label">
                    <input
                      type="checkbox"
                      checked={Boolean(params.get(k))}
                      onChange={(e) => set(k, e.target.checked ? "true" : "")}
                    />
                    {label}
                  </label>
                ))}
              </>
            )}
            {params.size > 0 && (
              <button
                className="text-button"
                onClick={() => update(new URLSearchParams())}
              >
                Clear all filters <X size={13} />
              </button>
            )}
          </aside>
        </div>
        <div>
          {!!params.size && (
            <div className="active-filters" aria-label="Selected filters">
              {[...params].map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  className="filter-chip"
                  onClick={() => set(key, "")}
                  aria-label={`Remove ${key === "q" ? "search" : key} filter`}
                >
                  {(
                    {
                      q: "Search",
                      category: "Category",
                      suburb: "Neighbourhood",
                      age: "Age",
                      free: "Free",
                      capacity: "Capacity",
                      price: "Max hourly price",
                      from: "From",
                      to: "To",
                      period: "Dates",
                      room: "Room",
                      use: "Use",
                    } as Record<string, string>
                  )[key] || key}
                  :{" "}
                  {key === "period"
                    ? eventPeriods.find((period) => period.value === value)
                        ?.label || value
                    : value === "true"
                      ? "Yes"
                      : value}{" "}
                  <X size={12} />
                </button>
              ))}
              <button
                className="text-button"
                onClick={() => update(new URLSearchParams())}
              >
                Clear filters
              </button>
            </div>
          )}
          <div className="results-toolbar">
            <span>
              <strong>{filtered.length}</strong>{" "}
              {events
                ? filtered.length === 1
                  ? "event"
                  : "events"
                : venues
                  ? filtered.length === 1
                    ? "venue"
                    : "venues"
                  : filtered.length === 1
                    ? "possibility"
                    : "possibilities"}{" "}
              to explore
            </span>
            {events ? (
              <span className="help">Event date · earliest first</span>
            ) : (
              <label className="sort-label">
                Sort by
                <select
                  value={sort}
                  onChange={(e) => set("sort", e.target.value)}
                >
                  <option value="recommended">Recommended</option>
                  <option value="name">Name A–Z</option>
                  {venues && <option value="capacity">Capacity</option>}
                </select>
              </label>
            )}
          </div>
          {events ? (
            <div className="event-agenda">
              {filtered.map((item, index) => {
                const month = item.eventStartDate.slice(0, 7);
                const firstOfMonth =
                  index === 0 ||
                  filtered[index - 1].eventStartDate.slice(0, 7) !== month;
                return (
                  <div key={item.id}>
                    {firstOfMonth && (
                      <h2 className="agenda-month">
                        {new Intl.DateTimeFormat("en-NZ", {
                          month: "long",
                          year: "numeric",
                          timeZone: "Pacific/Auckland",
                        }).format(new Date(`${item.eventStartDate}T00:00:00Z`))}
                      </h2>
                    )}
                    <ListingCard item={item} agenda />
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className={`listing-grid two${venues ? " venue-results" : ""}`}
            >
              {filtered.map((item) => (
                <ListingCard item={item} key={item.id} venueDetails={venues} />
              ))}
            </div>
          )}
          {!filtered.length && <Empty />}
        </div>
      </section>
    </>
  );
}
function ListingPage() {
  const { listings } = useApp();
  const location = useLocation();
  const id = decodeURIComponent(location.pathname.split("/").pop() || "");
  const item = listings.find((l) => l.id === id);
  const [images, setImages] = useState<ImageRecord[]>([]),
    [imageError, setImageError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    setImages([]);
    setImageError("");
    void publicImages(id)
      .then(setImages)
      .catch((e) => setImageError(e.message));
  }, [id]);
  useEffect(() => {
    if (item) document.title = `${item.name} — BBFind`;
  }, [item]);
  if (!item)
    return (
      <div className="container page">
        <h1>Listing unavailable</h1>
        <p>This listing may not be published yet.</p>
        <ButtonLink to="/find">Back to the directory</ButtonLink>
      </div>
    );
  const fallback =
    item.type === "event"
      ? "/events"
      : item.type === "venue"
        ? "/venues"
        : "/find";
  const back =
    typeof location.state?.from === "string" &&
    /^\/(find|events|venues)(\?|$)/.test(location.state.from)
      ? location.state.from
      : fallback;
  const primary = listingAction(item);
  return (
    <div
      className={`container page feature-theme feature-theme-${item.type === "event" ? "event" : item.type === "venue" ? "venue" : "activity"}`}
    >
      <Link className="text-button back-link" to={back}>
        ← Back to results
      </Link>
      <div className="breadcrumb">
        <Link to={fallback}>
          {item.type === "event"
            ? "Events"
            : item.type === "venue"
              ? "Venues for Hire"
              : "Find It"}
        </Link>
        <ChevronRight size={12} />
        {item.name}
      </div>
      <div className="detail-layout">
        <article>
          <span className="eyebrow">
            {item.type === "venue" ? "VENUE FOR HIRE" : item.type.toUpperCase()}{" "}
            · {item.suburb.toUpperCase()}
          </span>
          <h1>{item.name}</h1>
          <p className="lead">{item.summary}</p>
          <div className="tags">
            {item.categories.map((c) => (
              <Link
                key={c}
                to={`${item.type === "event" ? "/events" : "/find"}?category=${encodeURIComponent(c)}`}
              >
                {c}
              </Link>
            ))}
            {item.verified && (
              <span>
                <CheckCircle2 size={15} /> BBCN verified
              </span>
            )}
          </div>
          {images.length || (!configured && item.demoImages?.length) ? (
            <ImageGallery
              images={images}
              demoImages={!configured ? item.demoImages : undefined}
            />
          ) : (
            <div className="detail-illustration">
              <Illustration kind={item.illustration || "support"} />
              <span>Illustration</span>
            </div>
          )}
          {imageError && (
            <Message error>Could not load gallery: {imageError}</Message>
          )}
          {item.type === "event" && (
            <section className="event-date-panel">
              <h2>When it’s happening</h2>
              <p>
                <time dateTime={item.eventStartDate}>
                  {formatEventDate(item.eventStartDate)}
                </time>
                {item.eventEndDate &&
                  item.eventEndDate !== item.eventStartDate && (
                    <>
                      {" "}
                      –{" "}
                      <time dateTime={item.eventEndDate}>
                        {formatEventDate(item.eventEndDate)}
                      </time>
                    </>
                  )}
              </p>
              <small>
                Dates and times are local to New Zealand. Check with the
                organiser before attending.
              </small>
            </section>
          )}
          <h2>
            {item.type === "event" ? "About this event" : "A little about us"}
          </h2>
          <p className="preserve">{item.description}</p>
          {!configured && (item.sourceUrl || item.sourceNote) && (
            <div className="demo-source">
              <strong>About this sample listing</strong>
              <p>
                Based on public information checked {item.sourceChecked}. It has
                not been submitted or approved by the organisation or BBCN.
                Please confirm current times, costs and availability directly.
              </p>
              {item.sourceNote && <p>{item.sourceNote}</p>}
              {item.sourceUrl && (
                <a
                  href={publicUrl(item.sourceUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View the official information <ArrowUpRight size={15} />
                </a>
              )}
            </div>
          )}
          {!!item.suitableAges?.length && (
            <>
              <h3>Suitable ages</h3>
              <p>{item.suitableAges.join(", ")}</p>
            </>
          )}
          {item.ageGroups && (
            <>
              <h3>Who it’s for</h3>
              <p>{item.ageGroups}</p>
            </>
          )}
          {item.type === "venue" && (
            <>
              <h2>A space that fits</h2>
              <div className="facility-grid">
                {[
                  [
                    "Capacity",
                    item.capacity > 0
                      ? `${item.capacity} people`
                      : "Capacity not supplied",
                  ],
                  ["Space", item.roomType],
                  ["Kitchen", item.kitchen ? "Available" : "Not specified"],
                  ["Accessible", item.accessible ? "Yes" : "Not specified"],
                  [
                    "Outdoor space",
                    item.outdoor ? "Available" : "Not specified",
                  ],
                  ["Wi-Fi", item.wifi ? "Available" : "Not specified"],
                  ["Parking", item.parking ? "Available" : "Not specified"],
                  ["AV equipment", item.av ? "Available" : "Not specified"],
                  ["Toilets", item.toilets ? "Available" : "Not specified"],
                ].map(([a, b]) => (
                  <div key={a}>
                    <small>{a}</small>
                    <strong>{b || "Not specified"}</strong>
                  </div>
                ))}
              </div>
              {[
                ["Rooms & layouts", item.spaces],
                ["Facilities", item.facilities],
                ["Suitable for", item.suitableFor],
                ["Availability", item.availability],
              ].map(
                ([a, b]) =>
                  b && (
                    <div key={a}>
                      <h3>{a}</h3>
                      <p className="preserve">{b}</p>
                    </div>
                  ),
              )}
            </>
          )}
          {item.accessibility && (
            <>
              <h3>Accessibility</h3>
              <p>{item.accessibility}</p>
            </>
          )}
        </article>
        <aside className="contact-panel">
          <span className="eyebrow">MAKE A CONNECTION</span>
          <h2>Good to know</h2>
          {primary && (
            <a
              className="button listing-primary-action"
              href={primary.href}
              {...(primary.href.startsWith("http")
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
            >
              {primary.label} <ArrowUpRight size={16} />
            </a>
          )}
          {item.organisation_name && <p>Part of {item.organisation_name}</p>}
          {item.address && (
            <p>
              <MapPin size={18} />
              {item.address}, {item.suburb}
            </p>
          )}
          {item.times && (
            <p>
              <Clock size={18} />
              {item.times}
            </p>
          )}
          {(item.cost || item.type === "venue") && (
            <p>
              <Heart size={18} />
              {item.type === "venue" ? venuePriceLabel(item) : item.cost}
            </p>
          )}
          {item.publicContact && (
            <p>
              <Users size={18} />
              {item.publicContact}
            </p>
          )}
          {item.publicPhone && (
            <a href={`tel:${item.publicPhone.replace(/[^+\d]/g, "")}`}>
              <Phone size={18} />
              {item.publicPhone}
            </a>
          )}
          {item.publicEmail && (
            <a href={`mailto:${item.publicEmail}`}>
              <Mail size={18} />
              {item.publicEmail}
            </a>
          )}
          {item.website &&
            publicUrl(item.website) &&
            primary?.href !== publicUrl(item.website) && (
              <a
                className="button secondary"
                href={publicUrl(item.website)}
                target="_blank"
                rel="noreferrer"
              >
                Visit website <ArrowUpRight size={16} />
              </a>
            )}
          {item.bookingUrl &&
            publicUrl(item.bookingUrl) &&
            primary?.href !== publicUrl(item.bookingUrl) && (
              <a
                className="button secondary"
                href={publicUrl(item.bookingUrl)}
                target="_blank"
                rel="noreferrer"
              >
                Booking information <ArrowUpRight size={16} />
              </a>
            )}
          {item.socialLinks
            ?.split("\n")
            .filter(Boolean)
            .map(
              (url) =>
                publicUrl(url) && (
                  <a
                    key={url}
                    href={publicUrl(url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Globe size={16} />
                    {new URL(url).hostname}
                  </a>
                ),
            )}
          {!configured && (
            <Message>
              Community sample listing. Check the organisation’s official
              website for current information and enquiries.
            </Message>
          )}
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                setNotice("Link copied.");
              } catch {
                setNotice(
                  "Copy the address from your browser to share this listing.",
                );
              }
            }}
          >
            Copy listing link
          </button>
          {notice && <Message>{notice}</Message>}
        </aside>
      </div>
    </div>
  );
}
function GetFound() {
  return (
    <>
      <section className="page-intro">
        <div className="container narrow">
          <span className="eyebrow">
            YOU DO GOOD THINGS. LET’S SPREAD THE WORD.
          </span>
          <h1>Your community is looking for you.</h1>
          <p>
            A free place for local organisations, groups and businesses to share
            what they do.
          </p>
          <AccountLink path="/account?mode=register">
            Add your organisation <ArrowRight size={18} />
          </AccountLink>
        </div>
      </section>
      <div className="container page">
        <ListingChooser />
      </div>
      <section className="container page narrow">
        <h2>One account. All your possibilities.</h2>
        <p>
          Your organisation can have its own profile, plus separate listings for
          every programme, activity, service or venue you offer. Each gets its
          own information, photographs and shareable page.
        </p>
        <div className="steps vertical">
          <div>
            <span>01</span>
            <h3>Tell us who you are</h3>
            <p>
              Create your organisation account and verify your email.
              Registration contact details stay private.
            </p>
          </div>
          <div>
            <span>02</span>
            <h3>Share what you do</h3>
            <p>
              Add a listing and images. You can save a draft and return when
              you’re ready.
            </p>
          </div>
          <div>
            <span>03</span>
            <h3>Get found</h3>
            <p>
              BBCN reviews listings and images before publication. You can
              manage everything in your dashboard.
            </p>
          </div>
        </div>
        <Message>
          Updates go through review too. Your approved listing and images stay
          visible while proposed changes are checked.
        </Message>
      </section>
    </>
  );
}
function About() {
  return (
    <section className="container page narrow">
      <span className="eyebrow">LOCAL ROOTS. OPEN DOORS.</span>
      <h1>A little closer to your community.</h1>
      <p className="lead">
        BBFind is a community directory for Burnside, Bryndwr and the wider
        Burnside–Harewood area of Ōtautahi Christchurch.
      </p>
      <h2>Good things happen when we connect.</h2>
      <p>
        Our neighbourhood is full of people doing good things. This directory
        helps you discover local organisations, programmes, activities, services
        and spaces — and makes it easier for those organisations to be found.
      </p>
      <h2>Made for everyone</h2>
      <p>
        Browse without an account. Search by interest or suburb. Explore venues
        for your next gathering. Organisations can create one free account to
        manage multiple listings, with BBCN review before anything is published.
      </p>
      <p>
        BBCN is the Burnside Bryndwr Community Network. Learn more at{" "}
        <a href="https://bbcn.org.nz/">bbcn.org.nz</a>.
      </p>
      <ButtonLink to="/find">
        Find your community <ArrowRight size={18} />
      </ButtonLink>
    </section>
  );
}
function Privacy() {
  return (
    <section className="container page narrow">
      <span className="eyebrow">YOUR INFORMATION MATTERS</span>
      <h1>Privacy & your information</h1>
      <p>
        Browsing this directory does not require an account. Organisation
        registration collects an account name, contact name, email and phone
        number so BBCN can administer the directory. Passwords are handled by
        the authentication service.
      </p>
      <h2>Private means private</h2>
      <p>
        Registration contacts are visible only to your organisation and
        authorised BBCN administrators. Public contact information is entered
        separately on each listing. Drafts, pending changes, original uploads
        and review notes are private.
      </p>
      <h2>Images and publication</h2>
      <p>
        Upload only images you have permission to share, including permission
        from identifiable people where appropriate. Embedded image metadata is
        removed during processing. Approved images and listing details can be
        seen and copied by anyone; publication cannot recall downloaded copies.
      </p>
      <h2>Your choices</h2>
      <p>
        Your dashboard provides an account data export and a deletion request.
        Deletion requests are processed by BBCN and can involve withdrawing
        listings and removing images. No audit or revision-history feature is
        retained. Operational backups may retain deleted data until their
        retention period expires.
      </p>
      <h2>Before public launch</h2>
      <p>
        This privacy statement must be completed by BBCN with an authorised
        privacy contact, storage region, backup retention period and response
        process before real registrations open. Visit{" "}
        <a href="https://bbcn.org.nz/">BBCN’s website</a> for its existing
        contact information.
      </p>
    </section>
  );
}
