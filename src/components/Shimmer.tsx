import React from 'react';

export const ShimmerCard: React.FC = () => (
  <div className="video-card-shimmer">
    <div className="shimmer-thumb"></div>
    <div className="shimmer-info">
      <div className="shimmer-avatar"></div>
      <div className="shimmer-text">
        <div className="shimmer-line"></div>
        <div className="shimmer-line short"></div>
      </div>
    </div>
  </div>
);

export const ShimmerHero: React.FC = () => (
  <div className="hero-shimmer">
    <div className="shimmer-bg"></div>
    <div className="shimmer-content">
      <div className="shimmer-badge"></div>
      <div className="shimmer-title"></div>
      <div className="shimmer-desc"></div>
      <div className="shimmer-buttons">
        <div className="shimmer-btn"></div>
        <div className="shimmer-btn outline"></div>
      </div>
    </div>
  </div>
);

export const ShimmerRow: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="shimmer-row">
    {Array.from({ length: count }).map((_, i) => (
      <ShimmerCard key={i} />
    ))}
  </div>
);
