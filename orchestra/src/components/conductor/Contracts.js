import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsAPI } from '../../services/api';
import '../../styles/contracts.css';

const Contracts = () => {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await eventsAPI.getEvents();
        setEvents(response.events || []);
        setError(null);
      } catch (err) {
        setError('Nie udało się załadować wydarzeń. Spróbuj ponownie później.');
        setEvents([]);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleGenerateContract = (eventId) => {
    navigate(`/conductor/contracts/${eventId}`);
  };

  if (loading) {
    return <div className="contracts-container"><p>Ładowanie wydarzeń...</p></div>;
  }

  if (error) {
    return <div className="contracts-container"><p className="error-message">{error}</p></div>;
  }

  if (!events) {
    return null;
  }

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