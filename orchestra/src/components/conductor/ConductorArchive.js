import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsAPI } from '../../services/api';
import { unarchiveEvent } from '../../services/archiveService';
import EventCard from '../common/EventCard';
import '../../styles/dashboard.css';

const ConductorArchive = () => {
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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
        alert('Usuwanie anulowane. Aby usunąć wydarzenie, musisz wpisać dokładnie: USUŃ');
      }
      return;
    }
    
    try {
      // Użyj eventsAPI do usunięcia wydarzenia
      // Backend automatycznie usunie powiązane invitations i participations
      await eventsAPI.deleteEvent(eventToDelete._id);
      
      alert('Wydarzenie zostało pomyślnie usunięte z archiwum.');
      
      // Odśwież listę wydarzeń
      fetchArchivedEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Wystąpił błąd podczas usywania wydarzenia. Spróbuj ponownie.');
    }
  };
  
  const handleUnarchiveEvent = async (eventToUnarchive) => {
    const confirmMessage = `Czy na pewno chcesz przywrócić wydarzenie "${eventToUnarchive.title}" z archiwum?\n\nWydarzenie zostanie przeniesione z powrotem do aktywnych wydarzeń.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      await unarchiveEvent(eventToUnarchive._id);
      
      alert('Wydarzenie zostało przywrócone z archiwum.');
      
      // Odśwież listę wydarzeń
      fetchArchivedEvents();
    } catch (error) {
      console.error('Error unarchiving event:', error);
      alert('Wystąpił błąd podczas przywracania wydarzenia. Spróbuj ponownie.');
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
                <div className="archived-event-actions">
                  <button 
                    onClick={() => handleUnarchiveEvent(event)}
                    className="btn-unarchive"
                    title="Przywróć z archiwum"
                  >
                    ↩️ Przywróć
                  </button>
                </div>
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
    </div>
  );
};

export default ConductorArchive;