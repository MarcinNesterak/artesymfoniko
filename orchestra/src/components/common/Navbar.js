import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { storage } from '../../services/api';
import '../../styles/navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = storage.getUser();
  
  const handleLogout = () => {
    storage.removeUser();
    navigate('/login');
  };
  
  // Don't show navbar on login page
  if (!user || location.pathname === '/login') {
    return null;
  }
  
  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to={user.role === 'conductor' ? '/conductor/dashboard' : '/musician/dashboard'} className="navbar-brand">
          Artesymfoniko
        </Link>
        
        <div className="navbar-menu">
          {user.role === 'conductor' ? (
            <>
              <Link to="/conductor/dashboard" className="navbar-item">Dashboard</Link>
              <Link to="/conductor/create-event" className="navbar-item">Utwórz Wydarzenie</Link>
              <Link to="/conductor/musicians" className="navbar-item">Muzycy</Link>
              <Link to="/conductor/archive" className="navbar-item">Archiwum</Link>
            </>
          ) : (
            <>
              <Link to="/musician/dashboard" className="navbar-item">Moje Wydarzenia</Link>
              <Link to="/musician/archive" className="navbar-item">Archiwum</Link>
              <Link to="/musician/profile" className="navbar-item">Moje Dane</Link>
            </>
          )}
        </div>
        
        <div className="navbar-user">
          <span className="navbar-username">{user.name}</span>
          <button onClick={handleLogout} className="navbar-logout">Wyloguj</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;