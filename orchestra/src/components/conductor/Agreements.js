import React, { useState, useEffect } from 'react';
import EventCard from '../common/EventCard';
import '../../styles/dashboard.css';

// Tymczasowo przenosimy logikę API bezpośrednio tutaj, aby ominąć problem z edycją pliku api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://artesymfoniko-production.up.railway.app";
const getAuthToken = () => {
    const user = localStorage.getItem("user");
    if (user) {
        const userData = JSON.parse(user);
        return userData.token;
    }
    return null;
};

const Agreements = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchEventsForContracts = async () => {
            try {
                setLoading(true);
                
                const token = getAuthToken();
                const response = await fetch(`${API_BASE_URL}/api/events`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                const activeEvents = data.events.filter(event => !event.archived);
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