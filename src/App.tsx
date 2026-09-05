import { useEffect, useRef } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  Film,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

import { ReleaseCalendar } from "./calendar/ReleaseCalendar";

const pages = [
  { to: "/releases", label: "Releases", icon: CalendarDays },
  { to: "/starred", label: "Starred", icon: Star },
  { to: "/friends", label: "Friends", icon: Users },
];

function Releases({ active }: { active: boolean }) {
  return (
    <>
      <section className="intro" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">
            <span /> THE BIG SCREEN, ON YOUR RADAR
          </p>
          <h1 id="page-title">
            Make time
            <br />
            for <em>cinema.</em>
          </h1>
          <p className="intro-copy">
            The films on their way. The ones you can’t wait for.
            <br className="desktop-break" /> A little more to look forward to.
          </p>
        </div>
        <div className="ticket" aria-hidden="true">
          <div className="ticket-top">
            <Film size={22} />
            <span>ADMIT YOURSELF</span>
            <Sparkles size={18} />
          </div>
          <div className="ticket-title">
            Something
            <br />
            worth seeing.
          </div>
          <div className="ticket-bottom">
            <span>GOOD FILMS. GREAT COMPANY.</span>
            <ArrowUpRight size={23} />
          </div>
        </div>
      </section>
      <ReleaseCalendar active={active} />
      <div className="how-it-works" aria-label="What you can look forward to">
        <div>
          <span className="step">01</span>
          <div>
            <h3>Find your next film</h3>
            <p>A month at a time. A world to discover.</p>
          </div>
        </div>
        <div>
          <span className="step">02</span>
          <div>
            <h3>Keep the good ones close</h3>
            <p>Star the films you don’t want to miss.</p>
          </div>
        </div>
        <div>
          <span className="step">03</span>
          <div>
            <h3>Make a night of it</h3>
            <p>See what your friends want to watch.</p>
          </div>
        </div>
      </div>
    </>
  );
}

function PersonalPage({ kind }: { kind: "starred" | "friends" }) {
  const starred = kind === "starred";
  const Icon = starred ? Star : Users;
  return (
    <section className="personal-page" aria-labelledby="page-title">
      <p className="eyebrow">
        {starred ? "YOUR NEXT GREAT WATCH" : "BETTER IN GOOD COMPANY"}
      </p>
      <h1 id="page-title">
        {starred ? "Worth the " : "Bring your "}
        <em>{starred ? "wait." : "people."}</em>
      </h1>
      <div className="empty-state">
        <div className="empty-icon">
          <Icon size={28} strokeWidth={1.5} />
        </div>
        <h2>
          {starred
            ? "A place for your must-sees."
            : "Cinema is better together."}
        </h2>
        <p>
          {starred
            ? "Soon you’ll be able to save the films you’re looking forward to and find them here."
            : "Friend connections are coming soon. You’ll be able to see the films you both want to watch."}
        </p>
        <Link className="text-link" to="/releases">
          Back to releases <ArrowUpRight size={17} />
        </Link>
      </div>
    </section>
  );
}

export function App() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    const page = pages.find((p) => p.to === location.pathname);
    document.title = `${page?.label ?? "Upcoming"} · Upcoming`;
    if (previousPath.current !== location.pathname) {
      mainRef.current?.focus({ preventScroll: true });
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/releases" aria-label="Upcoming home">
            <span className="brand-mark" aria-hidden="true">
              u<span />
            </span>
            upcoming<span className="brand-dot">.</span>
          </Link>
          <nav aria-label="Main navigation">
            {pages.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to}>
                <Icon size={18} strokeWidth={1.7} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <span className="edition">
            THE UK EDITION <span />
          </span>
        </div>
      </header>
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        <div
          hidden={
            location.pathname !== "/" && location.pathname !== "/releases"
          }
        >
          <Releases
            active={
              location.pathname === "/" || location.pathname === "/releases"
            }
          />
        </div>
        <Routes>
          <Route path="/" element={<Navigate to="/releases" replace />} />
          <Route path="/releases" element={null} />
          <Route path="/starred" element={<PersonalPage kind="starred" />} />
          <Route path="/friends" element={<PersonalPage kind="friends" />} />
          <Route
            path="*"
            element={
              <section className="personal-page">
                <h1>
                  Lost the <em>plot?</em>
                </h1>
                <p>That page isn’t here.</p>
                <Link className="text-link" to="/releases">
                  Back to releases <ArrowUpRight size={17} />
                </Link>
              </section>
            }
          />
        </Routes>
      </main>
      <footer>
        <div className="footer-top">
          <span>Less scrolling. More cinema.</span>
          <span>
            Made for the love of film <Film size={14} />
          </span>
        </div>
        <section className="credits" aria-label="About and credits">
          <a href="https://www.themoviedb.org" aria-label="The Movie Database">
            <img
              width="110"
              height="15"
              alt="TMDB"
              src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_long_2-9665a76b1ae401a510ec1e0ca40ddcb3b0cfe45f1d51b77a308fea0845885648.svg"
            />
          </a>
          <p>
            This product uses the TMDB API but is not endorsed or certified by
            TMDB.
          </p>
        </section>
      </footer>
    </>
  );
}
