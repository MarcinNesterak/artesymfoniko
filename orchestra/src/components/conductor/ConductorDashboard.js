import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsAPI } from '../../services/api';
import EventCard from '../common/EventCard';
import '../../styles/dashboard.css';

const ConductorDashboard = () => {
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
      
      // Pobierz nieznarchiwizowane wydarzenia
      const response = await eventsAPI.getEvents(false);
      setEvents(response.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Nie udało się pobrać listy wydarzeń. Spróbuj odświeżyć stronę.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteEvent = async (eventToDelete) => {
    const confirmMessage = `Czy na pewno chcesz USUNĄĆ wydarzenie "${eventToDelete.title}"?\n\n⚠️ UWAGA: Ta operacja jest nieodwracalna!\n\nWydarzenie zostanie całkowicie usunięte z systemu i zniknie dla wszystkich muzyków.\n\nAby potwierdzić, wpisz: USUŃ`;
    
    const userInput = prompt(confirmMessage);
    
    if (userInput !== 'USUŃ') {
      if (userInput !== null) {
        alert('Usuwanie anulowane. Aby usunąć wydarzenie, musisz wpisać dokładnie: USUŃ');
      }
      return;
    }
    
    try {
      await eventsAPI.deleteEvent(eventToDelete._id);
      alert('Wydarzenie zostało pomyślnie usunięte.');
      
      // Odśwież listę wydarzeń
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Wystąpił błąd podczas usuwania wydarzenia. Spróbuj ponownie.');
    }
  };
  
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Panel Dyrygenta</h1>
        <div className="dashboard-actions">
          <Link to="/conductor/archive" className="btn-secondary">Archiwum</Link>
          <Link to="/conductor/create-event" className="btn-primary">Utwórz nowe wydarzenie</Link>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="dashboard-section">
        <h2>Aktualne Wydarzenia</h2>
        
        {loading ? (
          <p>Ładowanie wydarzeń...</p>
        ) : events.length > 0 ? (
          <div className="events-grid">
            {events.map(event => (
              <EventCard 
                key={event._id} 
                event={event} 
                linkTo={`/conductor/events/${event._id}`}
                showDeleteButton={true}
                onDelete={handleDeleteEvent}
              />
            ))}
          </div>
        ) : (
          <p>Nie masz aktualnych wydarzeń. Utwórz swoje pierwsze wydarzenie!</p>
        )}
      </div>
    </div>
  );
};

export default ConductorDashboard;