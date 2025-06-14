import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { eventsAPI } from "../../services/api";
import "../../styles/eventDetails.css";
import SuccessMessage from '../common/SuccessMessage';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const userJson = localStorage.getItem("user");
  const user = userJson ? JSON.parse(userJson) : null;

  // Funkcje czatu
  const fetchMessages = async () => {
    try {
      const response = await eventsAPI.getEventMessages(id);
      const newMessages = response.messages || [];
      setMessages(newMessages);

      // Automatycznie oznacz wszystkie wiadomości jako przeczytane
      if (newMessages.length > 0) {
        const messageIds = newMessages.map((msg) => msg._id);
        try {
          await eventsAPI.markMessagesAsRead(id, messageIds);
        } catch (error) {
          console.error("Error marking messages as read:", error);
          // Nie pokazujemy błędu użytkownikowi - to funkcja w tle
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      await eventsAPI.sendEventMessage(id, newMessage.trim());
      setNewMessage("");
      fetchMessages(); // Odśwież wiadomości po wysłaniu
      setSuccessMessage("Wiadomość wysłana pomyślnie!");
      setTimeout(() => setSuccessMessage(""), 3500);
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Błąd podczas wysyłania wiadomości");
      setTimeout(() => setError(""), 3500);
    } finally {
      setSendingMessage(false);
    }
  };

  // Sprawdź czy muzyk ma oczekujące zaproszenie
  const userInvitation = invitations.find(
    (inv) => inv.userId._id === user.id && inv.status === "pending"
  );

  // Sprawdź czy muzyk już potwierdził udział
  const userParticipation = participants.find(
    (part) => part.userId._id === user.id
  );

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        // Pobierz szczegóły wydarzenia (backend sprawdzi czy muzyk ma dostęp)
        const response = await eventsAPI.getEvent(id);

        setEvent(response.event);
        setInvitations(response.invitations || []);

        // Wyciągnij uczestników z participations (tylko zaakceptowani)
        const confirmedParticipants =
          response.participations?.filter(
            (participation) => participation.status === "confirmed"
          ) || [];

        setParticipants(confirmedParticipants);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching event data:", error);

        // Jeśli błąd 403/401, prawdopodobnie brak dostępu
        if (error.message?.includes("403") || error.message?.includes("401")) {
          setError("Nie masz dostępu do tego wydarzenia");
        } else {
          setError(error.message || "Wystąpił błąd podczas pobierania danych");
        }
        setLoading(false);
      }
    };

    fetchEventData();
  }, [id]);

  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("pl-PL", options);
  };

  // Automatyczne odświeżanie wiadomości co 5 sekund
  useEffect(() => {
    if (userParticipation) {
      // Tylko dla uczestników
      fetchMessages(); // Początkowe załadowanie

      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [id, userParticipation]);

  // Aktualizuj ostatnią wizytę wydarzenia
  useEffect(() => {
    const updateLastView = async () => {
      try {
        await eventsAPI.updateLastView(id);
      } catch (error) {
        console.error("Błąd przy aktualizacji ostatniej wizyty:", error);
      }
    };

    if (id && event) {
      updateLastView();
    }
  }, [id, event]);

  if (loading) {
    return <div className="loading">Ładowanie szczegółów wydarzenia...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button
          onClick={() => navigate("/musician/dashboard")}
          className="btn-back"
        >
          Powrót do strony głównej
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="error-container">
        <div className="error-message">Nie znaleziono wydarzenia.</div>
        <button
          onClick={() => navigate("/musician/dashboard")}
          className="btn-back"
        >
          Powrót do strony głównej
        </button>
      </div>
    );
  }

  return (
    <div className="event-details">
      <div className="event-details-header">
        <h1>{event.title}</h1>
        <button
          onClick={() => navigate("/musician/dashboard")}
          className="btn-back"
        >
          Powrót do listy
        </button>
      </div>

      {/* Zaproszenie na górze */}
      {userInvitation && !userParticipation && (
        <div className="event-info-card invitation-card" style={{marginBottom: 24}}>
          <h2>Zaproszenie</h2>
          <p>Zostałeś zaproszony do tego wydarzenia.</p>
          <div className="invitation-actions">
            <button
              onClick={() =>
                navigate(
                  `/musician/events/${id}/participate/${userInvitation._id}`
                )
              }
              className="btn-respond"
            >
              Odpowiedz na zaproszenie
            </button>
          </div>
        </div>
      )}

      <div className="event-details-content">
        <div className="event-info-section">
          <div className="event-info-card">
            <h2>Informacje o wydarzeniu</h2>
            <div className="event-info-grid">
              <div className="info-item">
                <span className="info-label">Nazwa:</span>
                <span className="info-value">{event.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Data:</span>
                <span className="info-value">{new Date(event.date).toLocaleDateString('pl-PL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Miejsce:</span>
                <span className="info-value">{event.location}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Dresscode:</span>
                <div className="dresscode-info">
                  <div className="dresscode-grid">
                    <div className="dresscode-column">
                      <div className="dresscode-image-container">
                        {(event.dresscode === 'frak' || event.dresscode === 'black' || event.dresscode === 'casual' || event.dresscode === 'other')
                          ? (
                            <img src={`/img/${event.dresscode || 'frak'}.png`} alt={event.dresscode || 'frak'} />
                          ) : (
                            <img src="/img/frak.png" alt="frak" />
                          )}
                      </div>
                      <div className="dresscode-details">
                        <span className="dresscode-label">Panowie</span>
                        <span className="dresscode-value">{event.dresscode}</span>
                        <p className="dresscode-description">frak, biała koszula, czarna muszka, lakierki</p>
                      </div>
                    </div>
                    <div className="dresscode-column">
                      <div className="dresscode-image-container">
                        <img src="/img/principessa.png" alt="Principessa" />
                      </div>
                      <div className="dresscode-details">
                        <span className="dresscode-label">Panie</span>
                        <span className="dresscode-value">principessa</span>
                        <p className="dresscode-description">principessa</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className={`info-value status-${event.status}`}>
                  {event.status === 'upcoming' ? 'Nadchodzące' : 
                   event.status === 'completed' ? 'Zakończone' : 
                   event.status === 'cancelled' ? 'Anulowane' : 'Nieznany'}
                </span>
              </div>
            </div>
          </div>

          {/* Status uczestnictwa */}
          {userParticipation && (
            <div className="event-info-card participation-card">
              <h2>Status uczestnictwa</h2>
              <p className="participation-confirmed">
                ✅ Potwierdziłeś udział w tym wydarzeniu
              </p>
            </div>
          )}

          {/* DODAJ TUTAJ - Czat wydarzenia */}
          {userParticipation && (
            <div className="event-info-card chat-card">
              <h2>💬 Czat Wydarzenia</h2>

              <div className="chat-messages">
                {messages.length > 0 ? (
                  messages.map((message) => (
                    <div key={message._id} className="chat-message">
                      <div className="message-header">
                        <span className="message-author">
                          {message.userId.name}
                          {message.userId._id === user.id && " (Ty)"}
                        </span>
                        <span className="message-time">
                          {new Date(message.createdAt).toLocaleString("pl-PL", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="message-content">{message.content}</div>
                    </div>
                  ))
                ) : (
                  <p className="no-messages">
                    Brak wiadomości. Napisz pierwszą!
                  </p>
                )}
              </div>

              <form onSubmit={sendMessage} className="chat-form">
                <div className="chat-input-group">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Napisz wiadomość..."
                    disabled={sendingMessage}
                    maxLength={500}
                    className="chat-input"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="chat-send-btn"
                  >
                    {sendingMessage ? "📤" : "➤"}
                  </button>
                </div>
                <div className="chat-counter">{newMessage.length}/500</div>
              </form>
            </div>
          )}
        </div>

        <div className="event-musicians-section">
          <div className="musicians-card">
            <h2>Uczestnicy</h2>

            {participants.length > 0 ? (
              <div className="musicians-list">
                {participants.map((participant) => {
                  const musician = participant.userId;
                  if (!musician) return null;

                  return (
                    <div key={participant._id} className="musician-item">
                      <div className="musician-info">
                        <div className="musician-name">
                          {musician.name}
                          {musician._id === user.id && " (Ty)"}
                        </div>
                        <div className="musician-instrument">
                          {musician.instrument || "Instrument nieznany"}
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
      <SuccessMessage message={successMessage} onClose={() => setSuccessMessage("")} />
    </div>
  );
};

export default EventDetails;
