import React, { useState, useEffect } from 'react';
import { eventsAPI } from '../../services/api';
import EventCard from '../common/EventCard';
import '../../styles/dashboard.css';

const MusicianDashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchEvents();
  }, []);
  
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Pobierz wydarzenia muzyka (backend automatycznie filtruje)
      const response = await eventsAPI.getEvents(false);
      setEvents(response.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Nie udało się pobrać danych. Spróbuj odświeżyć stronę.');
    } finally {
      setLoading(false);
    }
  };
  
  // Filtruj nadchodzące wydarzenia
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate > new Date() && !event.archived;
  });
  
  return (
    <div className="dashboard">
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <p>Ładowanie danych...</p>
      ) : (
        <>
          <div className="dashboard-section">
            <h2>Nadchodzące wydarzenia</h2>
            
            {upcomingEvents.length > 0 ? (
              <div className="events-grid">
                {upcomingEvents.map(event => (
                  <EventCard 
                    key={event._id} 
                    event={event} 
                    linkTo={`/musician/events/${event._id}/details`} 
                  />
                ))}
              </div>
            ) : (
              <p>Nie masz nadchodzących wydarzeń.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MusicianDashboard;