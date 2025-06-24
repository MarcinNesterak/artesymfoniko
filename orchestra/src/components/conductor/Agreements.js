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
                console.log("KROK 1: Rozpoczynam pobieranie wydarzeń...");
                setLoading(true);
                
                const token = getAuthToken();
                console.log("KROK 2: Token autoryzacyjny", token ? "ZNALEZIONY" : "BRAK TOKENA");

                const response = await fetch(`${API_BASE_URL}/api/events`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                console.log("KROK 3: Status odpowiedzi od serwera:", response.status);

                if (!response.ok) {
                    throw new Error(`Błąd HTTP! Status: ${response.status}`);
                }
                const data = await response.json();
                console.log("KROK 4: Surowe dane otrzymane z API:", data);

                if (!data.events || !Array.isArray(data.events)) {
                    console.error("KRYTYCZNY BŁĄD: Odpowiedź z API nie zawiera tablicy 'events'.");
                    throw new Error("Nieprawidłowa struktura danych z API.");
                }
                console.log(`KROK 5: Znaleziono ${data.events.length} wydarzeń w odpowiedzi.`);

                const activeEvents = data.events.filter(event => !event.archived);
                console.log(`KROK 6: Po filtracji zostało ${activeEvents.length} aktywnych wydarzeń.`);
                console.log("KROK 7: Wydarzenia, które zostaną ustawione w stanie:", activeEvents);

                setEvents(activeEvents);
                console.log("KROK 8: Stan komponentu został zaktualizowany.");

            } catch (err) {
                console.error("!!! KRYTYCZNY BŁĄD PODCZAS POBIERANIA WYDARZEŃ:", err);
                setError('Wystąpił błąd. Sprawdź konsolę deweloperską po więcej informacji.');
            } finally {
                setLoading(false);
                console.log("KROK 9: Zakończono ładowanie (setLoading(false)).");
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