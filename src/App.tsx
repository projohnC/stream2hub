import { useState, useEffect, useCallback } from 'react';
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
import type { Movie, WatchLaterItem } from '@/types';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState<'home' | 'watchlater'>('home');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    movies,
    loading,
    error,
    page,
    hasMore,
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

  // Load movies on mount
  useEffect(() => {
    loadMovies(1);
  }, [loadMovies]);

  // Handle movie click
  const handleMovieClick = useCallback(async (movie: Movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);

    // Load fresh details
    const details = await loadMovieDetails(movie);
    if (details) {
      setSelectedMovie(details);
    }
  }, [loadMovieDetails]);

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
  const handleWatchLaterPlay = useCallback(async (item: WatchLaterItem) => {
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
    searchMovies(query);
    showToast(`Searching for "${query}"...`, 'info');
  }, [searchMovies, showToast]);

  // Handle view change
  const handleViewChange = useCallback((view: 'home' | 'watchlater') => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedMovie(null);
  }, []);

  // Helper for pagination numbers
  const renderPagination = () => {
    if (!hasMore && page === 1) return null;

    const maxPagesToShow = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = startPage + maxPagesToShow - 1;

    if (endPage > 100) { // Arbitrary high limit for UI
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
        {currentView === 'home' ? (
          <div className="home-view">
            <header className="view-header">
              <h1 className="view-title">HDHub4U Movies</h1>
              <p className="view-subtitle">Browse through the latest high-quality movies</p>
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
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Full Page Loader */}
      <PageLoader visible={loading && !movies.length && currentView === 'home'} />
    </div>
  );
}

export default App;
