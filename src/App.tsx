import { useEffect, useCallback, useMemo, type MouseEvent } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { MovieCard } from '@/components/MovieCard';
import { WatchLaterView } from '@/components/WatchLaterView';
import { ToastContainer } from '@/components/Toast';
import { PageLoader } from '@/components/Loader';
import { ShimmerRow } from '@/components/Shimmer';
import { MoviePage } from '@/components/MoviePage';
import { useMovies } from '@/hooks/useMovies';
import { useWatchLater } from '@/hooks/useWatchLater';
import { useToast } from '@/hooks/useToast';
import { slugify } from '@/utils/slugify';
import type { Movie, WatchLaterItem } from '@/types';
import './App.css';

function HomeContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchSlug } = useParams();

  const {
    movies,
    loading,
    error,
    page,
    hasMore,
    loadMovies,
    searchMovies,
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

  const searchQuery = useMemo(() => {
    return decodeURIComponent(searchSlug || '').replace(/-/g, ' ').trim();
  }, [searchSlug]);

  const currentView = useMemo(() => {
    if (location.pathname.startsWith('/watchlater')) return 'watchlater';
    if (location.pathname.startsWith('/search')) return 'search';
    return 'home';
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith('/search')) {
      if (searchQuery) searchMovies(searchQuery);
      else loadMovies(1);
    } else {
      loadMovies(1);
    }
  }, [location.pathname, searchQuery, searchMovies, loadMovies]);

  const handleMovieClick = useCallback((movie: Movie) => {
    navigate(`/movie/${slugify(movie.title)}`, {
      state: { movie, from: location.pathname }
    });
  }, [navigate, location.pathname]);

  const handleToggleWatchLater = useCallback((movie: Movie) => {
    toggleWatchLater(movie);
    const isNowSaved = !isInWatchLater(movie.url);
    showToast(isNowSaved ? 'Added to Watch Later' : 'Removed from Watch Later', 'success');
  }, [toggleWatchLater, isInWatchLater, showToast]);

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

  const handleSearch = useCallback((query: string) => {
    navigate(query.trim() ? `/search/${slugify(query)}` : '/search');
  }, [navigate]);

  const handleViewChange = useCallback((view: 'home' | 'search' | 'watchlater') => {
    if (view === 'watchlater') navigate('/watchlater');
    else if (view === 'search') navigate('/search');
    else navigate('/home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate]);

  const renderPagination = () => {
    if (!hasMore && page === 1) return null;
    if (location.pathname.startsWith('/search')) return null;

    const maxPagesToShow = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = startPage + maxPagesToShow - 1;

    if (endPage > 100) {
      endPage = 100;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    return (
      <div className="pagination-container">
        <button className="page-nav-btn" onClick={() => changePage(-1)} disabled={page === 1}>Previous</button>
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
        <button className="page-nav-btn" onClick={() => changePage(1)} disabled={!hasMore}>Next</button>
      </div>
    );
  };

  return (
    <div className="app">
      <Navbar currentView={currentView} onViewChange={handleViewChange} onSearch={handleSearch} watchLaterCount={count} />
      <main className="main-content">
        {currentView !== 'watchlater' ? (
          <div className="home-view">
            <header className="view-header">
              <h1 className="view-title">
                {location.pathname.startsWith('/search')
                  ? `DesireMovies results for "${searchQuery}"`
                  : 'DesireMovies Movies'}
              </h1>
              <p className="view-subtitle">
                {location.pathname.startsWith('/search')
                  ? `Found ${movies.length} results`
                  : 'Browse latest movies from DesireMovies'}
              </p>
            </header>

            {loading && !movies.length ? (
              <div className="loading-grid"><ShimmerRow count={12} /></div>
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
                      onToggleWatchLater={(e: MouseEvent) => {
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
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <PageLoader visible={loading && !movies.length && currentView === 'home'} />
    </div>
  );
}

function MovieRouteContent() {
  const { toasts, showToast, removeToast } = useToast();

  return (
    <>
      <MoviePage onShowToast={showToast} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeContent />} />
      <Route path="/home" element={<HomeContent />} />
      <Route path="/search" element={<HomeContent />} />
      <Route path="/search/:searchSlug" element={<HomeContent />} />
      <Route path="/watchlater" element={<HomeContent />} />
      <Route path="/movie/:movieSlug" element={<MovieRouteContent />} />
    </Routes>
  );
}

export default App;
