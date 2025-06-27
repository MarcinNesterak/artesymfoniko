import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { storage } from '../../services/api';
import { privateMessagesAPI } from '../../services/messagesAPI';
import '../../styles/navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = storage.getUser();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Zamknij menu mobilne przy zmianie ścieżki
    setMobileMenuOpen(false);
  }, [location]);
  
  const fetchUnread = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      // Używamy wydajniejszego endpointu
      const count = await privateMessagesAPI.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to fetch unread messages count:", error);
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchUnread();
    // Zachowujemy odpytywanie co 30 sekund
    const interval = setInterval(fetchUnread, 30000); 

    // Dodajemy nasłuchiwanie na sygnał do natychmiastowego odświeżenia
    window.addEventListener('unreadCountUpdated', fetchUnread);

    return () => {
      clearInterval(interval);
      window.removeEventListener('unreadCountUpdated', fetchUnread);
    };
  }, [user, fetchUnread]);
  
  const handleLogout = () => {
    storage.removeUser();
    navigate('/login');
  };
  
  // Don't show navbar on login page
  if (!user || location.pathname === '/login') {
    return null;
  }
  
  const messagesLink = (
    <Link to={user.role === 'conductor' ? "/conductor/messages" : "/musician/messages"} className="navbar-item messages-link">
      Wiadomości
      {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
    </Link>
  );

  const conductorLinks = (
            <>
              <Link to="/conductor/dashboard" className="navbar-item">Dashboard</Link>
              <Link to="/conductor/create-event" className="navbar-item">Utwórz Wydarzenie</Link>
              <Link to="/conductor/musicians" className="navbar-item">Muzycy</Link>
              <Link to="/conductor/contracts" className="navbar-item">Umowy</Link>
              {messagesLink}
              <Link to="/conductor/archive" className="navbar-item">Archiwum</Link>
            </>
  );

  const musicianLinks = (
            <>
              <Link to="/musician/dashboard" className="navbar-item">Moje Wydarzenia</Link>
              {messagesLink}
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