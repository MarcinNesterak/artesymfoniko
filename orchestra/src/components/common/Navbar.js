import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { storage } from '../../services/api';
import '../../styles/navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = storage.getUser();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Zamknij menu mobilne przy zmianie ścieżki
    setMobileMenuOpen(false);
  }, [location]);
  
  const handleLogout = () => {
    storage.removeUser();
    navigate('/login');
  };
  
  // Don't show navbar on login page
  if (!user || location.pathname === '/login') {
    return null;
  }
  
  const conductorLinks = (
            <>
              <Link to="/conductor/dashboard" className="navbar-item">Dashboard</Link>
              <Link to="/conductor/create-event" className="navbar-item">Utwórz Wydarzenie</Link>
              <Link to="/conductor/musicians" className="navbar-item">Muzycy</Link>
              <Link to="/conductor/contracts" className="navbar-item">Umowy</Link>
              <Link to="/conductor/messages" className="navbar-item">Wiadomości</Link>
              <Link to="/conductor/archive" className="navbar-item">Archiwum</Link>
            </>
  );

  const musicianLinks = (
            <>
              <Link to="/musician/dashboard" className="navbar-item">Moje Wydarzenia</Link>
              <Link to="/musician/messages" className="navbar-item">Wiadomości</Link>
              <Link to="/musician/archive" className="navbar-item">Archiwum</Link>
              <Link to="/musician/profile" className="navbar-item">Moje Dane</Link>
            </>
  );

  const navLinks = user.role === 'conductor' ? conductorLinks : musicianLinks;
  
  return (
    <nav className={`navbar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="container navbar-container">
        <Link to={user.role === 'conductor' ? '/conductor/dashboard' : '/musician/dashboard'} className="navbar-brand">
          Artesymfoniko
        </Link>
        
        {/* Desktop Menu */}
        <div className="navbar-menu">
          {navLinks}
        </div>
        
        <div className="navbar-user">
          <span className="navbar-username">{user.name}</span>
          <button onClick={handleLogout} className="navbar-logout">Wyloguj</button>
        </div>

        {/* Mobile Burger Button */}
        <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}>
          <div className="burger-line"></div>
          <div className="burger-line"></div>
          <div className="burger-line"></div>
        </button>
      </div>

      {/* Mobile Menu Panel */}
      <div className="mobile-menu">
        <div className="mobile-menu-links">
          {navLinks}
        </div>
        <div className="mobile-menu-footer">
          <span className="navbar-username">{user.name}</span>
          <button onClick={handleLogout} className="navbar-logout">Wyloguj</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;