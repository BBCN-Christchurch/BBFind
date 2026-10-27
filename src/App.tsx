import {
  createContext,
  useContext,
  useEffect,
  useRef,
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
  matchesSearch,
  publicUrl,
  suburbs,
  type Listing,
  type ImageRecord,
} from "./domain";
import { Illustration, Neighbourhood } from "./Illustration";
import { AuthPage, Dashboard, ResetPassword } from "./Accounts";
import { Admin } from "./Admin";
import { ImageGallery } from "./Images";
export const AppContext = createContext<{
  auth: SessionContext;
  refreshAuth: () => Promise<void>;
  listings: Listing[];
  refreshListings: () => Promise<void>;
  categories: string[];
  locations: string[];
}>({
  auth: { session: null, account: null, admin: false },
  refreshAuth: async () => {},
  listings: [],
  refreshListings: async () => {},
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
      setListings(await getPublicListings());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
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
    void Promise.all([
      db.from("categories").select("name").eq("active", true).order("name"),
      db.from("locations").select("name").eq("active", true).order("name"),
    ]).then(([c, l]) => {
      if (c.data) setCategories(c.data.map((v) => v.name));
      if (l.data) setLocations(l.data.map((v) => v.name));
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    setMobile(false);
    window.scrollTo(0, 0);
    const detail = listings.find(
      (i) => location.pathname === `/listing/${i.id}`,
    );
    document.title = detail
      ? `${detail.name} — BBFind`
      : location.pathname === "/"
        ? "BBFind — Your community, connected."
        : `${location.pathname.startsWith("/venues") ? "Venues for hire" : location.pathname.startsWith("/dashboard") ? "Your organisation" : location.pathname.startsWith("/admin") ? "BBCN administration" : "Community directory"} — BBFind`;
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
          detail.type === "venue"
            ? "Place"
            : detail.type === "business"
              ? "LocalBusiness"
              : detail.type === "organisation"
                ? "Organization"
                : "Service",
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
      }}
    >
      <a className="skip" href="#main">
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
            <NavLink to="/get-found">Get Found</NavLink>
            <NavLink to="/venues">Venues for Hire</NavLink>
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
            — listings are fictional examples, not real services or venues.
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
            <Route path="/find" element={<Directory />} />
            <Route path="/venues" element={<Directory venues />} />
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
  const { listings } = useApp();
  const featured = listings.filter((l) => l.featured).slice(0, 3);
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
            {categoryTiles.map(({ name, value, icon: Icon, color }) => (
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
            ))}
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
                  : "A glimpse of what your directory could look like. All examples below are fictional."}
              </p>
            </div>
            <Link className="arrow-link" to="/find">
              Find your thing <ArrowRight size={17} />
            </Link>
          </div>
          <div className="listing-grid">
            {(featured.length ? featured : listings.slice(0, 3)).map((item) => (
              <ListingCard key={item.id} item={item} />
            ))}
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
        <div className="container venue-teaser">
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
export function ListingCard({ item }: { item: Listing }) {
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
    <article className="listing-card">
      <Link
        to={`/listing/${item.id}`}
        className="card-visual"
        tabIndex={-1}
        aria-hidden="true"
      >
        {cover ? (
          <img src={cover} alt="" loading="lazy" />
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
        </span>
        <h3>
          <Link to={`/listing/${item.id}`}>
            {item.name}
            <ArrowUpRight size={19} />
          </Link>
        </h3>
        <p>{item.summary}</p>
        <div className="card-bottom">
          <span>{item.categories[0]}</span>
          {item.type === "venue" ? (
            <span>{item.capacity} people</span>
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
function Directory({ venues = false }: { venues?: boolean }) {
  const { listings, categories, locations } = useApp();
  const [urlParams, setParams] = useSearchParams();
  const [params, setLocalParams] = useState(urlParams);
  const currentFilters = useRef(urlParams);
  const requested = useRef<string | null>(null);
  useEffect(() => {
    if (
      requested.current === null ||
      urlParams.toString() === requested.current
    ) {
      currentFilters.current = urlParams;
      setLocalParams(urlParams);
      requested.current = null;
    }
  }, [urlParams]);
  const update = (next: URLSearchParams) => {
    currentFilters.current = next;
    requested.current = next.toString();
    setLocalParams(next);
    setParams(next);
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
  const filtered = listings
    .filter(
      (l) =>
        (!venues || l.type === "venue") &&
        matchesSearch(l, q) &&
        (!category || l.categories.includes(category)) &&
        (!suburb || l.suburb === suburb) &&
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
          (l.price > 0 && l.price <= Number(params.get("price")))),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "capacity"
          ? a.capacity - b.capacity
          : Number(b.featured) - Number(a.featured) ||
            a.name.localeCompare(b.name),
    );
  return (
    <>
      <section className="page-intro">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link>
            <ChevronRight size={12} />
            {venues ? "Venues for hire" : "Find It"}
          </div>
          <span className="eyebrow">
            {venues
              ? "A SPACE FOR EVERY OCCASION"
              : "A WORLD OF LOCAL POSSIBILITIES"}
          </span>
          <h1>
            {venues ? "Bring people together." : "Find your kind of community."}
          </h1>
          <p>
            {venues
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
                venues
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
      </section>
      <section className="container directory-layout">
        <aside className="filters">
          <h2>
            <SlidersHorizontal size={18} /> Find a good fit
          </h2>
          <label>
            Category
            <select
              aria-label="Category"
              value={category}
              onChange={(e) => set("category", e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Neighbourhood
            <select
              aria-label="Neighbourhood"
              value={suburb}
              onChange={(e) => set("suburb", e.target.value)}
            >
              <option value="">All neighbourhoods</option>
              {locations.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
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
        <div>
          <div className="results-toolbar">
            <span>
              <strong>{filtered.length}</strong>{" "}
              {filtered.length === 1 ? "possibility" : "possibilities"} to
              explore
            </span>
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
          </div>
          <div className="listing-grid two">
            {filtered.map((item) => (
              <ListingCard item={item} key={item.id} />
            ))}
          </div>
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
  return (
    <div className="container page">
      <div className="breadcrumb">
        <Link to="/find">Find It</Link>
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
              <Link key={c} to={`/find?category=${encodeURIComponent(c)}`}>
                {c}
              </Link>
            ))}
            {item.verified && (
              <span>
                <CheckCircle2 size={15} /> BBCN verified
              </span>
            )}
          </div>
          {images.length ? (
            <ImageGallery images={images} />
          ) : (
            <div className="detail-illustration">
              <Illustration kind={item.illustration || "support"} />
              <span>Illustration</span>
            </div>
          )}
          {imageError && (
            <Message error>Could not load gallery: {imageError}</Message>
          )}
          <h2>A little about us</h2>
          <p className="preserve">{item.description}</p>
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
                  ["Capacity", `${item.capacity} people`],
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
          {item.cost && (
            <p>
              <Heart size={18} />
              {item.cost}
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
          {item.website && publicUrl(item.website) && (
            <a
              className="button"
              href={publicUrl(item.website)}
              target="_blank"
              rel="noreferrer"
            >
              Visit website <ArrowUpRight size={16} />
            </a>
          )}
          {item.bookingUrl && publicUrl(item.bookingUrl) && (
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
              This is a fictional example. No bookings, activities or contact
              details are available.
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
