import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { eventsAPI } from '../../services/api';
import '../../styles/contractDetails.css';

const ContractDetails = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContractData = async () => {
      try {
        setLoading(true);
        const data = await eventsAPI.getEvent(eventId);
        setEvent(data.event);
        // Filtrujemy tylko potwierdzonych uczestników
        const confirmedParticipants = data.participations.filter(p => p.status === 'confirmed');
        setParticipants(confirmedParticipants);
        setError(null);
      } catch (err) {
        setError('Nie udało się załadować danych do umowy. Spróbuj ponownie później.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchContractData();
  }, [eventId]);

  if (loading) {
    return <div className="contract-details-container"><p>Ładowanie danych...</p></div>;
  }

  if (error) {
    return <div className="contract-details-container"><p className="error-message">{error}</p></div>;
  }

  if (!event) {
    return <div className="contract-details-container"><p>Nie znaleziono wydarzenia.</p></div>;
  }

  return (
    <div className="contract-details-container">
      <header className="contract-header">
        <h1>Umowa o dzieło dla wydarzenia: {event.title}</h1>
        <p>Data wydarzenia: {new Date(event.date).toLocaleDateString()}</p>
        <p>Lokalizacja: {event.location}</p>
      </header>

      <section className="participants-section">
        <h2>Uczestnicy (Wykonawcy)</h2>
        {participants.length > 0 ? (
          <ul className="participants-list">
            {participants.map(p => (
              <li key={p.userId._id} className="participant-item">
                <span className="participant-name">{p.userId.name}</span>
                <span className="participant-instrument">{p.userId.instrument}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Brak potwierdzonych uczestników w tym wydarzeniu.</p>
        )}
      </section>

      <footer className="contract-footer">
        <button onClick={() => window.print()} className="btn-print">
          Drukuj Umowę
        </button>
      </footer>
    </div>
  );
};

export default ContractDetails; 