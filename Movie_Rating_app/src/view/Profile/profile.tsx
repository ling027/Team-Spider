import "./profile.css";
import "../main.css";
import NavBar from "../Component/Navbar";
import { useLang } from "../../i18n/LanguageContext";
import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usersAPI, type UserStats, type UserReview, type UserDiscussion } from "../../api/users";
import { tmdb } from "../../api/tmbd";
import { FaStar } from 'react-icons/fa';

interface FavoriteMovie {
  id: number;
  title: string;
  poster: string;
  rating: string;
  releaseDate?: string;
}

type DailyActivityMap = Record<string, number>;

interface MonthItem {
  month: string;
  year: number;
  date: Date;
}

const Profile: React.FC = () => {
  const { t } = useLang();
  const { user: currentUser, updateUser } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteMovie[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyActivityMap>({});
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [discussions, setDiscussions] = useState<UserDiscussion[]>([]);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [expandedDiscussions, setExpandedDiscussions] = useState<Set<string>>(new Set());
  const [movieTitles, setMovieTitles] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState({ fullname: '', email: '' });
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Load bookmarks (keeping localStorage for now)
  useEffect(() => {
    const saved: FavoriteMovie[] = JSON.parse(localStorage.getItem("bookmarks") || "[]");
    setFavorites(saved);
  }, []);

  // Fetch user stats and activity
  useEffect(() => {
    if (currentUser?.id) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchUserData = async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      const [statsResponse, activityResponse, reviewsResponse, discussionsResponse] = await Promise.all([
        usersAPI.getStats(currentUser.id),
        usersAPI.getActivity(currentUser.id, 365),
        usersAPI.getReviews(currentUser.id),
        usersAPI.getDiscussions(currentUser.id)
      ]);

      setUserStats(statsResponse.data.stats);
      setDailyActivity(activityResponse.data.dailyActivity || {});
      setReviews(reviewsResponse.data.reviews || []);
      setDiscussions(discussionsResponse.data.discussions || []);

      // Fetch movie titles for reviews
      const reviewMovieIds = new Set<number>();
      reviewsResponse.data.reviews?.forEach(review => {
        if (review.movieTmdbId) reviewMovieIds.add(review.movieTmdbId);
      });

      // Fetch movie titles from TMDB
      const titlePromises = Array.from(reviewMovieIds).map(async (movieId) => {
        try {
          const movie = await tmdb.movieById(movieId);
          return { id: movieId, title: movie.title };
        } catch (err) {
          console.error(`Failed to fetch movie ${movieId}:`, err);
          return { id: movieId, title: `Movie ${movieId}` };
        }
      });

      const movieData = await Promise.all(titlePromises);
      const titlesMap: Record<number, string> = {};
      movieData.forEach(({ id, title }) => {
        titlesMap[id] = title;
      });
      setMovieTitles(titlesMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile data');
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = (id: number) => {
    const updated = favorites.filter((m) => m.id !== id);
    localStorage.setItem("bookmarks", JSON.stringify(updated));
    setFavorites(updated);
  };

  const handleEditClick = () => {
    if (currentUser) {
      setEditFormData({
        fullname: currentUser.fullname || '',
        email: currentUser.email || ''
      });
      setEditError(null);
      setIsEditModalOpen(true);
    }
  };

  const handleEditClose = () => {
    setIsEditModalOpen(false);
    setEditFormData({ fullname: '', email: '' });
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;

    setEditLoading(true);
    setEditError(null);

    try {
      const updateData: { fullname?: string; email?: string } = {};
      if (editFormData.fullname.trim()) {
        updateData.fullname = editFormData.fullname.trim();
      }
      if (editFormData.email.trim()) {
        updateData.email = editFormData.email.trim();
      }

      if (Object.keys(updateData).length === 0) {
        setEditError('Please provide at least one field to update');
        setEditLoading(false);
        return;
      }

      const response = await usersAPI.update(currentUser.id, updateData);
      
      // Update the user in context
      if (response.data.user) {
        const updatedUser = {
          ...currentUser,
          ...response.data.user
        };
        updateUser(updatedUser);
      }

      setIsEditModalOpen(false);
      setEditFormData({ fullname: '', email: '' });
    } catch (err: any) {
      setEditError(err.response?.data?.message || err.message || 'Failed to update profile');
      console.error('Error updating profile:', err);
    } finally {
      setEditLoading(false);
    }
  };

  const months: MonthItem[] = useMemo(() => {
    const list: MonthItem[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();
      list.push({ month, year, date });
    }
    return list;
  }, []);

  const toggleReviewExpand = (reviewId: string) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const toggleDiscussionExpand = (discussionId: string) => {
    setExpandedDiscussions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(discussionId)) {
        newSet.delete(discussionId);
      } else {
        newSet.add(discussionId);
      }
      return newSet;
    });
  };

  const getMonthGrid = (year: number, monthIndex: number): (Date | null)[][] => {
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const daysInMonth = lastDay.getDate();

    const weeks: (Date | null)[][] = [];
    let week: (Date | null)[] = new Array(7).fill(null);
    let currentDay = 0;

    for (let i = firstDay.getDay(); i < 7; i++) {
      currentDay++;
      week[i] = new Date(year, monthIndex, currentDay);
    }
    weeks.push(week);

    while (currentDay < daysInMonth) {
      const newWeek: (Date | null)[] = [];
      for (let i = 0; i < 7; i++) {
        currentDay++;
        newWeek.push(
          currentDay <= daysInMonth ? new Date(year, monthIndex, currentDay) : null
        );
      }
      weeks.push(newWeek);
    }
    return weeks;
  };

  return (
    <>
      <section className="site-header">
        <NavBar />
      </section>

      <div className="profile-body">
        <div className="profile-layout">
          <div className="profile-main">
            {/* Profile Header */}
            <div className="profile-header">
              <img src="https://cdn-icons-png.flaticon.com/512/847/847969.png" alt="User avatar" className="profile-avatar" />
              <div className="profile-info">
                <h2>{currentUser?.username || "User"}</h2>
                <p>{currentUser?.email || ""}</p>
                <p className="joined-date">
                  {t("Joined")}: {(() => {
                    if (!currentUser?.createdAt) return "N/A";
                    try {
                      const date = new Date(currentUser.createdAt);
                      return isNaN(date.getTime()) 
                        ? "N/A" 
                        : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    } catch {
                      return "N/A";
                    }
                  })()}
                </p>
                <button className="edit-btn" onClick={handleEditClick}>{t("Edit Profile")}</button>
              </div>
            </div>

            {/* Bookmarks */}
            <div className="favorites-section">
              <h3>Bookmarked Movies</h3>
              <div className="fav-movies-row">
                {favorites.length === 0 ? (
                  <p style={{textAlign:"center", color:"white"}}>You haven’t bookmarked any movies yet.</p>
                ) : (
                  favorites.map((movie) => (
                    <div key={movie.id} className="favorite-card">
                      <Link to={`/movie/${movie.id}/${movie.title}`}>
                        <img src={movie.poster} alt={movie.title}  className="favorite-poster"/>
                        <p className="favorite-title">{movie.title}</p>
                        <p className="favorite-rating">{movie.rating}</p>
                      </Link>
                      <button className="remove-button" onClick={() => removeBookmark(movie.id)}>Remove</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* My Reviews */}
            <div className="profile-section">
              <h3>My Reviews ({reviews.length})</h3>
              {reviews.length === 0 ? (
                <p style={{textAlign:"center", color:"white", padding: "20px"}}>You haven't written any reviews yet.</p>
              ) : (
                <div className="profile-items-list">
                  {reviews.map((review) => {
                    const isExpanded = expandedReviews.has(review.id);
                    return (
                      <div key={review.id} className="profile-item-card">
                        <div 
                          className="profile-item-header clickable"
                          onClick={() => toggleReviewExpand(review.id)}
                        >
                          <div className="profile-item-info">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              <Link 
                                to={`/movie/${review.movieTmdbId}`}
                                style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 'bold' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {movieTitles[review.movieTmdbId] || `Movie ${review.movieTmdbId}`}
                              </Link>
                              {review.rating && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <FaStar
                                      key={star}
                                      className={star <= review.rating! ? 'filled' : 'empty'}
                                      style={{ color: star <= review.rating! ? '#ffdd59' : '#ccc', fontSize: '14px' }}
                                    />
                                  ))}
                                  <span style={{ marginLeft: '4px', fontSize: '14px' }}>{review.rating}/5</span>
                                </div>
                              )}
                            </div>
                            {review.replies && review.replies.length > 0 && (
                              <span className="profile-item-meta">
                                {review.replies.length} {review.replies.length === 1 ? 'reply' : 'replies'}
                              </span>
                            )}
                            <span className="profile-item-date">
                              {new Date(review.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <button className="profile-expand-button">
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="profile-item-content">
                            <div className="profile-item-text">
                              <p>{review.text}</p>
                            </div>
                            {review.replies && review.replies.length > 0 && (
                              <div className="profile-replies-list">
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#fff' }}>
                                  Replies ({review.replies.length})
                                </h4>
                                {review.replies.map((reply) => (
                                  <div key={reply.id} className="profile-reply-item">
                                    <div className="profile-reply-header">
                                      <strong>{reply.author}</strong>
                                      <span className="profile-reply-timestamp">
                                        {new Date(reply.timestamp).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="profile-reply-content">
                                      <p>{reply.text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* My Discussions */}
            <div className="profile-section">
              <h3>My Discussions ({discussions.length})</h3>
              {discussions.length === 0 ? (
                <p style={{textAlign:"center", color:"white", padding: "20px"}}>You haven't started any discussions yet.</p>
              ) : (
                <div className="profile-items-list">
                  {discussions.map((discussion) => {
                    const isExpanded = expandedDiscussions.has(discussion.id);
                    return (
                      <div key={discussion.id} className="profile-item-card">
                        <div 
                          className="profile-item-header clickable"
                          onClick={() => toggleDiscussionExpand(discussion.id)}
                        >
                          <div className="profile-item-info">
                            <strong>{discussion.title}</strong>
                            <span className="profile-item-meta">
                              Movie: <Link 
                                to={`/movie/${discussion.movieTmdbId}`}
                                style={{ color: '#4f46e5', textDecoration: 'none' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {discussion.movieTitle}
                              </Link> | Replies: {discussion.replies?.length || 0} | Views: {discussion.views}
                            </span>
                            {discussion.tags && discussion.tags.length > 0 && (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {discussion.tags.map((tag, index) => (
                                  <span key={index} className="profile-tag">{tag}</span>
                                ))}
                              </div>
                            )}
                            <span className="profile-item-date">
                              {new Date(discussion.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <button className="profile-expand-button">
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="profile-item-content">
                            <div className="profile-item-text">
                              <p>{discussion.content}</p>
                            </div>
                            {discussion.replies && discussion.replies.length > 0 && (
                              <div className="profile-replies-list">
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#fff' }}>
                                  Replies ({discussion.replies.length})
                                </h4>
                                {discussion.replies.map((reply) => (
                                  <div key={reply.id} className="profile-reply-item">
                                    <div className="profile-reply-header">
                                      <strong>{reply.author}</strong>
                                      <span className="profile-reply-timestamp">
                                        {new Date(reply.timestamp).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="profile-reply-content">
                                      <p>{reply.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Contribution Activity */}
            <div className="activity-section">
              <h3 className="activity-subtitle">{t("Contribution Activity")}</h3>
              <p className="activity-subtitle">
                {t("Your activity over the past year")}
              </p>

              <div className="activity-year">
                {months.map(({ month, year, date }) => {
                  const grid = getMonthGrid(year, date.getMonth());
                  return (
                    <div key={month + year} className="month-calendar">
                      <h4 className="month-title">{month}</h4>
                      <div className="month-grid">
                        {grid.map((week, wIndex) => (
                          <div key={wIndex} className="week-row">
                            {week.map((day, dIndex) => {
                              if (!day)
                                return <div key={dIndex} className="day-cell empty"></div>;
                              const key = day.toISOString().split("T")[0];
                              const level = dailyActivity[key] || 0;
                              return (
                                <div
                                  key={dIndex}
                                  className={`day-cell level-${level}`}
                                  title={`${day.toDateString()} — ${level} actions`}
                                ></div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="right-column">
            <aside className="profile-stats">
              <h3>{t("Your Stats")}</h3>
              {loading ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'white' }}>Loading stats...</div>
              ) : error ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#ff5555' }}>{error}</div>
              ) : userStats ? (
                <>
                  <div className="stat-box">
                    <p className="stat-label">{t("Minutes Watched")}</p>
                    <p className="stat-value">
                      {userStats.minutesWatched.toLocaleString()}
                    </p>
                  </div>
                  <div className="stat-box">
                    <p className="stat-label">{t("Movies Watched")}</p>
                    <p className="stat-value">{userStats.moviesWatched}</p>
                  </div>
                  <div className="stat-box">
                    <p className="stat-label">{t("Average Rating Given")}</p>
                    <p className="stat-value">{userStats.avgRating.toFixed(1)}</p>
                  </div>
                </>
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'white' }}>No stats available</div>
              )}
            </aside>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={handleEditClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("Edit Profile")}</h2>
              <button className="modal-close" onClick={handleEditClose}>&times;</button>
            </div>
            <form onSubmit={handleEditSubmit} className="edit-profile-form">
              {editError && (
                <div className="edit-error">{editError}</div>
              )}
              <div className="form-group">
                <label htmlFor="fullname">{t("Full Name")}</label>
                <input
                  type="text"
                  id="fullname"
                  value={editFormData.fullname}
                  onChange={(e) => setEditFormData({ ...editFormData, fullname: e.target.value })}
                  placeholder={t("Enter your full name")}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">{t("Email")}</label>
                <input
                  type="email"
                  id="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder={t("Enter your email")}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={handleEditClose} disabled={editLoading}>
                  {t("Cancel")}
                </button>
                <button type="submit" className="save-btn" disabled={editLoading}>
                  {editLoading ? t("Saving...") : t("Save Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Profile;
