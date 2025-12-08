import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import type { AdminUser, AdminActivity, AdminComment, AdminCommentReply, AdminDiscussion, AdminWatchlist } from '../../api/admin';
import ConfirmDialog from '../../components/ConfirmDialog';
import Alert from '../../components/Alert';
import NavBar from '../Component/Navbar';
import { FaStar } from 'react-icons/fa';
import './admin.css';

interface UserDetailViewProps {
  userId: string;
  onBack: () => void;
}

const UserDetailView: React.FC<UserDetailViewProps> = ({ userId, onBack }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [watchlists, setWatchlists] = useState<AdminWatchlist[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [discussions, setDiscussions] = useState<AdminDiscussion[]>([]);
  const [replies, setReplies] = useState<any[]>([]);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedWatchlists, setExpandedWatchlists] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const [alert, setAlert] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  useEffect(() => {
    loadUserDetails();
  }, [userId]);

  const loadUserDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getUserDetails(userId);
      setUser(response.data.user);
      setStats(response.data.stats);
      setWatchlists(response.data.watchlists || []);
      setComments(response.data.comments || []);
      setDiscussions(response.data.discussions || []);
      setReplies(response.data.replies || []);
      setActivities(response.data.activities);
    } catch (err: any) {
      setError(err.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (itemId: string, type: string) => {
    const key = `${type}-${itemId}`;
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  const handleDeleteComment = (commentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this review?',
      type: 'delete',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          setLoading(true);
          await adminAPI.deleteComment(commentId);
          loadUserDetails();
        } catch (err: any) {
          setError(err.message || 'Failed to delete review');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteCommentReply = (commentId: string, replyId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this reply?',
      type: 'delete',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          setLoading(true);
          await adminAPI.deleteCommentReply(commentId, replyId);
          loadUserDetails();
        } catch (err: any) {
          setError(err.message || 'Failed to delete reply');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteDiscussion = (discussionId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this discussion?',
      type: 'delete',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          setLoading(true);
          await adminAPI.deleteDiscussion(discussionId);
          loadUserDetails();
        } catch (err: any) {
          setError(err.message || 'Failed to delete discussion');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleRestoreComment = async (commentId: string) => {
    try {
      setLoading(true);
      await adminAPI.restoreComment(commentId);
      loadUserDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to restore review');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreDiscussion = async (discussionId: string) => {
    try {
      setLoading(true);
      await adminAPI.restoreDiscussion(discussionId);
      loadUserDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to restore discussion');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReply = (threadId: string, replyId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this reply?',
      type: 'delete',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          setLoading(true);
          await adminAPI.deleteReply(threadId, replyId);
          loadUserDetails();
        } catch (err: any) {
          setError(err.message || 'Failed to delete reply');
        } finally {
          setLoading(false);
        }
      }
    });
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
          
          // Reload user details to update the UI
          await loadUserDetails();
          
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

  const handleDelete = () => {
    if (!user) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Delete',
      message: `Are you sure you want to delete user "${user.username}"?`,
      type: 'delete',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          setLoading(true);
          await adminAPI.deleteUser(userId);
          setAlert({
            isOpen: true,
            message: 'User deleted successfully',
            type: 'success'
          });
          setTimeout(() => onBack(), 1000);
        } catch (err: any) {
          setError(err.message || 'Failed to delete user');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleRestore = () => {
    if (!user) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Restore',
      message: `Are you sure you want to restore user "${user.username}"?`,
      type: 'restore',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          setLoading(true);
          await adminAPI.restoreUser(userId);
          loadUserDetails();
        } catch (err: any) {
          setError(err.message || 'Failed to restore user');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  if (loading && !user) {
    return <div className="admin-loading">Loading user details...</div>;
  }

  if (error && !user) {
    return (
      <div>
        <div className="admin-error">{error}</div>
        <button onClick={onBack} className="admin-back-button">Back to Dashboard</button>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <NavBar />
      <div className="admin-detail-view">
        <div className="admin-detail-header">
          <button onClick={onBack} className="admin-back-button">← Back to Dashboard</button>
          <h2>User Details: {user.username}</h2>
        </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-detail-content">
        <div className="admin-detail-section">
          <h3>Profile Information</h3>
          <div className="admin-detail-info">
            <div className="info-row">
              <strong>Username:</strong> <span>{user.username}</span>
            </div>
            <div className="info-row">
              <strong>Email:</strong> <span>{user.email}</span>
            </div>
            <div className="info-row">
              <strong>Full Name:</strong> <span>{user.fullname}</span>
            </div>
            <div className="info-row">
              <strong>Admin:</strong> <span>{user.isAdmin ? 'Yes' : 'No'}</span>
            </div>
            <div className="info-row">
              <strong>Status:</strong> <span className={user.isDeleted ? 'deleted-status' : 'active-status'}>
                {user.isDeleted ? 'Deleted' : 'Active'}
              </span>
            </div>
            <div className="info-row">
              <strong>Created:</strong> <span>{new Date(user.createdAt).toLocaleString()}</span>
            </div>
            {user.deletedAt && (
              <div className="info-row">
                <strong>Deleted At:</strong> <span>{new Date(user.deletedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="admin-detail-section">
          <h3>Statistics</h3>
          <div className="admin-detail-info">
            <div className="info-row">
              <strong>Total Watchlists:</strong> <span>{stats?.totalWatchlists || 0}</span>
            </div>
            <div className="info-row">
              <strong>Total Reviews:</strong> <span>{stats?.totalComments || 0}</span>
            </div>
            <div className="info-row">
              <strong>Total Discussions:</strong> <span>{stats?.totalDiscussions || 0}</span>
            </div>
          </div>
        </div>

        <div className="admin-detail-section">
          <h3>Watchlists ({watchlists.length})</h3>
          <div className="admin-interactions-list">
            {watchlists.length === 0 ? (
              <p>No watchlists found</p>
            ) : (
              <div className="interactions-container">
                {watchlists.map((watchlist) => {
                  const isExpanded = expandedWatchlists.has(watchlist.id);
                  return (
                    <div key={watchlist.id} className={`interaction-item ${watchlist.isDeleted ? 'deleted' : ''}`}>
                      <div className="interaction-header" onClick={() => watchlist.movieCount > 0 && toggleWatchlistExpand(watchlist.id)}>
                        <div className="interaction-info">
                          <strong>{watchlist.name}</strong>
                          <span className="interaction-meta">
                            {watchlist.movieCount} movie{watchlist.movieCount !== 1 ? 's' : ''}
                          </span>
                          <span className="interaction-date">
                            Created: {new Date(watchlist.createdAt).toLocaleString()}
                          </span>
                          {watchlist.isDeleted && <span className="deleted-badge">Deleted</span>}
                        </div>
                        {watchlist.movieCount > 0 && (
                          <button className="expand-button">
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        )}
                      </div>
                      {isExpanded && watchlist.movies && watchlist.movies.length > 0 && (
                        <div className="interaction-content">
                          <div className="watchlist-movies-grid" style={{ marginTop: '1rem' }}>
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
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="admin-detail-section">
          <h3>Reviews ({comments.length})</h3>
          <div className="admin-interactions-list">
            {comments.length === 0 ? (
              <p>No reviews found</p>
            ) : (
              <div className="interactions-container">
                {comments.map((comment) => {
                  const isExpanded = expandedItems.has(`comment-${comment.id}`);
                  return (
                    <div key={comment.id} className={`interaction-item ${comment.isDeleted ? 'deleted' : ''}`}>
                      <div className="interaction-header" onClick={() => toggleExpand(comment.id, 'comment')}>
                        <div className="interaction-info">
                          <strong>Movie ID: {comment.movieTmdbId}</strong>
                          {comment.rating && (
                            <span className="interaction-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              Rating: {[1, 2, 3, 4, 5].map((star) => (
                                <FaStar
                                  key={star}
                                  className={star <= comment.rating! ? 'filled' : 'empty'}
                                  style={{ color: star <= comment.rating! ? '#ffdd59' : '#ccc', fontSize: '14px' }}
                                />
                              ))}
                              <span style={{ marginLeft: '4px' }}>{comment.rating}/5</span>
                            </span>
                          )}
                          {comment.replies && comment.replies.length > 0 && (
                            <span className="interaction-meta">
                              {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                            </span>
                          )}
                          <span className="interaction-date">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                          {comment.isDeleted && <span className="deleted-badge">Deleted</span>}
                        </div>
                        <button className="expand-button">
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="interaction-content">
                          <div className="interaction-text">
                            <p>{comment.text}</p>
                          </div>
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="admin-replies-list" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                              <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#333' }}>
                                Replies ({comment.replies.length})
                              </h4>
                              {comment.replies.map((reply: AdminCommentReply) => (
                                <div key={reply.id} className="admin-reply-item">
                                  <div className="admin-reply-header">
                                    <div>
                                      <strong>{reply.author}</strong>
                                      <span className="admin-reply-timestamp">
                                        {new Date(reply.timestamp).toLocaleString()}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteCommentReply(comment.id, reply.id)}
                                      className="admin-delete-reply-button"
                                      title="Delete reply"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                  <div className="admin-reply-content">
                                    <p style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', margin: 0 }}>
                                      {reply.text}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="interaction-actions">
                            {comment.isDeleted ? (
                              <button
                                onClick={() => handleRestoreComment(comment.id)}
                                className="admin-action-button restore small"
                              >
                                Restore Review
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="admin-action-button delete small"
                              >
                                Delete Review
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="admin-detail-section">
          <h3>Replies to Discussions ({replies.length})</h3>
          <div className="admin-interactions-list">
            {replies.length === 0 ? (
              <p>No replies found</p>
            ) : (
              <div className="interactions-container">
                {replies.map((reply) => {
                  const isExpanded = expandedItems.has(`reply-${reply.id}`);
                  return (
                    <div key={reply.id} className="interaction-item">
                      <div className="interaction-header" onClick={() => toggleExpand(reply.id, 'reply')}>
                        <div className="interaction-info">
                          <strong>Reply to: {reply.threadTitle}</strong>
                          <span className="interaction-meta">
                            Movie: {reply.threadMovie} (ID: {reply.threadMovieId})
                          </span>
                          <span className="interaction-date">
                            {new Date(reply.timestamp).toLocaleString()}
                          </span>
                          {reply.threadIsDeleted && <span className="deleted-badge">Thread Deleted</span>}
                        </div>
                        <button className="expand-button">
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="interaction-content">
                          <div className="interaction-text">
                            <p>{reply.content}</p>
                          </div>
                          <div className="interaction-actions">
                            <button
                              onClick={() => handleDeleteReply(reply.threadId, reply.id)}
                              className="admin-action-button delete small"
                            >
                              Delete Reply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="admin-detail-section">
          <h3>Discussions ({discussions.length})</h3>
          <div className="admin-interactions-list">
            {discussions.length === 0 ? (
              <p>No discussions found</p>
            ) : (
              <div className="interactions-container">
                {discussions.map((discussion) => {
                  const isExpanded = expandedItems.has(`discussion-${discussion.id}`);
                  return (
                    <div key={discussion.id} className={`interaction-item ${discussion.isDeleted ? 'deleted' : ''}`}>
                      <div className="interaction-header" onClick={() => toggleExpand(discussion.id, 'discussion')}>
                        <div className="interaction-info">
                          <strong>{discussion.title}</strong>
                          <span className="interaction-meta">
                            Movie: {discussion.movie} | Replies: {discussion.replies} | Views: {discussion.views}
                          </span>
                          <span className="interaction-date">
                            {new Date(discussion.createdAt).toLocaleString()}
                          </span>
                          {discussion.isDeleted && <span className="deleted-badge">Deleted</span>}
                        </div>
                        <button className="expand-button">
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="interaction-content">
                          <div className="interaction-text">
                            <p>{discussion.content}</p>
                            {discussion.tags && discussion.tags.length > 0 && (
                              <div className="interaction-tags">
                                <strong>Tags:</strong> {discussion.tags.join(', ')}
                              </div>
                            )}
                          </div>
                          <div className="interaction-actions">
                            {discussion.isDeleted ? (
                              <button
                                onClick={() => handleRestoreDiscussion(discussion.id)}
                                className="admin-action-button restore small"
                              >
                                Restore Discussion
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteDiscussion(discussion.id)}
                                className="admin-action-button delete small"
                              >
                                Delete Discussion
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="admin-detail-section">
          <h3>Recent Activity ({activities.length})</h3>
          <div className="admin-activity-list">
            {activities.length === 0 ? (
              <p>No activity found</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Movie ID</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <tr key={activity.id}>
                      <td>{activity.activityType}</td>
                      <td>{activity.movieId}</td>
                      <td>{new Date(activity.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="admin-detail-actions">
          {user.isDeleted ? (
            <button onClick={handleRestore} className="admin-action-button restore">
              Restore User
            </button>
          ) : (
            <button onClick={handleDelete} className="admin-action-button delete">
              Delete User
            </button>
          )}
        </div>
      </div>
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
      <Alert
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, isOpen: false })}
      />
    </>
  );
};

export default UserDetailView;

