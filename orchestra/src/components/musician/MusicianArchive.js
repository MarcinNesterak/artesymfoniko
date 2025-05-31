import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsAPI } from '../../services/api';
import EventCard from '../common/EventCard';
import '../../styles/dashboard.css';

const MusicianArchive = () => {
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  
  useEffect(() => {
    const fetchArchivedEvents = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Pobierz zarchiwizowane wydarzenia muzyka
        // Backend automatycznie filtruje wydarzenia dla zalogowanego muzyka
        const response = await eventsAPI.getEvents(true); // true = archived
        const events = response.events || [];
        
        // Sortuj od najnowszych
        participatedEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setArchivedEvents(events);
      } catch (error) {
        console.error('Error fetching archived events:', error);
        setError('Nie udało się pobrać archiwum wydarzeń. Spróbuj odświeżyć stronę.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchArchivedEvents();
  }, [user.id]);
  
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Archiwum Moich Występów</h1>
        <Link to="/musician/dashboard" className="btn-secondary">Powrót do Dashboard</Link>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="dashboard-section">
        <h2>Zakończone Wydarzenia</h2>
        
        {loading ? (
          <p>Ładowanie archiwum...</p>
        ) : archivedEvents.length > 0 ? (
          <div className="events-grid">
            {archivedEvents.map(event => (
              <EventCard 
                key={event._id} 
                event={event} 
                linkTo={`/musician/events/${event._id}/details`}
              />
            ))}
          </div>
        ) : (
          <div className="empty-archive">
            <p>Nie masz jeszcze żadnych zakończonych występów w archiwum.</p>
            <p>💡 <strong>Wskazówka:</strong> Wydarzenia w których brałeś udział są automatycznie archiwizowane po ich zakończeniu.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicianArchive;