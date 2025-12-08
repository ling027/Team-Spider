import React, { useState, useEffect } from 'react';
import './discussion.css';
import '../main.css';
import NavBar from '../Component/Navbar';
import MinimalNavbar from '../Component/MinimalNavbar';
import Alert from '../../components/Alert';
import ConfirmDialog from '../../components/ConfirmDialog';
import { tmdb, type Movie as TmdbMovie } from '../../api/tmbd';
import { discussionsAPI, type DiscussionThread, type DiscussionReply } from '../../api/discussions';
import { useAuth } from '../../context/AuthContext';

// Type definitions - using API types
interface ThreadLocal extends DiscussionThread {
  replyList?: DiscussionReply[];
}

interface NewThreadForm {
  title: string;
  movie: string;
  content: string;
  tags: string;
}

interface SelectedMovie {
  id: number;
  title: string;
  year: number;
  runtime: number;
  poster: string;
  tmdbId: number;
}

function DiscussionPage(): React.ReactElement {
  const { isLoggedIn, user } = useAuth();
  const [threads, setThreads] = useState<ThreadLocal[]>([]);
  const [showNewThreadForm, setShowNewThreadForm] = useState<boolean>(false);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [newThread, setNewThread] = useState<NewThreadForm>({
    title: '',
    movie: '',
    content: '',
    tags: ''
  });
  const [movieSearchQuery, setMovieSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<TmdbMovie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<SelectedMovie | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [replyingToThread, setReplyingToThread] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'delete' | 'default';
    onConfirm: (() => void) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'default',
    onConfirm: null
  });

  // Fetch threads on mount
  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await discussionsAPI.getAll();
      const transformedThreads: ThreadLocal[] = response.data.threads.map(t => ({
        ...t,
        replyList: []
      }));
      setThreads(transformedThreads);
    } catch (err: any) {
      setError(err.message || 'Failed to load discussions');
      console.error('Error fetching threads:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleNewThreadForm = (): void => {
    setShowNewThreadForm(!showNewThreadForm);
    if (!showNewThreadForm) {
      setNewThread({
        title: '',
        movie: '',
        content: '',
        tags: ''
      });
      setMovieSearchQuery('');
      setSearchResults([]);
      setSelectedMovie(null);
      setIsSearching(false);
    }
  };

  const toggleThreadExpansion = async (threadId: string): Promise<void> => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(threadId)) {
        newSet.delete(threadId);
        return newSet;
      } else {
        newSet.add(threadId);
        // Fetch full thread details when expanding
        fetchThreadDetails(threadId);
        return newSet;
      }
    });
  };

  const fetchThreadDetails = async (threadId: string) => {
    try {
      const response = await discussionsAPI.getById(threadId);
      const updatedThread = response.data.thread;
      
      setThreads(prev => prev.map(t => 
        t.id === threadId 
          ? { ...t, replyList: updatedThread.replies || [] }
          : t
      ));
    } catch (err: any) {
      console.error('Error fetching thread details:', err);
    }
  };

  const handleInputChange = (field: keyof NewThreadForm, value: string): void => {
    setNewThread(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Search movies from TMDB API
  useEffect(() => {
    const searchMovies = async (): Promise<void> => {
      if (!movieSearchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);
        const response = await tmdb.searchMovies(movieSearchQuery.trim(), 1);
        setSearchResults(response.results.slice(0, 5)); // Limit to 5 results
      } catch (error) {
        console.error('Error searching movies:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchMovies, 500); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [movieSearchQuery]);

  // Handle movie selection from search results
  const handleSelectMovie = async (movie: TmdbMovie): Promise<void> => {
    try {
      // Fetch full movie details to get runtime
      const movieDetails = await tmdb.getMovieDetails(movie.id);
      
      const year = movieDetails.release_date 
        ? new Date(movieDetails.release_date).getFullYear() 
        : new Date().getFullYear();
      
      setSelectedMovie({
        id: movieDetails.id,
        title: movieDetails.title,
        year: year,
        runtime: movieDetails.runtime || 120,
        poster: movieDetails.poster_path 
          ? `https://image.tmdb.org/t/p/w500${movieDetails.poster_path}`
          : "https://via.placeholder.com/60x90/2b2b44/ffffff?text=No+Image",
        tmdbId: movieDetails.id
      });
      
      setNewThread(prev => ({
        ...prev,
        movie: movieDetails.title
      }));
      
      setMovieSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error fetching movie details:', error);
      setAlert({
        isOpen: true,
        message: 'Failed to load movie details. Please try again.',
        type: 'error'
      });
    }
  };

  const createNewThread = async (): Promise<void> => {
    const { title, content, tags } = newThread;
    const movieTitle = selectedMovie ? selectedMovie.title : newThread.movie.trim();
    const movieTmdbId = selectedMovie ? selectedMovie.tmdbId : 0;
    
    if (!title.trim() || !movieTitle || !content.trim()) {
      setAlert({
        isOpen: true,
        message: 'Please fill in all required fields (title, movie, and content)',
        type: 'warning'
      });
      return;
    }

    if (!selectedMovie && !newThread.movie.trim()) {
      setAlert({
        isOpen: true,
        message: 'Please search and select a movie from TMDB',
        type: 'warning'
      });
      return;
    }

    try {
      setError(null);
      const response = await discussionsAPI.create({
        title: title.trim(),
        movieTitle: movieTitle,
        movieTmdbId: movieTmdbId,
        content: content.trim(),
        tags: tags.trim() ? tags.split(',').map(tag => tag.trim()) : []
      });

      const newThreadLocal: ThreadLocal = {
        ...response.data.thread,
        replyList: []
      };

      setThreads([newThreadLocal, ...threads]);
      setShowNewThreadForm(false);
      setNewThread({
        title: '',
        movie: '',
        content: '',
        tags: ''
      });
      setMovieSearchQuery('');
      setSearchResults([]);
      setSelectedMovie(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create thread');
      console.error('Error creating thread:', err);
      setAlert({
        isOpen: true,
        message: err.message || 'Failed to create thread',
        type: 'error'
      });
    }
  };

  const handleReplyClick = (threadId: string): void => {
    if (!isLoggedIn) {
      setAlert({
        isOpen: true,
        message: 'Please log in to reply',
        type: 'warning'
      });
      return;
    }
    setReplyingToThread(threadId);
    setReplyContent('');
  };

  const handleCancelReply = (): void => {
    setReplyingToThread(null);
    setReplyContent('');
  };

  const handleSubmitReply = async (threadId: string): Promise<void> => {
    if (!replyContent.trim()) {
      setAlert({
        isOpen: true,
        message: 'Please enter a reply',
        type: 'warning'
      });
      return;
    }

    try {
      setError(null);
      const response = await discussionsAPI.addReply(threadId, {
        content: replyContent.trim()
      });

      const newReply = response.data.reply;

      setThreads(prevThreads => 
        prevThreads.map(thread => {
          if (thread.id === threadId) {
            return {
              ...thread,
              replies: thread.replies + 1,
              lastActivity: newReply.timestamp,
              replyList: [...(thread.replyList || []), newReply]
            };
          }
          return thread;
        })
      );

      setReplyingToThread(null);
      setReplyContent('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit reply');
      console.error('Error submitting reply:', err);
      setAlert({
        isOpen: true,
        message: err.message || 'Failed to submit reply',
        type: 'error'
      });
    }
  };

  const handleDeleteDiscussion = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Discussion',
      message: 'Are you sure you want to delete this discussion? This action cannot be undone.',
      type: 'delete',
      onConfirm: async () => {
        try {
          await discussionsAPI.delete(threadId);
          setThreads(prev => prev.filter(t => t.id !== threadId));
          setAlert({
            isOpen: true,
            message: 'Discussion deleted successfully',
            type: 'success'
          });
        } catch (err: any) {
          setAlert({
            isOpen: true,
            message: err.message || 'Failed to delete discussion',
            type: 'error'
          });
        }
        setConfirmDialog({ isOpen: false, title: '', message: '', type: 'default', onConfirm: null });
      }
    });
  };

  const handleDeleteReply = async (threadId: string, replyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Reply',
      message: 'Are you sure you want to delete this reply? This action cannot be undone.',
      type: 'delete',
      onConfirm: async () => {
        try {
          await discussionsAPI.deleteReply(threadId, replyId);
          setThreads(prev => prev.map(thread => {
            if (thread.id === threadId) {
              return {
                ...thread,
                replies: Math.max(0, thread.replies - 1),
                replyList: thread.replyList?.filter(r => r.id !== replyId) || []
              };
            }
            return thread;
          }));
          setAlert({
            isOpen: true,
            message: 'Reply deleted successfully',
            type: 'success'
          });
        } catch (err: any) {
          setAlert({
            isOpen: true,
            message: err.message || 'Failed to delete reply',
            type: 'error'
          });
        }
        setConfirmDialog({ isOpen: false, title: '', message: '', type: 'default', onConfirm: null });
      }
    });
  };

  return (
    <div className="discussion-body-wrapper">
      <header className="site-header">
        <NavBar/>
      </header>

      <MinimalNavbar />

      <div className="container">
        <header>
          <h1>Movie Discussions</h1>
          {error && (
            <div style={{ color: '#ff5555', marginTop: '10px', padding: '10px', background: 'rgba(255, 85, 85, 0.1)', borderRadius: '4px' }}>
              {error}
            </div>
          )}
        </header>

        <div className="main-content">
          <aside className="sidebar">
            <div className="sidebar-card">
              <div className="sidebar-header">
                <h3>Discussion Stats</h3>
              </div>
              <div className="sidebar-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Threads</span>
                  <span className="stat-value">{threads.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Replies</span>
                  <span className="stat-value">{threads.reduce((sum, thread) => sum + thread.replies, 0)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Views</span>
                  <span className="stat-value">{threads.reduce((sum, thread) => sum + thread.views, 0)}</span>
                </div>
              </div>
            </div>
          </aside>

          <div className="discussion-content">
            <div className="discussion-header">
              <h2>Latest Discussions</h2>
              <button className="btn-create-thread" onClick={toggleNewThreadForm}>
                + New Thread
              </button>
            </div>

            {showNewThreadForm && (
              <div className="new-thread-form">
                <h3>Create New Discussion</h3>
                <div className="form-group">
                  <label>Thread Title *</label>
                  <input
                    type="text"
                    value={newThread.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter discussion title"
                  />
                </div>
                
                <div className="form-group">
                  <label>Search Movie from TMDB *</label>
                  <input
                    type="text"
                    value={movieSearchQuery}
                    onChange={(e) => setMovieSearchQuery(e.target.value)}
                    placeholder="Search for a movie..."
                    disabled={!!selectedMovie}
                  />
                  {isSearching && (
                    <div className="search-status">
                      Searching...
                    </div>
                  )}
                  {!selectedMovie && searchResults.length > 0 && (
                    <div className="movie-search-results">
                      {searchResults.map((movie) => (
                        <div
                          key={movie.id}
                          className="movie-search-result-item"
                          onClick={() => handleSelectMovie(movie)}
                        >
                          {movie.poster_path && (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                              alt={movie.title}
                              className="movie-search-result-poster"
                            />
                          )}
                          <div>
                            <div className="movie-search-result-title">{movie.title}</div>
                            {movie.release_date && (
                              <div className="movie-search-result-year">
                                {new Date(movie.release_date).getFullYear()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedMovie && (
                    <div className="movie-selected">
                      <img
                        src={selectedMovie.poster}
                        alt={selectedMovie.title}
                        className="movie-selected-poster"
                      />
                      <div className="movie-selected-info">
                        <div className="movie-selected-title">{selectedMovie.title}</div>
                        <div className="movie-selected-details">
                          {selectedMovie.year} • {selectedMovie.runtime} min
                        </div>
                      </div>
                      <button
                        className="btn-clear-movie"
                        onClick={() => {
                          setSelectedMovie(null);
                          setMovieSearchQuery('');
                          setNewThread(prev => ({ ...prev, movie: '' }));
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <label>Or Enter Movie Title Manually</label>
                  <input
                    type="text"
                    value={newThread.movie}
                    onChange={(e) => handleInputChange('movie', e.target.value)}
                    placeholder="Enter movie title manually"
                    disabled={!!selectedMovie}
                  />
                </div>

                <div className="form-group">
                  <label>Discussion Content *</label>
                  <textarea
                    value={newThread.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    placeholder="Start your discussion..."
                    rows={4}
                    maxLength={1000}
                  />
                  <div className="char-count">
                    {newThread.content.length}/1000 characters
                  </div>
                </div>

                <div className="form-group">
                  <label>Tags (optional)</label>
                  <input
                    type="text"
                    value={newThread.tags}
                    onChange={(e) => handleInputChange('tags', e.target.value)}
                    placeholder="Enter tags separated by commas"
                  />
                </div>

                <div className="form-actions">
                  <button className="btn-cancel" onClick={toggleNewThreadForm}>
                    Cancel
                  </button>
                  <button className="btn-save" onClick={createNewThread}>
                    Create Thread
                  </button>
                </div>
              </div>
            )}

            <div className="threads-list">
              {loading ? (
                <div className="empty-state">
                  <div className="empty-icon">⏳</div>
                  <p>Loading discussions...</p>
                </div>
              ) : threads.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <p>No discussions yet. Start the conversation!</p>
                </div>
              ) : (
                threads.map(thread => (
                  <div key={thread.id} className="thread-card">
                    <div 
                      className="thread-header clickable"
                      onClick={() => toggleThreadExpansion(thread.id)}
                    >
                      <div className="thread-title-row">
                        <h3 className="thread-title">{thread.title}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {thread.author === user?.username && (
                            <button 
                              className="delete-discussion-btn"
                              onClick={(e) => handleDeleteDiscussion(thread.id, e)}
                              title="Delete discussion"
                            >
                              🗑️
                            </button>
                          )}
                          <span className={`expand-arrow ${expandedThreads.has(thread.id) ? 'expanded' : ''}`}>
                            ▼
                          </span>
                        </div>
                      </div>
                      <div className="thread-meta">
                        <span className="thread-movie">{thread.movie}</span>
                        <span className="thread-author">by {thread.author}</span>
                      </div>
                    </div>
                    
                    <div className="thread-content">
                      <p>{thread.content}</p>
                    </div>

                    <div className="thread-tags">
                      {thread.tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>

                    <div className="thread-stats">
                      <div className="stat">
                        <span className="stat-icon">💬</span>
                        <span>{thread.replies} replies</span>
                      </div>
                      <div className="stat">
                        <span className="stat-icon">👁️</span>
                        <span>{thread.views} views</span>
                      </div>
                      <div className="stat">
                        <span className="stat-icon">⏰</span>
                        <span>{new Date(thread.lastActivity).toLocaleString()}</span>
                      </div>
                    </div>

                    {expandedThreads.has(thread.id) && (
                      <div className="thread-expanded-content">
                        {/* Display existing replies */}
                        {thread.replyList && thread.replyList.length > 0 && (
                          <div className="replies-list">
                            <h4 className="replies-header">Replies ({thread.replyList.length})</h4>
                            {thread.replyList.map(reply => (
                              <div key={reply.id} className="reply-item">
                                <div className="reply-header">
                                  <span className="reply-author">{reply.author}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="reply-timestamp">
                                      {new Date(reply.timestamp).toLocaleString()}
                                    </span>
                                    {reply.author === user?.username && (
                                      <button 
                                        className="delete-reply-btn"
                                        onClick={(e) => handleDeleteReply(thread.id, reply.id, e)}
                                        title="Delete reply"
                                      >
                                        🗑️
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="reply-content">{reply.content}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply form */}
                        {replyingToThread === thread.id ? (
                          <div className="reply-form">
                            <textarea
                              className="reply-textarea"
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Write your reply..."
                              rows={3}
                            />
                            <div className="reply-actions">
                              <button className="btn-cancel" onClick={handleCancelReply}>
                                Cancel
                              </button>
                              <button className="btn-submit" onClick={() => handleSubmitReply(thread.id)}>
                                Submit Reply
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="thread-actions">
                            <button className="btn-reply" onClick={() => handleReplyClick(thread.id)}>
                              Reply
                            </button>
                            <button className="btn-like">👍 Like</button>
                            <button className="btn-share">Share</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <Alert
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, isOpen: false })}
      />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => confirmDialog.onConfirm?.()}
        onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '', type: 'default', onConfirm: null })}
      />
    </div>
  );
}

export default DiscussionPage;

