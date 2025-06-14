import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsAPI } from '../../services/api';
import { unarchiveEvent } from '../../services/archiveService';
import EventCard from '../common/EventCard';
import '../../styles/dashboard.css';
import SuccessMessage from '../common/SuccessMessage';

const ConductorArchive = () => {
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState("");
  
  useEffect(() => {
    fetchArchivedEvents();
  }, []);
  
  const fetchArchivedEvents = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Pobierz zarchiwizowane wydarzenia
      const response = await eventsAPI.getEvents(true); // true = archived
      const events = response.events || [];
      
      // Sortuj od najnowszych
      events.sort((a, b) => new Date(b.date) - new Date(a.date));
      setArchivedEvents(events);
    } catch (error) {
      console.error('Error fetching archived events:', error);
      setError('Nie udało się pobrać archiwum wydarzeń. Spróbuj odświeżyć stronę.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteEvent = async (eventToDelete) => {
    const confirmMessage = `Czy na pewno chcesz USUNĄĆ wydarzenie "${eventToDelete.title}" z archiwum?\n\n⚠️ UWAGA: Ta operacja jest nieodwracalna!\n\nWydarzenie zostanie całkowicie usunięte z systemu.\n\nAby potwierdzić, wpisz: USUŃ`;
    
    const userInput = prompt(confirmMessage);
    
    if (userInput !== 'USUŃ') {
      if (userInput !== null) {
        setError('Usuwanie anulowane. Aby usunąć wydarzenie, musisz wpisać dokładnie: USUŃ');
        setTimeout(() => setError(""), 3500);
      }
      return;
    }
    
    try {
      // Użyj eventsAPI do usunięcia wydarzenia
      // Backend automatycznie usunie powiązane invitations i participations
      await eventsAPI.deleteEvent(eventToDelete._id);
      
      setSuccessMessage('Wydarzenie zostało pomyślnie usunięte z archiwum.');
      setTimeout(() => setSuccessMessage(""), 3500);
      
      // Odśwież listę wydarzeń
      fetchArchivedEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Wystąpił błąd podczas usuwania wydarzenia. Spróbuj ponownie.');
      setTimeout(() => setError(""), 3500);
    }
  };
    
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Archiwum Wydarzeń</h1>
        <Link to="/conductor/dashboard" className="btn-secondary">Powrót do Dashboard</Link>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="dashboard-section">
        <h2>Zarchiwizowane Wydarzenia</h2>
        
        {loading ? (
          <p>Ładowanie archiwum...</p>
        ) : archivedEvents.length > 0 ? (
          <div className="events-grid">
            {archivedEvents.map(event => (
              <div key={event._id} className="archived-event-wrapper">
                <EventCard 
                  event={event} 
                  linkTo={`/conductor/events/${event._id}`}
                  showDeleteButton={true}
                  onDelete={handleDeleteEvent}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-archive">
            <p>Archiwum jest puste. Wydarzenia są automatycznie archiwizowane po zakończeniu.</p>
            <p>💡 <strong>Wskazówka:</strong> Wydarzenia są automatycznie przenoszone do archiwum następnego dnia po ich dacie.</p>
          </div>
        )}
      </div>
      <SuccessMessage message={successMessage} onClose={() => setSuccessMessage("")} />
    </div>
  );
};

export default ConductorArchive;