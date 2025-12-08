import { useState, useEffect } from 'react';
import "../main.css"
import "./home.css"
import "../Component/MovieDetailCard/MovieDetailCard.css"
import NavBar from "../Component/Navbar"
import MinimalNavbar from "../Component/MinimalNavbar"
import {Link, useLocation} from 'react-router-dom';
import { useLang } from "../../i18n/LanguageContext.jsx"; 
import MovRow from "../Component/MovieRow.jsx"
import { tmdb } from '../../api/tmbd';
import type { Movie, Video } from '../../api/tmbd';
import EEAAOT from "../../assets/EEAAO.mp4"
import Alert from "../../components/Alert";

// Get trailer URL from TMDB video key
function getTrailerUrl(trailer: Video): string | null {
  if (!trailer || trailer.site !== "YouTube") return null;
  
  // Return YouTube embed URL for autoplay, mute, and loop
  return `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&loop=1&playlist=${trailer.key}`;
}


// Transform TMDB Movie to match the format expected by MovieRow
interface MovieData {
  id: number;
  title: string;
  poster: string;
  rating: string;
  ratingValue: number; // Store numeric rating for star calculation
  releaseDate: string;
  trailer?: string;
}

function transformMovie(movie: Movie): MovieData {
  return {
    id: movie.id,
    title: movie.title,
    poster: movie.poster_path 
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
      : '',
    rating: movie.vote_average ? `${movie.vote_average.toFixed(1)}/10` : 'N/A',
    ratingValue: movie.vote_average || 0, // Store numeric rating for star calculation
    releaseDate: movie.release_date || '',
  };
}

// Check if a movie is unreleased (release date is in the future)
function isUnreleased(releaseDate: string): boolean {
  if (!releaseDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
  const release = new Date(releaseDate);
  return release > today;
}

function Home(){
  const { t } = useLang();
  const location = useLocation();
  const [trendingMovies, setTrendingMovies] = useState<MovieData[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<MovieData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [alert, setAlert] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  // Check for alert from location state
  useEffect(() => {
    if (location.state?.showAlert) {
      setAlert({
        isOpen: true,
        message: location.state.alertMessage || "Access denied. Admin privileges required.",
        type: location.state.alertType || 'error'
      });
      // Clear the state to prevent showing again on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const [
          trendingResponse, 
          upcomingPage1, 
          upcomingPage2, 
          upcomingPage3
        ] = await Promise.all([
          tmdb.trendingMovies(1),
          tmdb.getUpcomingMovies(1),
          tmdb.getUpcomingMovies(2), 
          tmdb.getUpcomingMovies(3)  
        ]);
       

        // Process trending movies with trailers
        const transformedTrending = await Promise.all(
          trendingResponse.results.map(async (movie) => {
            const transformed = transformMovie(movie);
            
            // Fetch trailer for the movie
            try {
              const videosResponse = await tmdb.getMovieVideos(movie.id);
              if (videosResponse) {
                const trailers = videosResponse.results.filter(
                  (v) => v.type === "Trailer" && v.site === "YouTube"
                );
                const officialTrailer = trailers.find((v) =>
                  v.name.toLowerCase().includes("official")
                );
                const trailer = officialTrailer || trailers[0];
                if (trailer) {
                  const trailerUrl = getTrailerUrl(trailer);
                  if (trailerUrl) {
                    transformed.trailer = trailerUrl;
                  }
                }
              }
            } catch (error) {
              console.error(`Error fetching trailer for movie ${movie.id}:`, error);
            }
            
            return transformed;
          })
        );
        setTrendingMovies(transformedTrending);
        
        // Combine all upcoming movie results into one big array
        const allUpcomingResults = [
          ...upcomingPage1.results,
          ...upcomingPage2.results,
          ...upcomingPage3.results
        ];

        // Process upcoming movies (with the combined list)
        const transformedUpcoming = allUpcomingResults
          .map(transformMovie)
          .filter(movie => isUnreleased(movie.releaseDate));
          
        setUpcomingMovies(transformedUpcoming);


      } catch (error) {
        console.error('Error fetching movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  useEffect(() => {
    if (!trendingMovies.length) return;

    const interval = setInterval(() => {
      setCurrentHeroIndex(prev => (prev + 1) % trendingMovies.length);
    }, 12000);

    return () => clearInterval(interval);
  }, [trendingMovies]);

  const currentHero = trendingMovies[currentHeroIndex];


  return(
    <div className="body">
      <header className="site-header">
        <NavBar/>
      </header>
      
      <MinimalNavbar />

      <main className="container">
        <section className="hero-carousel">
          {currentHero && (
            <Link to={`/movie/${currentHero.id}/${currentHero.title}`}>
            <div className="hero-slide-split">
              {/* Left: Poster */}
            <div className="hero-left">
              <img src={currentHero.poster} className="hero-poster" />
            <div className="hero-info">
              <h2>{currentHero.title}</h2>
              <p>{currentHero.rating}</p>
            </div>
          </div>

          {/* Right: Trailer */}
          <div className="hero-right"> 
             {currentHero.trailer && currentHero.trailer.startsWith("https://www.youtube.com/embed/") ? (
               <iframe
                 className="hero-trailer"
                 src={currentHero.trailer}
                 allow="autoplay; encrypted-media"
                 allowFullScreen
                 frameBorder="0"
                 title={`${currentHero.title} trailer`}
               ></iframe>
             ) : currentHero.trailer ? (
               <video className="hero-trailer" autoPlay loop muted>
                 <source src={currentHero.trailer} type="video/mp4" />
               </video>
             ) : (
               <video className="hero-trailer" autoPlay loop muted>
                 <source src={EEAAOT} type="video/mp4" />
               </video>
             )}      
          </div>

            {/* Arrows */}
          <button className="arrow left" onClick={(e) => { e.preventDefault(); setCurrentHeroIndex((currentHeroIndex - 1 + trendingMovies.length) % trendingMovies.length); }}>
            &#10094;
          </button>
          <button className="arrow right" onClick={(e) => { e.preventDefault(); setCurrentHeroIndex((currentHeroIndex + 1) % trendingMovies.length); }}>
            &#10095;
          </button>
          </div>
          </Link>
        )}
        </section>

      
       <div className="categories">
        
        <MovRow rowslogan={t("discoverRate")} link_addon="" movD={trendingMovies}/>

        <MovRow rowslogan={t("comingSoonSection")} link_addon="coming-soon/" movD={upcomingMovies}/>
      </div>

      </main>
      <Alert
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, isOpen: false })}
      />
    </div>
  );
}

export default Home;

