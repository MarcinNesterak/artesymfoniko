import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsAPI, API_BASE_URL } from '../../services/api';
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
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/events/${eventId}/respond`, {
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
  
  const addToGoogleCalendar = () => {
    if (!event) return;

    // Formatuj datę i czas dla Google Calendar
    const startDate = new Date(event.date);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2h domyślnie

    const formatDate = (date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    // Przygotuj URL do Google Calendar
    const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render');
    googleCalendarUrl.searchParams.append('action', 'TEMPLATE');
    googleCalendarUrl.searchParams.append('text', event.title);
    googleCalendarUrl.searchParams.append('dates', `${formatDate(startDate)}/${formatDate(endDate)}`);
    googleCalendarUrl.searchParams.append('details', `${event.description || ''}\n\nHarmonogram:\n${event.schedule || ''}\n\nProgram:\n${event.program || ''}`);
    googleCalendarUrl.searchParams.append('location', event.location || '');

    // Otwórz w nowej karcie
    window.open(googleCalendarUrl.toString(), '_blank');
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

        {!processing && (
          <button 
            onClick={addToGoogleCalendar}
            className="btn-calendar"
            title="Dodaj do Google Calendar"
          >
            📅 Dodaj do kalendarza Google
          </button>
        )}
      </div>
    </div>
  );
};

export default EventParticipation;