import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsAPI } from '../../services/api';
import '../../styles/eventParticipation.css';

const EventParticipation = () => {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Pobierz szczegóły wydarzenia (zawiera zaproszenia i uczestnictwa)
        const response = await eventsAPI.getEvent(eventId);
        const eventData = response.event;
        
        setEvent(eventData);
        
        // Znajdź zaproszenie dla tego użytkownika
        const userInvitation = response.invitations?.find(
          inv => inv.userId._id === user.id
        );
        
        if (!userInvitation) {
          throw new Error('Nie znaleziono zaproszenia dla tego użytkownika');
        }
        
        // Sprawdź czy użytkownik już odpowiedział
        const userParticipation = response.participations?.find(
          part => part.userId._id === user.id
        );
        
        if (userParticipation) {
          throw new Error('Już odpowiedziałeś na to zaproszenie');
        }
        
        setInvitation(userInvitation);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message || 'Wystąpił błąd podczas pobierania danych');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [eventId, user.id]);
  
  const handleResponse = async (accept) => {
    setProcessing(true);
    
    try {
      // Nowy backend prawdopodobnie ma endpoint do odpowiedzi na zaproszenie
      // Będę używać ogólnego API call - może trzeba będzie dodać nowy endpoint
      const response = await fetch(`http://localhost:3002/api/events/${eventId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          status: accept ? 'confirmed' : 'declined'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Błąd podczas odpowiedzi na zaproszenie');
      }
      
      // Przekieruj do dashboard z komunikatem
      const message = accept ? 'Potwierdziłeś udział w wydarzeniu' : 'Odrzuciłeś zaproszenie';
      
      // Możesz użyć sessionStorage lub state do przekazania wiadomości
      sessionStorage.setItem('participationMessage', message);
      
      navigate('/musician/dashboard');
    } catch (error) {
      console.error('Error processing response:', error);
      setError(error.message || 'Wystąpił błąd podczas przetwarzania odpowiedzi');
      setProcessing(false);
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
  
  if (loading) {
    return <div className="loading">Ładowanie szczegółów zaproszenia...</div>;
  }
  
  if (error) {
    return <div className="error-container">
      <div className="error-message">{error}</div>
      <button onClick={() => navigate('/musician/dashboard')} className="btn-back">
        Powrót do strony głównej
      </button>
    </div>;
  }
  
  if (!event || !invitation) {
    return <div className="error-container">
      <div className="error-message">Nie znaleziono wydarzenia lub zaproszenia.</div>
      <button onClick={() => navigate('/musician/dashboard')} className="btn-back">
        Powrót do strony głównej
      </button>
    </div>;
  }
  
  return (
    <div className="participation-container">
      <div className="participation-card">
        <h1>Zaproszenie na wydarzenie</h1>
        
        <div className="event-summary">
          <h2>{event.title}</h2>
          <div className="event-date">
            <strong>Data i godzina:</strong> {formatDate(event.date)}
          </div>
          
          {event.description && (
            <div className="event-description">
              <strong>Opis:</strong>
              <p>{event.description}</p>
            </div>
          )}
          
          {event.schedule && (
            <div className="event-schedule">
              <strong>Harmonogram:</strong>
              <pre>{event.schedule}</pre>
            </div>
          )}
          
          {event.program && (
            <div className="event-program">
              <strong>Program:</strong>
              <pre>{event.program}</pre>
            </div>
          )}
        </div>
        
        <div className="response-section">
          <p>Czy chcesz wziąć udział w tym wydarzeniu?</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="response-buttons">
            <button 
              onClick={() => handleResponse(false)} 
              className="btn-decline"
              disabled={processing}
            >
              {processing ? 'Przetwarzanie...' : 'Odrzuć'}
            </button>
            <button 
              onClick={() => handleResponse(true)} 
              className="btn-accept"
              disabled={processing}
            >
              {processing ? 'Przetwarzanie...' : 'Potwierdź udział'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventParticipation;