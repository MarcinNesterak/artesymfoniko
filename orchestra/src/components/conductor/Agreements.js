import React, { useState, useEffect } from 'react';
import { getEvents } from '../../services/api';
import EventCard from '../common/EventCard';
import '../../styles/dashboard.css';

const Agreements = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchEventsForContracts = async () => {
            try {
                setLoading(true);
                // Pobieramy wszystkie wydarzenia, bez filtrowania
                const allEvents = await getEvents(); 
                
                // Opcjonalnie: filtrujemy po stronie klienta, jeśli jest taka potrzeba
                // Na razie pokazujemy wszystkie, żeby potwierdzić, że działają
                const activeEvents = allEvents.filter(event => new Date(event.date) >= new Date() && !event.isArchived);
                
                setEvents(activeEvents);
            } catch (err) {
                console.error("Błąd podczas pobierania wydarzeń:", err);
                setError('Nie udało się załadować wydarzeń. Spróbuj ponownie później.');
            } finally {
                setLoading(false);
            }
        };

        fetchEventsForContracts();
    }, []);

    return (
        <div className="dashboard-container">
            <h1 className="dashboard-header">Zarządzaj Umowami</h1>
            
            {loading && <p>Ładowanie wydarzeń...</p>}
            {error && <p className="error-message">{error}</p>}
            
            {!loading && !error && (
                <div className="events-list">
                    {events.length > 0 ? (
                        events.map(event => (
                            <EventCard key={event._id} event={event} isContractView={true} />
                        ))
                    ) : (
                        <p>Brak aktywnych wydarzeń do wygenerowania umów.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Agreements; 