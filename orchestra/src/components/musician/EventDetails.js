import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { eventsAPI } from "../../services/api";
import "../../styles/eventDetails.css";
import SuccessMessage from "../common/SuccessMessage";

const DRESSCODE_DESCRIPTIONS = {
  frak: "frak, biała koszula, biała muszka",
  black: "czarna marynarka, czarna koszula",
  casual: "biała koszula, czarna marynarka",
};

const DRESSCODE_IMAGES = {
  frak: "/img/frak.png",
  black: "/img/black.png",
  casual: "/img/casual.png",
  other: "/img/other.png",
};

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
  const [calendarAdded, setCalendarAdded] = useState(false);

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
      setSuccessMessage("Wiadomość wysłana pomyślnie!");
      setTimeout(() => setSuccessMessage(""), 2500);
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

  const addToGoogleCalendar = () => {
    if (!event) return;
    const startDate = new Date(event.date);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2h
    const formatDate = (date) => date.toISOString().replace(/-|:|\.\d+/g, "");
    const googleCalendarUrl = new URL(
      "https://calendar.google.com/calendar/render"
    );
    googleCalendarUrl.searchParams.append("action", "TEMPLATE");
    googleCalendarUrl.searchParams.append("text", event.title);
    googleCalendarUrl.searchParams.append(
      "dates",
      `${formatDate(startDate)}/${formatDate(endDate)}`
    );
    googleCalendarUrl.searchParams.append(
      "details",
      `${event.description || ""}\n\nHarmonogram:\n${
        event.schedule || ""
      }\n\nProgram:\n${event.program || ""}`
    );
    googleCalendarUrl.searchParams.append("location", event.location || "");
    window.open(googleCalendarUrl.toString(), "_blank");
    setCalendarAdded(true);
  };

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

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Czy na pewno chcesz usunąć tę wiadomość?")) {
      return;
    }
    try {
      await eventsAPI.deleteEventMessage(id, messageId);
      fetchMessages(); // Natychmiastowe odświeżenie
    } catch (error) {
      console.error("Error deleting message:", error);
      setError("Nie udało się usunąć wiadomości.");
    }
  };

  const handleParticipation = async (status) => {
    setLoading(true);
    try {
      await eventsAPI.updateParticipationStatus(id, status);
      fetchMessages(); // Natychmiastowe odświeżenie
    } catch (error) {
      console.error("Error updating participation status:", error);
      setError("Nie udało się zaktualizować statusu uczestnictwa.");
    } finally {
      setLoading(false);
    }
  };

  const getMusicianDisplayName = (musician) => {
    if (!musician || !musician.name) return "";
    const nameParts = musician.name.split(" ");
    const lastName = nameParts.pop() || "";
    const firstName = nameParts.join(" ");
    return `${lastName} ${firstName}`.trim();
  };

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

  const getDresscodeInfo = () => {
    if (!event || !event.dresscode) return null;
    const { dresscode } = event;
    const isStandard = DRESSCODE_DESCRIPTIONS[dresscode];
    return {
      image: isStandard ? DRESSCODE_IMAGES[dresscode] : DRESSCODE_IMAGES.other,
      description: isStandard || dresscode,
    };
  };

  const dresscodeInfo = getDresscodeInfo();

  const sortedParticipants = [...participants].sort((a, b) => {
    const nameA = a.userId?.name || "";
    const nameB = b.userId?.name || "";
    const lastNameA = nameA.split(" ").pop() || "";
    const lastNameB = nameB.split(" ").pop() || "";
    return lastNameA.localeCompare(lastNameB, "pl", { sensitivity: "base" });
  });

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
        <div
          className="event-info-card invitation-card"
          style={{ marginBottom: 24 }}
        >
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
          {/* Przycisk kalendarza Google */}
          {!calendarAdded ? (
            <button
              onClick={addToGoogleCalendar}
              className="btn-calendar"
              style={{ marginTop: 16 }}
            >
              📅 Dodaj do kalendarza Google
            </button>
          ) : (
            <div
              className="calendar-added-message"
              style={{ marginTop: 16, color: "var(--accent-color)" }}
            >
              ✔️ Dodano do kalendarza Google!
            </div>
          )}
        </div>
      )}

      <div className="event-details-content event-details-desktop-layout">
        <div className="event-info-section">
          <div className="event-info-card">
            <h2>Informacje o wydarzeniu</h2>
            <div className="event-info-grid">
              <div className="info-item">
                <span className="info-label">Data:</span>
                <span className="info-value">{formatDate(event.date)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Miejsce:</span>
                <span className="info-value">{event.location}</span>
              </div>
            </div>
            {dresscodeInfo && (
              <div className="event-info-section" style={{ marginTop: "16px" }}>
                <h3>Dresscode</h3>
                <div className="dresscode-display">
                  <div className="dresscode-column">
                    <div className="dresscode-image-container">
                      <img
                        src={dresscodeInfo.image}
                        alt={dresscodeInfo.description}
                      />
                    </div>
                    <div className="dresscode-details">
                      <span className="dresscode-label">Panowie</span>
                      <p className="dresscode-description">
                        {dresscodeInfo.description}
                      </p>
                    </div>
                  </div>
                  <div className="dresscode-column">
                    <div className="dresscode-image-container">
                      <img src="/img/principessa.png" alt="Principessa" />
                    </div>
                    <div className="dresscode-details">
                      <span className="dresscode-label">Panie</span>
                      <p className="dresscode-description">principessa</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {event.description && (
              <div className="event-extra-info">
                <strong>Opis:</strong>
                <p>{event.description}</p>
              </div>
            )}
            {event.schedule && (
              <div className="event-extra-info">
                <h3>Harmonogram</h3>
                {Array.isArray(event.schedule) ? (
                  <ul>
                    {event.schedule.map((item, index) => (
                      <li key={index}>
                        <strong>{item.time}</strong> - {item.activity}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{event.schedule || "Brak szczegółowego harmonogramu."}</p>
                )}
              </div>
            )}
            {event.program && (
              <div className="event-extra-info">
                <strong>Program koncertu:</strong>
                <pre>{event.program}</pre>
              </div>
            )}
          </div>

          {/* Status uczestnictwa */}
          {userParticipation && (
            <div className="event-info-card participation-card">
              <h2>Status uczestnictwa</h2>
              <p className="participation-confirmed">
                ✅ Potwierdziłeś udział w tym wydarzeniu
              </p>
              {/* Przycisk kalendarza Google po potwierdzeniu udziału */}
              {!calendarAdded ? (
                <button
                  onClick={addToGoogleCalendar}
                  className="btn-calendar"
                  style={{ marginTop: 16 }}
                >
                  📅 Dodaj do kalendarza Google
                </button>
              ) : (
                <div
                  className="calendar-added-message"
                  style={{ marginTop: 16, color: "var(--accent-color)" }}
                >
                  ✔️ Dodano do kalendarza Google!
                </div>
              )}
            </div>
          )}
        </div>
        <div className="event-side-section">
          <div className="musicians-card">
            <h2>Uczestnicy</h2>

            {participants.length > 0 ? (
              <div className="musicians-list">
                {sortedParticipants.map((participant) => {
                  const musician = participant.userId;
                  if (!musician) return null;

                  return (
                    <div key={participant._id} className="musician-item">
                      <div className="musician-info">
                        <div className="musician-name">
                          {getMusicianDisplayName(musician)}
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
          {userParticipation && (
            <div className="event-info-card chat-card chat-responsive-order">
              <h2>💬 Czat Wydarzenia</h2>

              <div className="chat-messages">
                {messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`chat-message ${
                      msg.userId._id === user.id
                        ? "my-message"
                        : "other-message"
                    }`}
                  >
                    <div className="message-header">
                      <strong>{msg.userId.name}</strong>
                      <span className="message-time">
                        {new Date(msg.createdAt).toLocaleString("pl-PL")}
                      </span>
                    </div>
                    <p
                      className={`message-content ${
                        msg.isDeleted ? "deleted-message" : ""
                      }`}
                    >
                      {msg.content}
                    </p>
                    {msg.userId._id === user.id && !msg.isDeleted && (
                      <button
                        onClick={() => handleDeleteMessage(msg._id)}
                        className="btn-delete-message"
                        title="Usuń wiadomość"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
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
      </div>
      <SuccessMessage
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />
    </div>
  );
};

export default EventDetails;
