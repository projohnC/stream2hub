import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Flame, Film, Package, Star, Gem } from 'lucide-react';
import { MovieCard } from './MovieCard';
import type { Movie } from '@/types';

interface CategorySectionProps {
  id: string;
  title: string;
  icon: 'trending' | 'hdhub' | 'kmmovies' | 'latest' | 'quality';
  movies: Movie[];
  isInWatchLater: (url: string) => boolean;
  onMovieClick: (movie: Movie) => void;
  onToggleWatchLater: (movie: Movie) => void;
}

const iconMap = {
  trending: Flame,
  hdhub: Film,
  kmmovies: Package,
  latest: Star,
  quality: Gem
};

export const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  icon,
  movies,
  isInWatchLater,
  onMovieClick,
  onToggleWatchLater
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const Icon = iconMap[icon];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (movies.length === 0) return null;

  return (
    <section className="category-section">
      <div className="category-header">
        <h2 className="category-title">
          <Icon size={24} />
          {title}
        </h2>
        <div className="category-nav">
          <button 
            className="nav-arrow"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            className="nav-arrow"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
      
      <div className="category-row" ref={scrollRef}>
        {movies.map(movie => (
          <div key={movie.id} className="category-item">
            <MovieCard
              movie={movie}
              isInWatchLater={isInWatchLater(movie.url)}
              onClick={() => onMovieClick(movie)}
              onToggleWatchLater={(e) => {
                e.stopPropagation();
                onToggleWatchLater(movie);
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
