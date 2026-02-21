import React from 'react';

export const NetflixLoader: React.FC = () => (
  <div className="netflix-loader">
    <div className="netflix-loader-logo">
      <svg viewBox="0 0 24 24" width="40" height="40">
        <polygon points="5 3 19 12 5 21 5 3" fill="white" />
      </svg>
    </div>
    <div className="loader-text">Loading...</div>
  </div>
);

interface PageLoaderProps {
  visible: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ visible }) => {
  if (!visible) return null;
  return <NetflixLoader />;
};
