import React, { useState, useEffect } from 'react';
import { Menu, X, Search, Clock, Home, Film, Bookmark } from 'lucide-react';

interface NavbarProps {
  currentView: 'home' | 'watchlater';
  onViewChange: (view: 'home' | 'watchlater') => void;
  onSearch: (query: string) => void;
  watchLaterCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentView, 
  onViewChange, 
  onSearch,
  watchLaterCount 
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onSearch(searchValue.trim());
    }
  };

  const navLinks = [
    { id: 'home', label: 'Home', icon: Home, view: 'home' as const },
    { id: 'movies', label: 'Movies', icon: Film, view: 'home' as const },
    { id: 'watchlater', label: 'Watch Later', icon: Bookmark, view: 'watchlater' as const },
  ];

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <div className="nav-left">
          <button 
            className="menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <a 
            className="logo" 
            href="#" 
            onClick={(e) => { e.preventDefault(); onViewChange('home'); }}
          >
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <polygon points="5 3 19 12 5 21 5 3" fill="white" />
              </svg>
            </div>
            <span className="logo-text">StreamHub</span>
          </a>
          
          <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            {navLinks.map(link => (
              <button
                key={link.id}
                className={`nav-link ${currentView === link.view ? 'active' : ''}`}
                onClick={() => {
                  onViewChange(link.view);
                  setIsMobileMenuOpen(false);
                }}
              >
                <link.icon size={16} />
                <span>{link.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="nav-right">
          <button 
            className="watch-later-nav-btn"
            onClick={() => onViewChange('watchlater')}
            aria-label="Watch Later"
          >
            <Clock size={20} />
            {watchLaterCount > 0 && (
              <span className="badge-count">{watchLaterCount}</span>
            )}
          </button>
          
          <form className="search-box" onSubmit={handleSearch}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search movies..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </form>
        </div>
      </div>
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </nav>
  );
};
