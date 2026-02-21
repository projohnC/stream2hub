import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { CategorySection } from '@/components/CategorySection';
import { MovieModal } from '@/components/MovieModal';
import { WatchLaterView } from '@/components/WatchLaterView';
import { ToastContainer } from '@/components/Toast';
import { PageLoader } from '@/components/Loader';
import { ShimmerHero, ShimmerRow } from '@/components/Shimmer';
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
    page, 
    hasMore, 
    loadMovies, 
    searchMovies, 
    loadMovieDetails,
    resolveKMLink,
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

  // Featured movie for hero (first trending movie)
  const featuredMovie = movies.trending[0] || null;

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
            {/* Hero Section */}
            {loading && !movies.hdhub4u.length ? (
              <ShimmerHero />
            ) : featuredMovie ? (
              <Hero 
                movie={featuredMovie}
                isInWatchLater={isInWatchLater(featuredMovie.url)}
                onWatchNow={() => handleMovieClick(featuredMovie)}
                onToggleWatchLater={() => handleToggleWatchLater(featuredMovie)}
                onMoreInfo={() => handleMovieClick(featuredMovie)}
              />
            ) : null}
            
            {/* Category Sections */}
            <div className="categories-container">
              {loading && !movies.hdhub4u.length ? (
                <>
                  <div className="section-title-shimmer"></div>
                  <ShimmerRow count={6} />
                  <div className="section-title-shimmer"></div>
                  <ShimmerRow count={6} />
                </>
              ) : (
                <>
                  <CategorySection
                    id="trending"
                    title="🔥 Trending Now"
                    icon="trending"
                    movies={movies.trending}
                    isInWatchLater={isInWatchLater}
                    onMovieClick={handleMovieClick}
                    onToggleWatchLater={handleToggleWatchLater}
                  />
                  
                  <CategorySection
                    id="hdhub"
                    title="🎬 HDHub4U Movies"
                    icon="hdhub"
                    movies={movies.hdhub4u}
                    isInWatchLater={isInWatchLater}
                    onMovieClick={handleMovieClick}
                    onToggleWatchLater={handleToggleWatchLater}
                  />
                  
                  <CategorySection
                    id="kmmovies"
                    title="📦 KMMovies"
                    icon="kmmovies"
                    movies={movies.kmmovies}
                    isInWatchLater={isInWatchLater}
                    onMovieClick={handleMovieClick}
                    onToggleWatchLater={handleToggleWatchLater}
                  />
                  
                  <CategorySection
                    id="latest"
                    title="⭐ Latest Added"
                    icon="latest"
                    movies={movies.latest}
                    isInWatchLater={isInWatchLater}
                    onMovieClick={handleMovieClick}
                    onToggleWatchLater={handleToggleWatchLater}
                  />
                  
                  <CategorySection
                    id="quality"
                    title="💎 1080p Collection"
                    icon="quality"
                    movies={movies.highQuality}
                    isInWatchLater={isInWatchLater}
                    onMovieClick={handleMovieClick}
                    onToggleWatchLater={handleToggleWatchLater}
                  />
                </>
              )}
            </div>
            
            {/* Pagination */}
            {!loading && hasMore && (
              <div className="pagination">
                <button 
                  className="page-btn"
                  onClick={() => changePage(-1)}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="page-info">Page {page}</span>
                <button 
                  className="page-btn"
                  onClick={() => changePage(1)}
                >
                  Next
                </button>
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
        onResolveMagicLink={resolveKMLink}
      />
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Full Page Loader */}
      <PageLoader visible={loading && !movies.hdhub4u.length && currentView === 'home'} />
    </div>
  );
}

export default App;
