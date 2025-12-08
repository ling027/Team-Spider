import "./profile.css";
import "../main.css";
import NavBar from "../Component/Navbar";
import { useLang } from "../../i18n/LanguageContext";
import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usersAPI, type UserStats } from "../../api/users";

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
      
      const [statsResponse, activityResponse] = await Promise.all([
        usersAPI.getStats(currentUser.id),
        usersAPI.getActivity(currentUser.id, 365)
      ]);

      setUserStats(statsResponse.data.stats);
      setDailyActivity(activityResponse.data.dailyActivity || {});
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
