import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsAPI } from '../../services/api';
import '../../styles/contracts.css';

const Contracts = () => {
  console.log('--- Komponent renderuje ---');
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  console.log('Stan początkowy:', { loading, error, events });

  useEffect(() => {
    console.log('useEffect: Rozpoczynam pobieranie danych...');
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await eventsAPI.getEvents();
        console.log('useEffect: Otrzymano odpowiedź z serwera:', response);
        
        const eventsData = response.events || [];
        console.log('useEffect: Dane do ustawienia w stanie:', eventsData);
        setEvents(eventsData);
        setError(null);

      } catch (err) {
        console.error('useEffect: Złapano błąd!', err);
        setError('Nie udało się załadować wydarzeń. Spróbuj ponownie później.');
        setEvents([]);
      } finally {
        console.log('useEffect: Koniec bloku try/catch/finally. Ustawiam loading na false.');
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleGenerateContract = (eventId) => {
    navigate(`/conductor/contracts/${eventId}`);
  };

  console.log('Przed instrukcjami warunkowymi. Stan:', { loading, error, events });

  if (loading) {
    console.log('Renderuję: Stan Ładowania');
    return <div className="contracts-container"><p>Ładowanie wydarzeń...</p></div>;
  }

  if (error) {
    console.log('Renderuję: Stan Błędu');
    return <div className="contracts-container"><p className="error-message">{error}</p></div>;
  }
  
  if (!events) {
    console.log('Renderuję: Nic (events jest null/undefined)');
    return null;
  }
  
  console.log(`Renderuję: Główny widok. Liczba wydarzeń: ${events.length}`);
  return (
    <div className="contracts-container">
      <div style={{ border: '2px solid red', padding: '10px', margin: '20px', backgroundColor: '#f0f0f0' }}>
        <h3>Panel Debugowania</h3>
        <pre>
          {JSON.stringify({
            loading,
            error,
            eventsCount: events ? events.length : 'null',
            events: events
          }, null, 2)}
        </pre>
      </div>

      <h2>Zarządzaj Umowami</h2>
      {events.length > 0 ? (
        <ul className="events-list">
          {events.map(event => (
            <li key={event._id} className="event-item">
              <span className="event-title">{event.title}</span>
              <span className="event-date">{new Date(event.date).toLocaleDateString()}</span>
              <button 
                onClick={() => handleGenerateContract(event._id)}
                className="btn-generate"
              >
                Generuj Umowę
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Brak wydarzeń do wygenerowania umów.</p>
      )}
    </div>
  );
};

export default Contracts; 