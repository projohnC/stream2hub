import React from 'react';
import { Play, Clock, Check } from 'lucide-react';
import type { Movie } from '@/types';

interface MovieCardProps {
  movie: Movie;
  isInWatchLater: boolean;
  onClick: () => void;
  onToggleWatchLater: (e: React.MouseEvent) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ 
  movie, 
  isInWatchLater, 
  onClick, 
  onToggleWatchLater 
}) => {
  const sourceBadge = 'DM';

  return (
    <div className="video-card" onClick={onClick}>
      <div className="video-thumb">
        <img 
          src={movie.thumb} 
          alt={movie.title}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x450?text=No+Image';
          }}
        />
        <div className="play-btn">
          <Play size={24} fill="white" />
        </div>
        <div className="quality-badge">
          {movie.downloads[0]?.quality || 'HD'}
        </div>
      </div>
      
      <button 
        className={`watch-later-overlay-btn ${isInWatchLater ? 'saved' : ''}`}
        onClick={onToggleWatchLater}
        title={isInWatchLater ? 'Remove from Watch Later' : 'Add to Watch Later'}
      >
        {isInWatchLater ? (
          <Check size={16} />
        ) : (
          <Clock size={16} />
        )}
      </button>
      
      <div className="video-info">
        <div className="channel-avatar">
          {sourceBadge}
        </div>
        <div className="video-details">
          <h3 className="video-title" title={movie.title}>
            {movie.title}
          </h3>
          <p className="video-meta">
            {movie.year} • {movie.rating}
          </p>
        </div>
      </div>
    </div>
  );
};
