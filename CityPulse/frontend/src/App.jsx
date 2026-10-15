import { useState, useEffect } from "react";
import axios from "axios";
import GoogleSignIn from "./components/GoogleSignIn";

const API_URL = "http://localhost:5000/api/news";

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
    console.log("Current CityPulse user:", user);

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
  };

  



const handleLogout = () => {
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

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">
            <span className="logo-mark">C</span>
            <span>CityPulse</span>
          </div>

          <div className="nav-tagline">Your city's news. One place.</div>

          <div
            className="nav-auth"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              overflow: "visible",
            }}
          >
            {user ? (
              <>
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={`${user.name || "User"}'s profile`}
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "#e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}

                <span
                  style={{
                    color: "#777",
                    fontSize: "14px",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  Hi, {user.name || user.email?.split("@")[0] || "User"}
                </span>

                <button
                  type="button"
                  className="signout-btn"
                  onClick={handleLogout}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <GoogleSignIn onLogin={handleLogin} />
            )}
          </div>
        </div>
      </nav>

      {selectedStory ? (
        <section className="story-detail-section">
          <div className="story-detail-container">
            <button
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

                <span>•</span>

                <span>
                  {selectedStory.sources?.length || 0}{" "}
                  {selectedStory.sources?.length === 1 ? "source" : "sources"}
                </span>
              </div>
            </div>

            <div className="ai-summary-card">
              <div className="ai-summary-header">
                <div className="ai-summary-icon">✦</div>

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
      ) : (
        <main>
          <section className="hero">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="pulse-dot"></span>
                LIVE CITY NEWS
              </div>

              <h1>
                What's happening
                <br />
                <span>in your city?</span>
              </h1>

              <p className="hero-description">
                Discover the latest news, videos and updates from across your
                city — organized into stories.
              </p>

              <form className="search-container" onSubmit={handleSubmit}>
                <div className="search-icon">
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="11"
                      cy="11"
                      r="7"
                      stroke="currentColor"
                      strokeWidth="2"
                    />

                    <path
                      d="M16 16L21 21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Search a city..."
                  aria-label="Search city"
                />

                <button type="submit" disabled={loading}>
                  {loading ? "Searching..." : "Search"}
                </button>
              </form>

              <div className="popular-searches">
                <span>Popular:</span>

                {popularCities.map((popularCity) => (
                  <button
                    key={popularCity}
                    onClick={() => handlePopularCity(popularCity)}
                  >
                    {popularCity}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="news-section">
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

              {loading && (
                <div className="news-grid">
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
              )}

              {error && !loading && (
                <div className="state-message error-state">
                  <div className="state-icon">!</div>

                  <h3>Something went wrong</h3>

                  <p>{error}</p>

                  <button onClick={() => searchNews()} className="retry-button">
                    Try Again
                  </button>
                </div>
              )}

              {!loading && !error && searchedCity && stories.length === 0 && (
                <div className="state-message">
                  <div className="state-icon">◌</div>

                  <h3>No stories found</h3>

                  <p>
                    We couldn't find relevant news for{" "}
                    <strong>{searchedCity}</strong>. Try another search.
                  </p>
                </div>
              )}

              {!loading && !error && stories.length > 0 && (
                <div className="news-grid">
                  {stories.map((story) => {
                    const sources = story.sources || [];
                    const mainSource = sources[0];

                    return (
                      <article
                        className="news-card"
                        key={story.storyKey}
                        onClick={() => setSelectedStory(story)}
                      >
                        <div className="thumbnail-wrapper">
                          {mainSource?.thumbnail ? (
                            <img
                              src={mainSource.thumbnail}
                              alt={story.title || "News thumbnail"}
                              className="news-thumbnail"
                            />
                          ) : (
                            <div className="thumbnail-placeholder">
                              <span>No Image</span>
                            </div>
                          )}

                          <div className="category-badge">
                            {formatCategory(story.category)}
                          </div>

                          <div className="source-count">
                            {sources.length}{" "}
                            {sources.length === 1 ? "source" : "sources"}
                          </div>
                        </div>

                        <div className="card-content">
                          <div className="card-meta">
                            <span>{formatTimeAgo(story.publishedAt)}</span>

                            <span className="meta-dot">•</span>

                            <span>
                              {story.confidence
                                ? `${Math.round(story.confidence * 100)}% match`
                                : "News"}
                            </span>
                          </div>

                          <h3>{story.title || "Untitled story"}</h3>

                          <div className="source-row">
                            <div className="source-name">
                              {getSourceText(sources)}
                            </div>
                          </div>

                          {mainSource?.description && (
                            <p className="story-description">
                              {mainSource.description}
                            </p>
                          )}

                          <div className="card-footer">
                            <span>
                              {sources.length > 1
                                ? "Multiple sources"
                                : "YouTube"}
                            </span>

                            {mainSource?.videoId && (
                              <a
                                href={`https://www.youtube.com/watch?v=${mainSource.videoId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="watch-link"
                                onClick={(event) => event.stopPropagation()}
                              >
                                Watch
                                <span>→</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {!searchedCity && !loading && (
                <div className="empty-home">
                  <div className="empty-icon">
                    <span>✦</span>
                  </div>

                  <h2>Explore your city</h2>

                  <p>
                    Search for a city above to discover what's happening right
                    now.
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-logo">
            <span className="logo-mark">C</span>
            <span>CityPulse</span>
          </div>

          <p>Local news, organized around the stories that matter.</p>

          <span className="footer-copy">
            © {new Date().getFullYear()} CityPulse
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
