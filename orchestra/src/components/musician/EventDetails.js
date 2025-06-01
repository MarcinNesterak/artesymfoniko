import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsAPI } from '../../services/api';
import '../../styles/eventDetails.css';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        // Pobierz szczegóły wydarzenia (backend sprawdzi czy muzyk ma dostęp)
        const response = await eventsAPI.getEvent(id);
        
        setEvent(response.event);
        setInvitations(response.invitations || []);
        
        // Wyciągnij uczestników z participations (tylko zaakceptowani)
        const confirmedParticipants = response.participations?.filter(
          participation => participation.status === 'confirmed'
        ) || [];
        
        setParticipants(confirmedParticipants);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching event data:', error);
        
        // Jeśli błąd 403/401, prawdopodobnie brak dostępu
        if (error.message?.includes('403') || error.message?.includes('401')) {
          setError('Nie masz dostępu do tego wydarzenia');
        } else {
          setError(error.message || 'Wystąpił błąd podczas pobierania danych');
        }
        setLoading(false);
      }
    };
    
    fetchEventData();
  }, [id]);
  
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

  // Sprawdź czy muzyk ma oczekujące zaproszenie
  const userInvitation = invitations.find(
    inv => inv.userId._id === user.id && inv.status === 'pending'
  );

  // Sprawdź czy muzyk już potwierdził udział
  const userParticipation = participants.find(
    part => part.userId._id === user.id
  );
  
  if (loading) {
    return <div className="loading">Ładowanie szczegółów wydarzenia...</div>;
  }
  
  if (error) {
    return <div className="error-container">
      <div className="error-message">{error}</div>
      <button onClick={() => navigate('/musician/dashboard')} className="btn-back">
        Powrót do strony głównej
      </button>
    </div>;
  }
  
  if (!event) {
    return <div className="error-container">
      <div className="error-message">Nie znaleziono wydarzenia.</div>
      <button onClick={() => navigate('/musician/dashboard')} className="btn-back">
        Powrót do strony głównej
      </button>
    </div>;
  }
  
  return (
    <div className="event-details">
      <div className="event-details-header">
        <h1>{event.title}</h1>
        <button onClick={() => navigate('/musician/dashboard')} className="btn-back">
          Powrót do listy
        </button>
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

          {/* Sekcja zaproszenia */}
          {userInvitation && !userParticipation && (
            <div className="event-info-card invitation-card">
              <h2>Zaproszenie</h2>
              <p>Zostałeś zaproszony do tego wydarzenia.</p>
              <div className="invitation-actions">
                <button 
                  onClick={() => navigate(`/musician/events/${id}/participate/${userInvitation._id}`)}
                  className="btn-respond"
                >
                  Odpowiedz na zaproszenie
                </button>
              </div>
            </div>
          )}

          {/* Status uczestnictwa */}
          {userParticipation && (
            <div className="event-info-card participation-card">
              <h2>Status uczestnictwa</h2>
              <p className="participation-confirmed">✅ Potwierdziłeś udział w tym wydarzeniu</p>
            </div>
          )}
        </div>
        
        <div className="event-musicians-section">
          <div className="musicians-card">
            <h2>Uczestnicy</h2>
            
            {participants.length > 0 ? (
              <div className="musicians-list">
                {participants.map(participant => {
                  const musician = participant.userId;
                  if (!musician) return null;
                  
                  return (
                    <div key={participant._id} className="musician-item">
                      <div className="musician-info">
                        <div className="musician-name">
                          {musician.name}
                          {musician._id === user.id && ' (Ty)'}
                        </div>
                        <div className="musician-instrument">
                          {musician.instrument || 'Instrument nieznany'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>Brak potwierdzonych uczestników.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;