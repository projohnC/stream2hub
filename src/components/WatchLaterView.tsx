import React from 'react';
import { Clock, Trash2, Play, ArrowLeft } from 'lucide-react';
import type { WatchLaterItem } from '@/types';

interface WatchLaterViewProps {
  items: WatchLaterItem[];
  onBack: () => void;
  onPlay: (item: WatchLaterItem) => void;
  onRemove: (url: string) => void;
  onClear: () => void;
}

export const WatchLaterView: React.FC<WatchLaterViewProps> = ({
  items,
  onBack,
  onPlay,
  onRemove,
  onClear
}) => {
  if (items.length === 0) {
    return (
      <div className="watch-later-view">
        <div className="back-btn-container">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </button>
        </div>

        <div className="watch-later-header">
          <h1>Watch Later</h1>
        </div>

        <div className="empty-state">
          <div className="empty-icon">
            <Clock size={64} />
          </div>
          <h2>Your Watch Later list is empty</h2>
          <p>Movies you save will appear here</p>
          <button className="btn btn-primary" onClick={onBack}>
            Browse Movies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="watch-later-view">
      <div className="back-btn-container">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="watch-later-header">
        <h1>Watch Later</h1>
        <span className="item-count">{items.length} {items.length === 1 ? 'movie' : 'movies'}</span>
      </div>

      <div className="watch-later-actions">
        <button className="btn btn-outline btn-small" onClick={onClear}>
          <Trash2 size={16} />
          Clear All
        </button>
      </div>

      <div className="watch-later-grid">
        {items.map(item => (
          <div
            key={item.url}
            className="watch-later-card"
            onClick={() => onPlay(item)}
          >
            <div className="watch-later-thumb">
              <img
                src={item.thumb}
                alt={item.title}
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x450?text=No+Image';
                }}
              />
              <div className="play-overlay">
                <Play size={32} fill="white" />
              </div>
              <div className="source-badge">
                {item.source === 'hdhub4u' ? 'HD' : 'KM'}
              </div>
            </div>

            <div className="watch-later-info">
              <h3 className="watch-later-title" title={item.title}>
                {item.title}
              </h3>
              <p className="watch-later-meta">
                {item.year} • {item.rating}
              </p>
            </div>

            <button
              className="remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.url);
              }}
              title="Remove from Watch Later"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
