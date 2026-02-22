import React from 'react';
import { Play, Plus, Info, Star, Check } from 'lucide-react';
import type { Movie } from '@/types';

interface HeroProps {
  movie: Movie | null;
  isInWatchLater: boolean;
  onWatchNow: () => void;
  onToggleWatchLater: () => void;
  onMoreInfo: () => void;
}

export const Hero: React.FC<HeroProps> = ({ 
  movie, 
  isInWatchLater,
  onWatchNow, 
  onToggleWatchLater,
  onMoreInfo
}) => {
  if (!movie) return null;

  const sourceName = movie.source === 'hdhub4u' ? 'HDHub4U' : 'DesireMovies';

  return (
    <div className="hero">
      <div className="hero-bg">
        <img 
          src={movie.thumb} 
          alt={movie.title}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1920x1080?text=No+Image';
          }}
        />
        <div className="hero-gradient"></div>
      </div>
      
      <div className="hero-content">
        <div className="hero-inner">
          <div className="hero-badges">
            <span className="badge">{sourceName}</span>
            {movie.downloads[0]?.quality && (
              <span className="badge quality">{movie.downloads[0].quality}</span>
            )}
          </div>
          
          <h1 className="hero-title">{movie.title}</h1>
          
          <div className="hero-meta">
            <span className="hero-year">{movie.year}</span>
            <span className="hero-rating">
              <Star size={14} fill="currentColor" />
              {movie.rating}
            </span>
            <span className="hero-genre">{movie.genre}</span>
          </div>
          
          <p className="hero-desc">
            {movie.desc || 'Watch the latest HD movies online. Stream or download your favorite movies in high quality.'}
          </p>
          
          <div className="hero-buttons">
            <button className="btn btn-white" onClick={onWatchNow}>
              <Play size={20} fill="black" />
              Watch Now
            </button>
            <button 
              className={`btn btn-outline ${isInWatchLater ? 'saved' : ''}`}
              onClick={onToggleWatchLater}
            >
              {isInWatchLater ? (
                <>
                  <Check size={20} />
                  In List
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Watch Later
                </>
              )}
            </button>
            <button className="btn btn-outline info" onClick={onMoreInfo}>
              <Info size={20} />
              More Info
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
