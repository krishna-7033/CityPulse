import { useState, useEffect } from "react";
import axios from "axios";
import GoogleSignIn from "./components/GoogleSignIn";
import "./App.css";

const popularCities = [
  "Delhi",
  "Mumbai",
  "Kolkata",
  "Bengaluru",
  "Patna",
  "Shimla",
];

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();

  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) {
    return "Just now";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes !== 1 ? "s" : ""} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hr${diffHours !== 1 ? "s" : ""} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
};

const formatCategory = (category) => {
  if (!category) return "NEWS";

  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getSourceText = (sources) => {
  if (!sources || sources.length === 0) {
    return "No sources";
  }

  if (sources.length === 1) {
    return sources[0].channel;
  }

  const visibleSources = sources.slice(0, 2).map((source) => source.channel);

  const remaining = sources.length - visibleSources.length;

  if (remaining > 0) {
    return `${visibleSources.join(" • ")} +${remaining}`;
  }

  return visibleSources.join(" • ");
};

/* =========================
   PRESENTATIONAL COMPONENTS
   (no application logic lives here)
========================= */

function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M16 16L21 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Decorative hero backdrop: generic news-media icons drifting at the edges.
// Positions are percentages so the centre stays clear for the headline and
// search bar. A future India map can sit in the centre/right without clashing.
const backdropItems = [
  { icon: "newspaper", x: "4%", y: "12%", rot: "-6deg", dur: "9s" },
  { icon: "play", x: "13%", y: "46%", rot: "5deg", dur: "11s" },
  { icon: "tv", x: "5%", y: "76%", rot: "-4deg", dur: "10s" },
  { icon: "article", x: "21%", y: "84%", rot: "6deg", dur: "12s" },
  { icon: "mic", x: "88%", y: "10%", rot: "6deg", dur: "10s" },
  { icon: "broadcast", x: "92%", y: "44%", rot: "-5deg", dur: "9s" },
  { icon: "camera", x: "84%", y: "74%", rot: "4deg", dur: "11s" },
  { icon: "article", x: "74%", y: "88%", rot: "-6deg", dur: "13s" },
];

const backdropShapes = {
  newspaper: (
    <>
      <rect x="3" y="4" width="15" height="16" rx="2" />
      <path d="M18 9h3v9a2 2 0 0 1-2 2" />
      <path d="M7 8h7M7 12h7M7 16h4" />
    </>
  ),
  tv: (
    <>
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M8 3l4 4 4-4M9 22h6" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </>
  ),
  camera: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10l5-3v10l-5-3" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l6 3.5-6 3.5z" />
    </>
  ),
  broadcast: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2" />
    </>
  ),
  article: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </>
  ),
};

function HeroBackdrop() {
  return (
    <div className="hero-backdrop" aria-hidden="true">
      {backdropItems.map((item, index) => (
        <span
          key={`${item.icon}-${index}`}
          className={`backdrop-item${
            item.icon === "broadcast" ? " is-broadcast" : ""
          }${index % 3 === 1 ? " is-ink" : ""}${index > 3 ? " hide-sm" : ""}`}
          style={{
            "--x": item.x,
            "--y": item.y,
            "--rot": item.rot,
            "--dur": item.dur,
            "--n": index,
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {backdropShapes[item.icon]}
          </svg>
        </span>
      ))}
    </div>
  );
}

function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          className="logo-pulse"
          pathLength="1"
          d="M2 12h4l2.5-6 4 12 3-9 1.5 3H22"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function UserMenu({ user, onLogout }) {
  const displayName = user.name || user.email?.split("@")[0] || "User";

  return (
    <div className="user-menu">
      {user.profilePicture ? (
        <img
          className="user-avatar"
          src={user.profilePicture}
          alt={`${user.name || "User"}'s profile`}
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="user-avatar user-avatar-fallback" aria-hidden="true">
          {(user.name || user.email || "U").charAt(0).toUpperCase()}
        </div>
      )}

      <span className="user-greeting">Hi, {displayName}</span>

      <button type="button" className="signout-btn" onClick={onLogout}>
        Sign Out
      </button>
    </div>
  );
}

function NewsSkeleton() {
  return (
    <div className="news-grid" aria-hidden="true">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div className="news-card skeleton-card" key={item}>
          <div className="skeleton thumbnail-skeleton"></div>

          <div className="card-content">
            <div className="skeleton line-small"></div>
            <div className="skeleton line-large"></div>
            <div className="skeleton line-medium"></div>
            <div className="skeleton line-small"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function NewsCard({ story, onOpen, index = 0 }) {
  const sources = story.sources || [];
  const mainSource = sources[0];

  return (
    <article
      className="news-card"
      style={{ "--i": index }}
      onClick={() => onOpen(story)}
    >
      <div className="thumbnail-wrapper">
        {mainSource?.thumbnail ? (
          <img
            src={mainSource.thumbnail}
            alt={story.title || "News thumbnail"}
            className="news-thumbnail"
            loading="lazy"
          />
        ) : (
          <div className="thumbnail-placeholder">
            <span>No Image</span>
          </div>
        )}

        <div className="category-badge">{formatCategory(story.category)}</div>

        <div className="source-count">
          {sources.length} {sources.length === 1 ? "source" : "sources"}
        </div>
      </div>

      <div className="card-content">
        <div className="card-meta">
          <span>{formatTimeAgo(story.publishedAt)}</span>

          <span className="meta-dot" aria-hidden="true">
            •
          </span>

          <span>
            {story.confidence
              ? `${Math.round(story.confidence * 100)}% match`
              : "News"}
          </span>
        </div>

        <h3>
          {/* Real button so keyboard users can open the story. */}
          <button
            type="button"
            className="card-title-button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(story);
            }}
          >
            {story.title || "Untitled story"}
          </button>
        </h3>

        <div className="source-row">
          <div className="source-name">{getSourceText(sources)}</div>
        </div>

        {mainSource?.description && (
          <p className="story-description">{mainSource.description}</p>
        )}

        <div className="card-footer">
          <span>{sources.length > 1 ? "Multiple sources" : "YouTube"}</span>

          {mainSource?.videoId && (
            <a
              href={`https://www.youtube.com/watch?v=${mainSource.videoId}`}
              target="_blank"
              rel="noreferrer"
              className="watch-link"
              onClick={(event) => event.stopPropagation()}
            >
              Watch
              <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function SiteFooter({ onNavigate }) {
  const link = (id, focusId) => (event) => {
    event.preventDefault();
    onNavigate(id, focusId);
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <div className="footer-logo">
            <LogoMark />
            <span>CityPulse</span>
          </div>

          <p>
            Local news, organized around the stories that matter. CityPulse
            groups news videos from YouTube into stories for cities across
            India.
          </p>
        </div>

        <nav className="footer-nav" aria-label="Footer">
          <a href="#search" onClick={link("search", "city-search")}>
            Search a city
          </a>
          <a href="#popular" onClick={link("popular")}>
            Popular cities
          </a>
          <a href="#stories" onClick={link("stories")}>
            Latest stories
          </a>
        </nav>
      </div>

      <div className="footer-bottom">
        <span className="footer-copy">
          © {new Date().getFullYear()} CityPulse
        </span>
      </div>
    </footer>
  );
}

const MOBILE_QUERY = "(max-width: 760px)";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia?.(MOBILE_QUERY).matches ?? false,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (event) => setIsMobile(event.matches);

    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

function App() {
  const [city, setCity] = useState("");
  const [stories, setStories] = useState([]);
  const [searchedCity, setSearchedCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedStory, setSelectedStory] = useState(null);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(
    () => sessionStorage.getItem("citypulse_token") || "",
  );

  // Cosmetic only: the search hint cycles through the popular cities.
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);

  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the menu when the viewport grows past the mobile breakpoint.
  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  // Close on Escape.
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion || searchFocused || city || selectedStory) return;

    const timer = setInterval(() => {
      setPlaceholderIndex((index) => (index + 1) % popularCities.length);
    }, 2600);

    return () => clearInterval(timer);
  }, [searchFocused, city, selectedStory]);

  const isPremiumMember =
    user?.subscription?.plan === "plus" &&
    user?.subscription?.status === "active" &&
    (!user?.subscription?.expiresAt ||
      new Date(user.subscription.expiresAt) > new Date());

  const searchNews = async (searchQuery = city) => {
    const query = searchQuery.trim();

    if (!query) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setStories([]);
      setSearchedCity(query);
      setSelectedStory(null);

      const token = authToken;

      const response = token
        ? await axios.get(
            `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/search`,
            {
              params: { q: query },
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          )
        : await axios.get(
            `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/news/${encodeURIComponent(query)}`,
          );

      setStories(response.data.videos || []);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.error ||
          "Unable to fetch news right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = ({ user, token }) => {
    sessionStorage.setItem("citypulse_token", token);
    setAuthToken(token);
    setUser(user);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    setMenuOpen(false);

    // Clear the saved login session.
    sessionStorage.removeItem("citypulse_token");

    // Reset authentication.
    setAuthToken("");
    setUser(null);

    // Reset city and news content.
    setCity("");
    setSearchedCity("");
    setStories([]);
    setSelectedStory(null);

    // Reset loading and error states.
    setLoading(false);
    setError("");
  };

  useEffect(() => {
    if (!authToken) return;

    let cancelled = false;

    const restoreSession = async () => {
      try {
        const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

        // Restore the signed-in user's profile from MongoDB.
        const profileResponse = await axios.get(`${baseURL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (cancelled) return;

        const restoredUser = profileResponse.data.user;
        setUser(restoredUser);

        // Automatically load the user's most recently searched city.
        const lastCity = restoredUser.lastSearchedTopic?.trim();

        if (!lastCity) return;

        setCity(lastCity);
        setSearchedCity(lastCity);
        setLoading(true);
        setError("");
        setStories([]);

        const newsResponse = await axios.get(`${baseURL}/api/search`, {
          params: { q: lastCity },
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (cancelled) return;

        setStories(newsResponse.data.videos || []);
      } catch (err) {
        if (cancelled) return;

        console.error("Session restoration failed:", err);

        if (err.response?.status === 401) {
          sessionStorage.removeItem("citypulse_token");
          setAuthToken("");
          setUser(null);
        } else {
          setError(
            err.response?.data?.message ||
              "Couldn't restore your previous city. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const handleSubmit = (event) => {
    event.preventDefault();
    searchNews();
  };

  const handlePopularCity = (selectedCity) => {
    setCity(selectedCity);
    searchNews(selectedCity);
  };

  /* ---- Navigation helpers (new, purely presentational) ---- */

  // Leaves the story detail view (if open) and scrolls to a home section.
  const goToSection = (sectionId, focusId) => {
    setSelectedStory(null);

    setTimeout(() => {
      const reduceMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      document.getElementById(sectionId)?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });

      if (focusId) {
        document.getElementById(focusId)?.focus({ preventScroll: true });
      }
    }, 0);
  };

  const goHome = () => {
    setMenuOpen(false);
    setSelectedStory(null);
    window.scrollTo({ top: 0 });
  };

  const navLink = (sectionId, focusId) => (event) => {
    event.preventDefault();
    setMenuOpen(false);
    goToSection(sectionId, focusId);
  };

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="navbar">
        <div className="nav-container">
          <button
            type="button"
            className="logo"
            onClick={goHome}
            aria-label="CityPulse home"
          >
            <LogoMark />
            <span>CityPulse</span>
          </button>

          {/* Desktop */}
          {!isMobile && !selectedStory && (
            <nav className="nav-links" aria-label="Primary">
              <a href="#search" onClick={navLink("search", "city-search")}>
                Search
              </a>
              <a href="#popular" onClick={navLink("popular")}>
                Popular cities
              </a>
              <a href="#stories" onClick={navLink("stories")}>
                Stories
              </a>
            </nav>
          )}

          {!isMobile && (
            <div className="nav-auth">
              {user ? (
                <UserMenu user={user} onLogout={handleLogout} />
              ) : (
                <GoogleSignIn onLogin={handleLogin} />
              )}
            </div>
          )}

          {/* Mobile */}
          {isMobile && (
            <button
              type="button"
              className="menu-toggle"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="menu-toggle-bars" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
          )}
        </div>

        {isMobile && menuOpen && (
          <div className="mobile-menu" id="mobile-menu">
            <nav className="mobile-nav" aria-label="Primary">
              <a href="#search" onClick={navLink("search", "city-search")}>
                Search
              </a>
              <a href="#popular" onClick={navLink("popular")}>
                Popular cities
              </a>
              <a href="#stories" onClick={navLink("stories")}>
                Stories
              </a>
            </nav>

            <div className="mobile-auth">
              {user ? (
                <UserMenu user={user} onLogout={handleLogout} />
              ) : (
                <GoogleSignIn onLogin={handleLogin} />
              )}
            </div>
          </div>
        )}
      </header>

      {isMobile && menuOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {selectedStory ? (
        <main id="main">
          <section className="story-detail-section">
            <div className="story-detail-container">
              <button
                type="button"
                className="back-button"
                onClick={() => setSelectedStory(null)}
              >
                ← Back to {searchedCity}
              </button>

              <div className="story-detail-header">
                <div className="detail-category">
                  {formatCategory(selectedStory.category)}
                </div>

                <h1>{selectedStory.title}</h1>

                <div className="detail-meta">
                  <span>{formatTimeAgo(selectedStory.publishedAt)}</span>

                  <span aria-hidden="true">•</span>

                  <span>
                    {selectedStory.sources?.length || 0}{" "}
                    {selectedStory.sources?.length === 1 ? "source" : "sources"}
                  </span>
                </div>
              </div>

              <div className="ai-summary-card">
                <div className="ai-summary-header">
                  <div className="ai-summary-icon" aria-hidden="true">
                    ✦
                  </div>

                  <div>
                    <div className="ai-summary-label">AI SUMMARY</div>

                    <h2>What happened?</h2>
                  </div>
                </div>

                {isPremiumMember ? (
                  <p className="ai-summary-text">
                    {selectedStory.summary ||
                      "A summary is not available for this story yet."}
                  </p>
                ) : (
                  <div className="premium-locked">
                    <h3>✦ Premium AI Summary</h3>
                    <p>
                      Get concise, AI-generated summaries of local news with a
                      CityPulse membership.
                    </p>
                    <p>Members only</p>
                  </div>
                )}

                <div className="ai-summary-note">
                  Generated from the available news sources
                </div>
              </div>

              <div className="sources-section">
                <div className="sources-header">
                  <p>SOURCES</p>

                  <span>{selectedStory.sources?.length || 0}</span>
                </div>

                <div className="sources-list">
                  {selectedStory.sources?.map((source) => (
                    <div className="source-card" key={source.videoId}>
                      <img src={source.thumbnail} alt={source.title} />

                      <div className="source-card-content">
                        <div className="source-type">YOUTUBE</div>

                        <h3>{source.title}</h3>

                        <p>{source.channel}</p>

                        <a
                          href={`https://www.youtube.com/watch?v=${source.videoId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Watch on YouTube →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main id="main">
          <section className="hero" id="search">
            <HeroBackdrop />
            {/*
              Layout note: .hero-inner is a single-column grid today. When the
              India map is added later, place it as a second child here and
              switch --hero-columns in App.css to two columns. The search form
              and popular-city buttons already drive searchNews(), so the map
              can call the same handler.
            */}
            <div className="hero-inner">
              <div className="hero-content">
                <div className="hero-badge">
                  <span className="pulse-dot" aria-hidden="true"></span>
                  NEWS ACROSS INDIAN CITIES
                </div>

                <h1>
                  Discover what's happening
                  <br />
                  <span>across Indian cities.</span>
                </h1>

                <p className="hero-description">
                  CityPulse gathers local news videos from across India and
                  groups them into stories, so you can follow your city without
                  hunting through scattered feeds.
                </p>

                <form
                  className="search-container"
                  onSubmit={handleSubmit}
                  role="search"
                >
                  <div className="search-icon">
                    <SearchIcon />
                  </div>

                  <label htmlFor="city-search" className="visually-hidden">
                    Search city
                  </label>

                  <input
                    id="city-search"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={`Search a city, e.g. ${popularCities[placeholderIndex]}`}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    autoComplete="off"
                  />

                  <button type="submit" disabled={loading}>
                    {loading ? "Searching..." : "Search"}
                  </button>
                </form>

                <div
                  className="popular-searches"
                  id="popular"
                  role="group"
                  aria-label="Popular cities"
                >
                  <span>Popular:</span>

                  {popularCities.map((popularCity) => (
                    <button
                      type="button"
                      key={popularCity}
                      className="city-chip"
                      onClick={() => handlePopularCity(popularCity)}
                    >
                      {popularCity}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="news-section" id="stories">
            <div className="section-container">
              {searchedCity && !loading && !error && (
                <div className="section-header">
                  <div>
                    <p className="section-label">CITY NEWS</p>

                    <h2>
                      Latest in <span>{searchedCity}</span>
                    </h2>
                  </div>

                  {stories.length > 0 && (
                    <div className="story-count">
                      {stories.length}{" "}
                      {stories.length === 1 ? "story" : "stories"}
                    </div>
                  )}
                </div>
              )}

              {loading && <NewsSkeleton />}

              {error && !loading && (
                <div className="state-message error-state" role="alert">
                  <div className="state-icon" aria-hidden="true">
                    !
                  </div>

                  <h3>Something went wrong</h3>

                  <p>{error}</p>

                  <button
                    type="button"
                    onClick={() => searchNews()}
                    className="retry-button"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!loading && !error && searchedCity && stories.length === 0 && (
                <div className="state-message">
                  <div className="state-icon" aria-hidden="true">
                    ◌
                  </div>

                  <h3>No stories found</h3>

                  <p>
                    We couldn't find relevant news for{" "}
                    <strong>{searchedCity}</strong>. Try another search.
                  </p>
                </div>
              )}

              {!loading && !error && stories.length > 0 && (
                <div className="news-grid">
                  {stories.map((story, index) => (
                    <NewsCard
                      key={story.storyKey}
                      index={index}
                      story={story}
                      onOpen={setSelectedStory}
                    />
                  ))}
                </div>
              )}

              {!searchedCity && !loading && (
                <div className="empty-home">
                  <div className="empty-icon" aria-hidden="true">
                    <span>✦</span>
                  </div>

                  <h2>Explore your city</h2>

                  <p>
                    Search for a city above to discover what's happening right
                    now.
                  </p>

                  <ul className="feature-list">
                    <li>
                      <strong>Stories, not scattered videos</strong>
                      <span>
                        Related videos are grouped into a single story with all
                        of its sources.
                      </span>
                    </li>
                    <li>
                      <strong>Straight to the source</strong>
                      <span>
                        Every story links back to the original YouTube videos.
                      </span>
                    </li>
                    <li>
                      <strong>AI summaries for members</strong>
                      <span>
                        Members get a short AI-generated summary on each story
                        page.
                      </span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      <SiteFooter onNavigate={goToSection} />
    </div>
  );
}

export default App;
