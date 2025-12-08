import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import type { AdminStats, AdminUser, AdminComment, AdminDiscussion, AdminWatchlist, AdminActivity, TrashItem, AdminFilters } from '../../api/admin';
import UserDetailView from './UserDetailView';
import DiscussionDetailView from './DiscussionDetailView';
import CommentDetailView from './CommentDetailView';
import ConfirmDialog from '../../components/ConfirmDialog';
import NavBar from '../Component/Navbar';
import './admin.css';

type TabType = 'stats' | 'users' | 'comments' | 'discussions' | 'watchlists' | 'activity' | 'trash';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [discussions, setDiscussions] = useState<AdminDiscussion[]>([]);
  const [watchlists, setWatchlists] = useState<AdminWatchlist[]>([]);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdminFilters>({
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState<any>(null);
  const [expandedWatchlists, setExpandedWatchlists] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'delete' | 'restore' | 'default';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'default',
    onConfirm: () => {}
  });

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    else if (activeTab === 'comments') loadComments();
    else if (activeTab === 'discussions') loadDiscussions();
    else if (activeTab === 'watchlists') loadWatchlists();
    else if (activeTab === 'activity') loadActivity();
    else if (activeTab === 'trash') loadTrash();
  }, [activeTab, filters]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getStats();
      setStats(response.data.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUsers(filters);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getComments(filters);
      setComments(response.data.comments);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const loadDiscussions = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDiscussions(filters);
      setDiscussions(response.data.discussions);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  const loadWatchlists = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getWatchlists(filters);
      setWatchlists(response.data.watchlists);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load watchlists');
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getActivity(filters);
      setActivities(response.data.activities);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  const loadTrash = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getTrash(filters);
      setTrash(response.data.trash);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load trash');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (type: string, id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Delete',
      message: `Are you sure you want to delete this ${type}?`,
      type: 'delete',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          setLoading(true);
          if (type === 'user') await adminAPI.deleteUser(id);
          else if (type === 'comment') await adminAPI.deleteComment(id);
          else if (type === 'discussion') await adminAPI.deleteDiscussion(id);
          else if (type === 'watchlist') await adminAPI.deleteWatchlist(id);

          // Reload current tab
          if (activeTab === 'users') loadUsers();
          else if (activeTab === 'comments') loadComments();
          else if (activeTab === 'discussions') loadDiscussions();
          else if (activeTab === 'watchlists') loadWatchlists();
          else if (activeTab === 'trash') loadTrash();
          
          loadStats();
        } catch (err: any) {
          setError(err.message || `Failed to delete ${type}`);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleRestore = (type: string, id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Restore',
      message: `Are you sure you want to restore this ${type}?`,
      type: 'restore',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          setLoading(true);
          if (type === 'user') await adminAPI.restoreUser(id);
          else if (type === 'comment') await adminAPI.restoreComment(id);
          else if (type === 'discussion') await adminAPI.restoreDiscussion(id);
          else if (type === 'watchlist') await adminAPI.restoreWatchlist(id);

          // Reload current tab
          if (activeTab === 'trash') loadTrash();
          else if (activeTab === 'users') loadUsers();
          else if (activeTab === 'comments') loadComments();
          else if (activeTab === 'discussions') loadDiscussions();
          else if (activeTab === 'watchlists') loadWatchlists();
          
          loadStats();
        } catch (err: any) {
          setError(err.message || `Failed to restore ${type}`);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const toggleWatchlistExpand = (watchlistId: string) => {
    setExpandedWatchlists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(watchlistId)) {
        newSet.delete(watchlistId);
      } else {
        newSet.add(watchlistId);
      }
      return newSet;
    });
  };

  const handleRemoveMovieFromWatchlist = (watchlistId: string, movieTmdbId: number, movieTitle: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Movie',
      message: `Are you sure you want to remove "${movieTitle}" from this watchlist?`,
      type: 'delete',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          setLoading(true);
          
          // Check if this is the last movie in the watchlist
          const watchlist = watchlists.find(w => w.id === watchlistId);
          const willBeEmpty = watchlist && watchlist.movies && watchlist.movies.length === 1;
          
          await adminAPI.removeMovieFromWatchlist(watchlistId, movieTmdbId);
          
          // Reload watchlists to update the UI
          await loadWatchlists();
          
          // Close the expanded view if the watchlist becomes empty
          if (willBeEmpty) {
            setExpandedWatchlists(prev => {
              const newSet = new Set(prev);
              newSet.delete(watchlistId);
              return newSet;
            });
          }
        } catch (err: any) {
          setError(err.message || 'Failed to remove movie from watchlist');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <>
      <NavBar />
      <div className="admin-dashboard">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          {error && <div className="admin-error">{error}</div>}
        </div>

      <div className="admin-tabs">
        <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>
          Statistics
        </button>
        <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
          Users
        </button>
        <button className={activeTab === 'comments' ? 'active' : ''} onClick={() => setActiveTab('comments')}>
          Reviews
        </button>
        <button className={activeTab === 'discussions' ? 'active' : ''} onClick={() => setActiveTab('discussions')}>
          Discussions
        </button>
        <button className={activeTab === 'watchlists' ? 'active' : ''} onClick={() => setActiveTab('watchlists')}>
          Watchlists
        </button>
        <button className={activeTab === 'activity' ? 'active' : ''} onClick={() => setActiveTab('activity')}>
          Activity
        </button>
        <button className={activeTab === 'trash' ? 'active' : ''} onClick={() => setActiveTab('trash')}>
          Trash Can
        </button>
      </div>

      {selectedUserId ? (
        <UserDetailView
          userId={selectedUserId}
          onBack={() => setSelectedUserId(null)}
        />
      ) : selectedDiscussionId ? (
        <DiscussionDetailView
          discussionId={selectedDiscussionId}
          onBack={() => setSelectedDiscussionId(null)}
        />
      ) : selectedCommentId ? (
        (() => {
          const selectedComment = comments.find(c => c.id === selectedCommentId);
          if (!selectedComment) {
            return (
              <div className="admin-content">
                <div className="admin-error">Review not found. It may have been deleted or filtered out.</div>
                <button onClick={() => setSelectedCommentId(null)} className="admin-back-button">
                  ← Back to Reviews
                </button>
              </div>
            );
          }
          return (
            <CommentDetailView
              comment={selectedComment}
              onBack={() => setSelectedCommentId(null)}
              onDelete={() => {
                loadComments();
                loadStats();
              }}
              onRestore={() => {
                loadComments();
                loadStats();
              }}
            />
          );
        })()
      ) : (
      <div className="admin-content">
        {loading && <div className="admin-loading">Loading...</div>}

        {activeTab === 'stats' && stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Users</h3>
              <p>{stats.totalUsers}</p>
            </div>
            <div className="stat-card">
              <h3>Total Reviews</h3>
              <p>{stats.totalComments}</p>
            </div>
            <div className="stat-card">
              <h3>Total Discussions</h3>
              <p>{stats.totalDiscussions}</p>
            </div>
            <div className="stat-card">
              <h3>Total Watchlists</h3>
              <p>{stats.totalWatchlists}</p>
            </div>
            <div className="stat-card">
              <h3>Deleted Items</h3>
              <p>{stats.deletedItems}</p>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-table-container">
            <div className="admin-filters">
              <input
                type="text"
                placeholder="Search users..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
              <label>
                <input
                  type="checkbox"
                  checked={filters.includeDeleted || false}
                  onChange={(e) => handleFilterChange('includeDeleted', e.target.checked)}
                />
                Show deleted
              </label>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Full Name</th>
                  <th>Admin</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={user.isDeleted ? 'deleted' : ''}>
                    <td>
                      <button
                        className="admin-link-button"
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        {user.username}
                      </button>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.fullname}</td>
                    <td>{user.isAdmin ? 'Yes' : 'No'}</td>
                    <td>{user.isDeleted ? 'Deleted' : 'Active'}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      {user.isDeleted ? (
                        <button onClick={() => handleRestore('user', user.id)}>Restore</button>
                      ) : (
                        <button onClick={() => handleDelete('user', user.id)}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination && (
              <div className="admin-pagination">
                <button disabled={pagination.page === 1} onClick={() => handlePageChange(pagination.page - 1)}>
                  Previous
                </button>
                <span>Page {pagination.page} of {pagination.pages}</span>
                <button disabled={pagination.page === pagination.pages} onClick={() => handlePageChange(pagination.page + 1)}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="admin-table-container">
            <div className="admin-filters">
              <input
                type="text"
                placeholder="Search reviews..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
              <label>
                <input
                  type="checkbox"
                  checked={filters.includeDeleted || false}
                  onChange={(e) => handleFilterChange('includeDeleted', e.target.checked)}
                />
                Show deleted
              </label>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Movie ID</th>
                  <th>Review</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((comment) => (
                  <tr key={comment.id} className={comment.isDeleted ? 'deleted' : ''}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          className="admin-expand-button"
                          onClick={() => setSelectedCommentId(comment.id)}
                          aria-label="View full review"
                          title="View full review"
                        >
                          ▶
                        </button>
                        <span>{comment.username}</span>
                      </div>
                    </td>
                    <td>{comment.movieTmdbId}</td>
                    <td>
                      {comment.text.length > 50 ? `${comment.text.substring(0, 50)}...` : comment.text}
                    </td>
                    <td>{comment.isDeleted ? 'Deleted' : 'Active'}</td>
                    <td>{new Date(comment.createdAt).toLocaleDateString()}</td>
                    <td>
                      {comment.isDeleted ? (
                        <button onClick={() => handleRestore('comment', comment.id)}>Restore</button>
                      ) : (
                        <button onClick={() => handleDelete('comment', comment.id)}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination && (
              <div className="admin-pagination">
                <button disabled={pagination.page === 1} onClick={() => handlePageChange(pagination.page - 1)}>
                  Previous
                </button>
                <span>Page {pagination.page} of {pagination.pages}</span>
                <button disabled={pagination.page === pagination.pages} onClick={() => handlePageChange(pagination.page + 1)}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'discussions' && (
          <div className="admin-table-container">
            <div className="admin-filters">
              <input
                type="text"
                placeholder="Search discussions..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
              <label>
                <input
                  type="checkbox"
                  checked={filters.includeDeleted || false}
                  onChange={(e) => handleFilterChange('includeDeleted', e.target.checked)}
                />
                Show deleted
              </label>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Movie</th>
                  <th>Replies</th>
                  <th>Views</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ width: '40px' }}></th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {discussions.map((discussion) => (
                  <tr key={discussion.id} className={discussion.isDeleted ? 'deleted' : ''}>
                    <td>{discussion.title}</td>
                    <td>{discussion.author}</td>
                    <td>{discussion.movie}</td>
                    <td>{discussion.replies}</td>
                    <td>{discussion.views}</td>
                    <td>{discussion.isDeleted ? 'Deleted' : 'Active'}</td>
                    <td>{new Date(discussion.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="admin-expand-button"
                        onClick={() => setSelectedDiscussionId(discussion.id)}
                        aria-label="View full discussion"
                        title="View full discussion"
                      >
                        ▶
                      </button>
                    </td>
                    <td>
                      {discussion.isDeleted ? (
                        <button onClick={() => handleRestore('discussion', discussion.id)}>Restore</button>
                      ) : (
                        <button onClick={() => handleDelete('discussion', discussion.id)}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination && (
              <div className="admin-pagination">
                <button disabled={pagination.page === 1} onClick={() => handlePageChange(pagination.page - 1)}>
                  Previous
                </button>
                <span>Page {pagination.page} of {pagination.pages}</span>
                <button disabled={pagination.page === pagination.pages} onClick={() => handlePageChange(pagination.page + 1)}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'watchlists' && (
          <div className="admin-table-container">
            <div className="admin-filters">
              <input
                type="text"
                placeholder="Search watchlists..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
              <label>
                <input
                  type="checkbox"
                  checked={filters.includeDeleted || false}
                  onChange={(e) => handleFilterChange('includeDeleted', e.target.checked)}
                />
                Show deleted
              </label>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Name</th>
                  <th>Owner</th>
                  <th>Movies</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {watchlists.map((watchlist) => {
                  const isExpanded = expandedWatchlists.has(watchlist.id);
                  return (
                    <React.Fragment key={watchlist.id}>
                      <tr className={watchlist.isDeleted ? 'deleted' : ''}>
                        <td>
                          {watchlist.movieCount > 0 && (
                            <button
                              className="admin-expand-button"
                              onClick={() => toggleWatchlistExpand(watchlist.id)}
                              aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          )}
                        </td>
                        <td>{watchlist.name}</td>
                        <td>{watchlist.username}</td>
                        <td>{watchlist.movieCount}</td>
                        <td>{watchlist.isDeleted ? 'Deleted' : 'Active'}</td>
                        <td>{new Date(watchlist.createdAt).toLocaleDateString()}</td>
                        <td>
                          {watchlist.isDeleted ? (
                            <button onClick={() => handleRestore('watchlist', watchlist.id)}>Restore</button>
                          ) : (
                            <button onClick={() => handleDelete('watchlist', watchlist.id)}>Delete</button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && watchlist.movies && watchlist.movies.length > 0 && (
                        <tr>
                          <td colSpan={7} className="watchlist-expanded-content">
                            <div className="watchlist-movies-container">
                              <h4>Movies in "{watchlist.name}"</h4>
                              <div className="watchlist-movies-grid">
                                {watchlist.movies.map((movie: any, index: number) => (
                                  <div key={index} className="watchlist-movie-card">
                                    {movie.poster && (
                                      <img 
                                        src={movie.poster} 
                                        alt={movie.title}
                                        className="watchlist-movie-poster"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <div className="watchlist-movie-details">
                                      <div className="watchlist-movie-header">
                                        <h5>{movie.title} ({movie.year})</h5>
                                        <button
                                          className="watchlist-remove-movie-button"
                                          onClick={() => handleRemoveMovieFromWatchlist(watchlist.id, movie.tmdbId, movie.title)}
                                          title="Remove movie from watchlist"
                                        >
                                          ×
                                        </button>
                                      </div>
                                      <div className="watchlist-movie-meta">
                                        <span>Runtime: {movie.runtime} min</span>
                                        <span className="watchlist-movie-rating">
                                          Rating: {'★'.repeat(movie.rating)}{'☆'.repeat(5 - movie.rating)}
                                        </span>
                                      </div>
                                      {movie.review && (
                                        <div className="watchlist-movie-review">
                                          <strong>Review:</strong>
                                          <p>{movie.review}</p>
                                        </div>
                                      )}
                                      {!movie.review && (
                                        <div className="watchlist-movie-review-empty">
                                          <em>No review provided</em>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {pagination && (
              <div className="admin-pagination">
                <button disabled={pagination.page === 1} onClick={() => handlePageChange(pagination.page - 1)}>
                  Previous
                </button>
                <span>Page {pagination.page} of {pagination.pages}</span>
                <button disabled={pagination.page === pagination.pages} onClick={() => handlePageChange(pagination.page + 1)}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Activity Type</th>
                  <th>Movie ID</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td>{activity.username}</td>
                    <td>{activity.activityType}</td>
                    <td>{activity.movieId}</td>
                    <td>{new Date(activity.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination && (
              <div className="admin-pagination">
                <button disabled={pagination.page === 1} onClick={() => handlePageChange(pagination.page - 1)}>
                  Previous
                </button>
                <span>Page {pagination.page} of {pagination.pages}</span>
                <button disabled={pagination.page === pagination.pages} onClick={() => handlePageChange(pagination.page + 1)}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'trash' && (
          <div className="admin-table-container">
            <div className="admin-filters">
              <select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
              >
                <option value="">All Types</option>
                <option value="user">Users</option>
                <option value="comment">Reviews</option>
                <option value="discussion">Discussions</option>
                <option value="watchlist">Watchlists</option>
              </select>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Content</th>
                  <th>Deleted At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trash.map((item) => (
                  <tr key={item.id} className="deleted">
                    <td>{item.type}</td>
                    <td>{item.title}</td>
                    <td>{item.content}</td>
                    <td>{item.deletedAt ? new Date(item.deletedAt).toLocaleString() : 'N/A'}</td>
                    <td>
                      <button onClick={() => handleRestore(item.type, item.id)}>Restore</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination && (
              <div className="admin-pagination">
                <button disabled={pagination.page === 1} onClick={() => handlePageChange(pagination.page - 1)}>
                  Previous
                </button>
                <span>Page {pagination.page} of {pagination.pages}</span>
                <button disabled={pagination.page === pagination.pages} onClick={() => handlePageChange(pagination.page + 1)}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}
      </div>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.type === 'delete' ? 'Delete' : confirmDialog.type === 'restore' ? 'Restore' : 'Confirm'}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </>
  );
};

export default AdminDashboard;

