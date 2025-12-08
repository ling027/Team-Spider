import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { movies, upcomingMovies } from "./movies";
import MovieDetailCard from "../Component/MovieDetailCard/MovieDetail";
import Alert from "../../components/Alert";
import "./MovieDetailPage.css";
import { useLang } from "../../i18n/LanguageContext.jsx";
import { tmdb } from "../../api/tmbd";
import type { MovieDetails, Credits, Video } from "../../api/tmbd";
import {useAuth} from "../../context/AuthContext";
import { FaUserLarge } from 'react-icons/fa6';
import { FaStar } from 'react-icons/fa';
import { commentsAPI, type MovieComment } from "../../api/comments";

function formatDate(lang: string, iso: string): string {
  if (!iso) return "";
  try {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: "UTC" }).format(dt);
  } catch {
    return "";
  }
}

function normalizeForRender(movie: any, lang: string, t: (key: string) => string) {
  // genre can be a string or an array of keys
  const genreText = Array.isArray(movie.genre)
    ? movie.genre.map((k: string) => t(k)).join(", ")
    : movie.genres
    ? movie.genres.map((k: any) => t(k)).join(", ")
    : movie.genre || "";

  // date may be DOR (string) or releaseDate (ISO)
  const dateText = movie.releaseDate
    ? formatDate(lang, movie.releaseDate)
    : movie.DOR || "";

  // synopsis may be string or {en, el, es}
  const synopsisText =
    movie.synopsis && typeof movie.synopsis === "object"
      ? movie.synopsis[lang] || movie.synopsis.en || ""
      : movie.synopsis || "";

  return { genreText, dateText, synopsisText };
}

// Get trailer URL from TMDB video key
function getTrailerUrl(trailer: Video): string | null {
  if (!trailer || trailer.site !== "YouTube") return null;
  
  // Return YouTube embed URL for autoplay, mute, and loop
  return `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&loop=1&playlist=${trailer.key}`;
}

// Transform TMDB MovieDetails to match static movie format
function transformTMDBMovie(movieDetails: MovieDetails & { credits: Credits }, trailer: string | null, lang: string): any {
  // Get genres as a string (for display)
  const genres = movieDetails.genres?.map(g => g.name).join(", ") || "";
  
  // Get cast (top 10)
  const cast = movieDetails.credits?.cast
    .slice(0, 10)
    .map(c => c.name)
    .join(", ") || "";
  
  // Get director from crew
  const director = movieDetails.credits?.crew
    .find(c => c.job === "Director")?.name || "";
  
  // Get screenwriter from crew (try multiple job titles)
  const screenwriter = movieDetails.credits?.crew
    .find(c => c.job === "Screenplay" || c.job === "Writer" || c.job === "Screenwriter")?.name || "";
  
  // Get production company (prefer the first one, but could concatenate multiple)
  const studio = movieDetails.production_companies?.[0]?.name || "";
  
  // Format runtime
  const length = movieDetails.runtime ? `${movieDetails.runtime} min` : "";
  
  // Format rating (using vote_average)
  const rating = movieDetails.vote_average ? `${movieDetails.vote_average.toFixed(1)}/10` : "N/A";
  
  return {
    id: movieDetails.id,
    title: movieDetails.title,
    poster: movieDetails.poster_path 
      ? `https://image.tmdb.org/t/p/original${movieDetails.poster_path}` 
      : "",
    trailer: trailer,
    genre: genres, // Pass as string to avoid translation lookup
    releaseDate: movieDetails.release_date,
    synopsis: movieDetails.overview || "",
    rating: rating,
    casts: cast,
    length: length,
    studio: studio,
    director: director,
    screenwriter: screenwriter,
  };
}

function MDP({ source }: { source: any[] }) {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const { lang, t } = useLang();
  const [movie, setMovie] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoggedIn, user } = useAuth();
  const [commentInput, setCommentInput] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [comments, setComments] = useState<MovieComment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [replyingToComment, setReplyingToComment] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');
  const [alert, setAlert] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  });
 
  // Fetch comments when movie ID changes
  useEffect(() => {
    if (numId && !isNaN(numId)) {
      fetchComments();
    }
  }, [numId]);

  const fetchComments = async () => {
    try {
      setCommentError(null);
      const response = await commentsAPI.getByMovie(numId);
      setComments(response.data.comments);
    } catch (err: any) {
      setCommentError(err.message || 'Failed to load comments');
      console.error('Error fetching comments:', err);
    }
  };

  const handleCommentSubmit = async () => {
    if (!isLoggedIn) {
      setAlert({
        isOpen: true,
        message: "Please Sign in to submit reviews!",
        type: 'warning'
      });
      return;
    }
    if (!commentInput.trim()) {
      setAlert({
        isOpen: true,
        message: "Please enter your review text",
        type: 'warning'
      });
      return;
    }
    if (rating === 0) {
      setAlert({
        isOpen: true,
        message: "Please provide a rating",
        type: 'warning'
      });
      return;
    }

    try {
      setCommentLoading(true);
      setCommentError(null);
      const response = await commentsAPI.create(numId, {
        text: commentInput.trim(),
        rating: rating
      });
      
      setComments([response.data.comment, ...comments]);
      setCommentInput("");
      setRating(0);
      setAlert({
        isOpen: true,
        message: 'Review submitted successfully',
        type: 'success'
      });
    } catch (err: any) {
      setCommentError(err.message || 'Failed to submit review');
      console.error('Error submitting review:', err);
      setAlert({
        isOpen: true,
        message: err.message || 'Failed to submit review',
        type: 'error'
      });
    } finally {
      setCommentLoading(false);
    }
  };

  const toggleCommentExpansion = (commentId: string): void => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const handleReplyClick = (commentId: string): void => {
    if (!isLoggedIn) {
      setAlert({
        isOpen: true,
        message: 'Please log in to reply',
        type: 'warning'
      });
      return;
    }
    setReplyingToComment(commentId);
    setReplyContent('');
  };

  const handleCancelReply = (): void => {
    setReplyingToComment(null);
    setReplyContent('');
  };

  const handleSubmitReply = async (commentId: string): Promise<void> => {
    if (!replyContent.trim()) {
      setAlert({
        isOpen: true,
        message: 'Please enter a reply',
        type: 'warning'
      });
      return;
    }

    try {
      setCommentError(null);
      const response = await commentsAPI.addReply(numId, commentId, {
        text: replyContent.trim()
      });

      const newReply = response.data.reply;

      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), newReply]
            };
          }
          return comment;
        })
      );

      setReplyingToComment(null);
      setReplyContent('');
      setAlert({
        isOpen: true,
        message: 'Reply submitted successfully',
        type: 'success'
      });
    } catch (err: any) {
      setCommentError(err.message || 'Failed to submit reply');
      console.error('Error submitting reply:', err);
      setAlert({
        isOpen: true,
        message: err.message || 'Failed to submit reply',
        type: 'error'
      });
    }
  };


  useEffect(() => {
    const fetchMovie = async () => {
      try {
        setLoading(true);
        setError(null);

        const staticMovie = source.find((m) => m.id === numId);

        if (staticMovie) {
          setMovie(staticMovie);
          setLoading(false);
          return;
        }

        if (numId > 10) {
          const [movieDetails, videosResponse] = await Promise.all([
            tmdb.getMovieDetails(numId),
            tmdb.getMovieVideos(numId).catch(() => null),
          ]);

          let trailerUrl: string | null = null;
          if (videosResponse) {
            const trailers = videosResponse.results.filter(
              (v) => v.type === "Trailer" && v.site === "YouTube"
            );
            const officialTrailer = trailers.find((v) =>
              v.name.toLowerCase().includes("official")
            );
            const trailer = officialTrailer || trailers[0];
            if (trailer) {
              trailerUrl = getTrailerUrl(trailer);
            }
          }

          const transformed = transformTMDBMovie(movieDetails, trailerUrl, lang);
          setMovie(transformed);
        } else {
          setError("Movie not found");
        }
      } catch (err) {
        console.error("Error fetching movie:", err);
        setError(err instanceof Error ? err.message : "Failed to load movie");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchMovie();
  }, [id, source, lang]);


  if (loading) {
    return (
      <main className="container">
        <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>
      </main>
    );
  }

  if (error || !movie) {
    return (
      <main className="container">
        <p>{error || "Not found."}</p>
      </main>
    );
  }

  const { genreText, dateText, synopsisText } = normalizeForRender(movie, lang, t);

  return (
    <div className="Movie-datail-container">
      <div style={{ width: "100%" }}>
        <MovieDetailCard
          title={movie.title}
          poster={movie.poster}
          trailer={movie.trailer}
          genre={genreText}
          DOR={dateText}
          synopsis={synopsisText}
          rating={movie.rating}
          casts={movie.casts}
          length={movie.length}
          studio={movie.studio}
          director={movie.director}
          screenwriter={movie.screenwriter}
        />

        <section className="comment-container">
          <h2 className="reviews-header">Movie Reviews</h2>
          <section className="comment-section">
            <div className="review-form">
              <div className="rating-input-container">
                <label className="rating-label">Your Rating:</label>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      className={`star ${star <= rating ? 'filled' : ''}`}
                      onClick={() => setRating(star)}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                  {rating > 0 && <span className="rating-value">{rating}/5</span>}
                </div>
              </div>
              <textarea
                name="Message"
                placeholder={t("giveUsYourThoughts") || "Write your review..."}
                className="comment-textarea"
                required
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                rows={4}
              />
              <button className="comment-btn" type="button" onClick={handleCommentSubmit} disabled={commentLoading}>
                {commentLoading ? "Submitting..." : t("submit") || "Submit Review"}
              </button>
            </div>
          </section>

          <section className="reviews-list">
            {commentError && (
              <p className="error-message">{commentError}</p>
            )}
            {comments.length === 0 ? (
              <p className="empty-reviews">Be the first one to review this movie!</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="review-card">
                  <div 
                    className="review-header clickable"
                    onClick={() => toggleCommentExpansion(c.id)}
                  >
                    <div className="review-header-top">
                      <div className="review-author-info">
                        <h3 className="review-author"><FaUserLarge /> {c.username || "Guest"}</h3>
                        <span className="review-email">{c.email || ""}</span>
                      </div>
                      <span className={`expand-arrow ${expandedComments.has(c.id) ? 'expanded' : ''}`}>
                        ▼
                      </span>
                    </div>
                    {c.rating && (
                      <div className="review-rating-display">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FaStar
                            key={star}
                            className={star <= c.rating! ? 'filled' : 'empty'}
                          />
                        ))}
                        <span className="rating-text">{c.rating}/5</span>
                      </div>
                    )}
                    <p className="review-timestamp">
                      {new Date(c.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="review-content">
                    <p>{c.text}</p>
                  </div>

                  <div className="review-stats">
                    <span className="stat">
                      💬 {c.replies?.length || 0} {c.replies?.length === 1 ? 'reply' : 'replies'}
                    </span>
                  </div>

                  {expandedComments.has(c.id) && (
                    <div className="review-expanded-content">
                      {/* Display existing replies */}
                      {c.replies && c.replies.length > 0 && (
                        <div className="replies-list">
                          <h4 className="replies-header">Replies ({c.replies.length})</h4>
                          {c.replies.map(reply => (
                            <div key={reply.id} className="reply-item">
                              <div className="reply-header">
                                <span className="reply-author">{reply.author}</span>
                                <span className="reply-timestamp">
                                  {new Date(reply.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <div className="reply-content">{reply.text}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply form */}
                      {replyingToComment === c.id ? (
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
                            <button className="btn-submit" onClick={() => handleSubmitReply(c.id)}>
                              Submit Reply
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="review-actions">
                          <button className="btn-reply" onClick={() => handleReplyClick(c.id)}>
                            Reply
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        </section>
      </div>
      <Alert
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, isOpen: false })}
      />
    </div>
  );
}


export const MovieDetailPage = () => <MDP source={movies} />;
export const UCMoiveDetailPage = () => <MDP source={upcomingMovies} />;

