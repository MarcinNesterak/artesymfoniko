import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsAPI, usersAPI } from '../../services/api';
import '../../styles/eventDetails.css';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [allMusicians, setAllMusicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchEventData();
  }, [id]);
  
  const fetchEventData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Pobierz szczegóły wydarzenia (zawiera invitations i participations)
      const eventResponse = await eventsAPI.getEvent(id);
      setEvent(eventResponse.event);
      setInvitations(eventResponse.invitations || []);
      setParticipations(eventResponse.participations || []);
      
      // Pobierz wszystkich muzyków dla selecta
      const musiciansResponse = await usersAPI.getMusicians();
      setAllMusicians(musiciansResponse.musicians || []);
    } catch (error) {
      console.error('Error fetching event data:', error);
      setError('Wystąpił błąd podczas pobierania danych. Spróbuj odświeżyć stronę.');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('pl-PL', options);
  };
  
  const handleDeleteEvent = async () => {
    const confirmMessage = `Czy na pewno chcesz USUNĄĆ wydarzenie "${event.title}"?\n\n⚠️ UWAGA: Ta operacja jest nieodwracalna!\n\nWydarzenie zostanie całkowicie usunięte z systemu i zniknie dla wszystkich muzyków.\n\nAby potwierdzić, wpisz: USUŃ`;
    
    const userInput = prompt(confirmMessage);
    
    if (userInput !== 'USUŃ') {
      if (userInput !== null) {
        alert('Usuwanie anulowane. Aby usunąć wydarzenie, musisz wpisać dokładnie: USUŃ');
      }
      return;
    }
    
    try {
      setLoading(true);
      
      await eventsAPI.deleteEvent(id);
      
      alert('Wydarzenie zostało pomyślnie usunięte.');
      navigate('/conductor/dashboard');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Wystąpił błąd podczas usuwania wydarzenia. Spróbuj ponownie.');
      setLoading(false);
    }
  };
  
  const sendInvitation = async (musicianId) => {
    try {
      // Sprawdź czy muzyk już został zaproszony
      const alreadyInvited = invitations.some(inv => inv.userId._id === musicianId);
      if (alreadyInvited) {
        alert('Ten muzyk już został zaproszony.');
        return;
      }
      
      await eventsAPI.inviteMusicians(id, [musicianId]);
      alert('Zaproszenie zostało wysłane.');
      
      // Odśwież dane wydarzenia
      fetchEventData();
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Wystąpił błąd podczas wysyłania zaproszenia.');
    }
  };
  
  const getParticipationStatus = (userId) => {
    // Sprawdź czy muzyk odpowiedział na zaproszenie
    const participation = participations.find(p => p.userId._id === userId);
    if (participation) {
      return participation.status === 'confirmed' ? 'Zaakceptowano' : 'Odrzucono';
    }
    
    // Sprawdź czy muzyk został zaproszony
    const invitation = invitations.find(inv => inv.userId._id === userId);
    if (invitation) {
      return 'Oczekująca';
    }
    
    return null;
  };
  
  if (loading) {
    return <div className="loading">Ładowanie szczegółów wydarzenia...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  if (!event) {
    return <div className="error-message">Nie znaleziono wydarzenia.</div>;
  }
  
  const invitedMusicianIds = invitations.map(inv => inv.userId._id);
  const availableMusicians = allMusicians.filter(m => !invitedMusicianIds.includes(m._id));
  
  return (
    <div className="event-details">
      <div className="event-details-header">
        <h1>{event.title}</h1>
        <div className="event-actions">
          <button onClick={() => navigate('/conductor/dashboard')} className="btn-back">
            Powrót do listy
          </button>
          <button 
            onClick={handleDeleteEvent} 
            className="btn-delete"
            disabled={loading}
            title="Usuń wydarzenie (nieodwracalne)"
          >
            Usuń Wydarzenie
          </button>
        </div>
      </div>
      
      <div className="event-details-content">
        <div className="event-info-section">
          <div className="event-info-card">
            <h2>Informacje o wydarzeniu</h2>
            
            <div className="info-item">
              <strong>Data i godzina:</strong>
              <span>{formatDate(event.date)}</span>
            </div>
            
            {event.description && (
              <div className="info-item">
                <strong>Opis:</strong>
                <p>{event.description}</p>
              </div>
            )}
            
            {event.schedule && (
              <div className="info-item">
                <strong>Harmonogram:</strong>
                <pre>{event.schedule}</pre>
              </div>
            )}
            
            {event.program && (
              <div className="info-item">
                <strong>Program:</strong>
                <pre>{event.program}</pre>
              </div>
            )}
          </div>
        </div>
        
        <div className="event-musicians-section">
          <div className="musicians-card">
            <h2>Zaproszeni muzycy</h2>
            
            {invitations.length > 0 ? (
              <div className="musicians-list">
                {invitations.map(invitation => {
                  const musician = invitation.userId;
                  if (!musician) return null;
                  
                  const status = getParticipationStatus(musician._id);
                  let statusClass = 'status-pending';
                  
                  if (status === 'Zaakceptowano') {
                    statusClass = 'status-confirmed';
                  } else if (status === 'Odrzucono') {
                    statusClass = 'status-declined';
                  }
                  
                  return (
                    <div key={invitation._id} className="musician-item">
                      <div className="musician-info">
                        <div className="musician-name">{musician.name}</div>
                        <div className="musician-instrument">{musician.instrument || 'Instrument nieznany'}</div>
                      </div>
                      <div className={`invitation-status ${statusClass}`}>
                        {status}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>Nie zaproszono jeszcze żadnych muzyków.</p>
            )}
            
            {availableMusicians.length > 0 && (
              <div className="add-musicians-section">
                <h3>Zaproś więcej muzyków</h3>
                <select 
                  onChange={(e) => {
                    if (e.target.value) {
                      sendInvitation(e.target.value);
                      e.target.value = ''; // Reset select
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Wybierz muzyka</option>
                  {availableMusicians.map(musician => (
                    <option key={musician._id} value={musician._id}>
                      {musician.name} ({musician.instrument || 'Instrument nieznany'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;