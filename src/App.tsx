import { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { MovieCard } from '@/components/MovieCard';
import { MovieModal } from '@/components/MovieModal';
import { WatchLaterView } from '@/components/WatchLaterView';
import { ToastContainer } from '@/components/Toast';
import { PageLoader } from '@/components/Loader';
import { ShimmerRow } from '@/components/Shimmer';
import { useMovies } from '@/hooks/useMovies';
import { useWatchLater } from '@/hooks/useWatchLater';
import { useToast } from '@/hooks/useToast';
import { slugify } from '@/utils/slugify';
import type { Movie, WatchLaterItem } from '@/types';
import './App.css';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { movieSlug, searchSlug } = useParams();

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    movies,
    loading,
    error,
    page,
    hasMore,
    provider,
    setProvider,
    loadMovies,
    searchMovies,
    loadMovieDetails,
    changePage
  } = useMovies();

  const {
    watchLater,
    count,
    toggleWatchLater,
    isInWatchLater,
    removeFromWatchLater,
    clearWatchLater
  } = useWatchLater();

  const { toasts, showToast, removeToast } = useToast();

  // Parse search query from URL params
  const searchQuery = useMemo(() => {
    return decodeURIComponent(searchSlug || '').replace(/-/g, ' ').trim();
  }, [searchSlug]);

  // Determine current view based on path
  const currentView = useMemo(() => {
    if (location.pathname.startsWith('/watchlater')) return 'watchlater';
    if (location.pathname.startsWith('/search')) return 'search';
    return 'home';
  }, [location.pathname]);

  const providerName = provider === 'hdhub4u' ? 'HDHub4U' : 'DesireMovies';

  // Load movies or search results based on URL
  useEffect(() => {
    if (location.pathname.startsWith('/search')) {
      if (searchQuery) {
        searchMovies(searchQuery);
      } else {
        loadMovies(1);
      }
    } else if (location.pathname === '/' || location.pathname === '/home' || movieSlug) {
      loadMovies(1);
    }
  }, [location.pathname, searchQuery, movieSlug, searchMovies, loadMovies, provider]);

  // Handle movie Slug change (open modal if slug present)
  useEffect(() => {
    const findAndOpenMovie = async () => {
      if (movieSlug) {
        // Try to find in current movies list
        const movie = movies.find(m => slugify(m.title) === movieSlug);

        if (!movie) {
          // If not in list, we might need a way to fetch by slug or wait for list
          // For now, if we found it in the list, open it
          if (movies.length > 0) {
            // If movies are loaded and we still didn't find it, we might want to show error or just close
          }
          return;
        }

        setSelectedMovie(movie);
        setIsModalOpen(true);

        const details = await loadMovieDetails(movie);
        if (details) {
          setSelectedMovie(details);
        }
      } else {
        setIsModalOpen(false);
        setSelectedMovie(null);
      }
    };

    findAndOpenMovie();
  }, [movieSlug, movies, loadMovieDetails]);

  // Handle movie click
  const handleMovieClick = useCallback((movie: Movie) => {
    navigate(`/movie/${slugify(movie.title)}`, {
      state: { from: location.pathname }
    });
  }, [navigate, location.pathname]);

  // Handle watch later toggle
  const handleToggleWatchLater = useCallback((movie: Movie) => {
    toggleWatchLater(movie);
    const isNowSaved = !isInWatchLater(movie.url);
    showToast(
      isNowSaved ? 'Added to Watch Later' : 'Removed from Watch Later',
      'success'
    );
  }, [toggleWatchLater, isInWatchLater, showToast]);

  // Handle watch later item play
  const handleWatchLaterPlay = useCallback((item: WatchLaterItem) => {
    const movie: Movie = {
      id: `watchlater_${item.url}`,
      title: item.title,
      thumb: item.thumb,
      url: item.url,
      year: item.year,
      rating: item.rating,
      genre: 'Movie',
      desc: '',
      downloads: [],
      source: item.source
    };

    handleMovieClick(movie);
  }, [handleMovieClick]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    if (query.trim()) {
      navigate(`/search/${slugify(query)}`);
    } else {
      navigate('/search');
    }
  }, [navigate]);

  // Handle view change
  const handleViewChange = useCallback((view: 'home' | 'search' | 'watchlater') => {
    if (view === 'watchlater') {
      navigate('/watchlater');
    } else if (view === 'search') {
      navigate('/search');
    } else {
      navigate('/home');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    const fallbackRoute = currentView === 'search' ? '/search' : '/home';
    const fromPath = (location.state as { from?: string } | null)?.from;
    navigate(fromPath || fallbackRoute);
  }, [navigate, location.state, currentView]);

  // Helper for pagination numbers
  const renderPagination = () => {
    if (!hasMore && page === 1) return null;
    if (location.pathname.startsWith('/search')) return null; // No pagination for search

    const maxPagesToShow = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = startPage + maxPagesToShow - 1;

    if (endPage > 100) {
      endPage = 100;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    return (
      <div className="pagination-container">
        <button
          className="page-nav-btn"
          onClick={() => changePage(-1)}
          disabled={page === 1}
        >
          Previous
        </button>

        <div className="page-numbers">
          {Array.from({ length: 5 }, (_, i) => startPage + i).map(p => (
            <button
              key={p}
              className={`page-num-btn ${page === p ? 'active' : ''}`}
              onClick={() => {
                const diff = p - page;
                if (diff !== 0) changePage(diff);
              }}
            >
              {p}
            </button>
          ))}
          <span className="page-dots">...</span>
        </div>

        <button
          className="page-nav-btn"
          onClick={() => changePage(1)}
          disabled={!hasMore}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="app">
      <Navbar
        currentView={currentView}
        onViewChange={handleViewChange}
        onSearch={handleSearch}
        watchLaterCount={count}
      />

      <main className="main-content">
        {currentView !== 'watchlater' ? (
          <div className="home-view">
            <header className="view-header">
              <div className="provider-switch" role="tablist" aria-label="Select movie provider">
                <button
                  className={`provider-btn ${provider === 'hdhub4u' ? 'active' : ''}`}
                  onClick={() => setProvider('hdhub4u')}
                >
                  HDHub4U
                </button>
                <button
                  className={`provider-btn ${provider === 'desiremovies' ? 'active' : ''}`}
                  onClick={() => setProvider('desiremovies')}
                >
                  DesireMovies
                </button>
              </div>
              <h1 className="view-title">
                {location.pathname.startsWith('/search')
                  ? `${providerName} results for "${searchQuery}"`
                  : `${providerName} Movies`}
              </h1>
              <p className="view-subtitle">
                {location.pathname.startsWith('/search')
                  ? `Found ${movies.length} results`
                  : `Browse latest movies from ${providerName}`
                }
              </p>
            </header>

            {loading && !movies.length ? (
              <div className="loading-grid">
                <ShimmerRow count={12} />
              </div>
            ) : error ? (
              <div className="error-container">
                <p>{error}</p>
                <button className="btn btn-primary" onClick={() => loadMovies(1)}>Try Again</button>
              </div>
            ) : (
              <div className="movies-grid-container">
                <div className="movies-grid">
                  {movies.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      isInWatchLater={isInWatchLater(movie.url)}
                      onClick={() => handleMovieClick(movie)}
                      onToggleWatchLater={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleToggleWatchLater(movie);
                      }}
                    />
                  ))}
                </div>
                {renderPagination()}
              </div>
            )}
          </div>
        ) : (
          <WatchLaterView
            items={watchLater}
            onBack={() => handleViewChange('home')}
            onPlay={handleWatchLaterPlay}
            onRemove={(url) => {
              removeFromWatchLater(url);
              showToast('Removed from Watch Later', 'success');
            }}
            onClear={() => {
              clearWatchLater();
              showToast('Watch Later list cleared', 'info');
            }}
          />
        )}
      </main>

      {/* Movie Modal */}
      <MovieModal
        movie={selectedMovie}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onShowToast={showToast}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Full Page Loader */}
      <PageLoader visible={loading && !movies.length && currentView === 'home'} />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppContent />} />
      <Route path="/home" element={<AppContent />} />
      <Route path="/search" element={<AppContent />} />
      <Route path="/search/:searchSlug" element={<AppContent />} />
      <Route path="/watchlater" element={<AppContent />} />
      <Route path="/movie/:movieSlug" element={<AppContent />} />
    </Routes>
  );
}

export default App;
