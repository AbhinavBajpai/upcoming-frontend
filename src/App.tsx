import { FriendsPage } from "./friends/FriendsPage";
import { StarProvider } from "./stars/StarProvider";
import { StarredPage } from "./stars/StarredPage";
import { StarNotice } from "./stars/StarNotice";
import { useEffect, useRef } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ArrowUpRight, CalendarDays, Star, Users } from "lucide-react";

import { AccountProvider } from "./accounts/AccountProvider";
import { AccountPage } from "./accounts/AccountPage";
import { useAccount } from "./accounts/context";
import { ReleaseCalendar } from "./calendar/ReleaseCalendar";

const pages = [
  { to: "/releases", label: "Releases", icon: CalendarDays },
  { to: "/starred", label: "Watch list", icon: Star },
  { to: "/friends", label: "Friends", icon: Users },
];

function Releases({ active }: { active: boolean }) {
  return (
    <>
      <h1 className="page-heading" id="page-title">
        Releases
      </h1>
      <ReleaseCalendar active={active} />
    </>
  );
}

export function App() {
  return (
    <AccountProvider>
      <StarProvider>
        <AppContent />
      </StarProvider>
    </AccountProvider>
  );
}

function AppContent() {
  const { user } = useAccount();
  const location = useLocation();
  const isAccountPage = [
    "/login",
    "/signup",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
    "/account",
  ].includes(location.pathname);
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    const page = pages.find(
      (p) =>
        p.to === location.pathname ||
        (p.to === "/friends" && location.pathname.startsWith("/friends/")),
    );
    document.title = `${page?.label ?? "Upcoming"} · Upcoming`;
    if (previousPath.current !== location.pathname) {
      mainRef.current?.focus({ preventScroll: true });
      if (location.pathname !== "/releases" && location.pathname !== "/")
        window.scrollTo({ top: 0, behavior: "instant" });
      previousPath.current = location.pathname;
    }
  }, [location.pathname, isAccountPage]);
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
          <Link className="account-nav" to={user ? "/account" : "/login"}>
            {user ? "Account" : "Sign in"}
          </Link>
        </div>
      </header>
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        {!isAccountPage && <StarNotice />}
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
          {(
            [
              "login",
              "signup",
              "verify-email",
              "forgot-password",
              "reset-password",
              "account",
            ] as const
          ).map((mode) => (
            <Route
              key={mode}
              path={`/${mode}`}
              element={<AccountPage key={mode} mode={mode} />}
            />
          ))}
          <Route path="/starred" element={<StarredPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/friends/:userId" element={<FriendsPage />} />
          <Route
            path="*"
            element={
              <section className="personal-page">
                <h1 className="page-heading">Page not found</h1>
                <Link className="text-link" to="/releases">
                  Back to releases <ArrowUpRight size={17} />
                </Link>
              </section>
            }
          />
        </Routes>
      </main>
      <footer>
        <section className="credits" aria-label="About and credits">
          <a href="https://www.themoviedb.org" aria-label="The Movie Database">
            {isAccountPage ? (
              "TMDB"
            ) : (
              <img
                width="110"
                height="15"
                alt="TMDB"
                src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_long_2-9665a76b1ae401a510ec1e0ca40ddcb3b0cfe45f1d51b77a308fea0845885648.svg"
              />
            )}
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
