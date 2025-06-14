import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { eventsAPI, usersAPI } from "../../services/api";
import "../../styles/eventDetails.css";
import SuccessMessage from '../common/SuccessMessage';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [event, setEvent] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [allMusicians, setAllMusicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedMusicians, setSelectedMusicians] = useState([]);
  const [editData, setEditData] = useState({
    title: "",
    date: "",
    description: "",
    schedule: "",
    program: "",
  });
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchEventData();
  }, [id]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      setError("");

      // Pobierz szczegóły wydarzenia (zawiera invitations i participations)
      const eventResponse = await eventsAPI.getEvent(id);
      setEvent(eventResponse.event);
      setInvitations(eventResponse.invitations || []);
      setParticipations(eventResponse.participations || []);

      // Ustaw dane do edycji
      const eventData = eventResponse.event;
      setEditData({
        title: eventData.title || "",
        date: eventData.date
          ? new Date(eventData.date).toISOString().slice(0, 16)
          : "",
        description: eventData.description || "",
        schedule: eventData.schedule || "",
        program: eventData.program || "",
      });

      // Pobierz wszystkich muzyków dla selecta
      const musiciansResponse = await usersAPI.getMusicians();
      setAllMusicians(musiciansResponse.musicians || []);
    } catch (error) {
      console.error("Error fetching event data:", error);
      setError(
        "Wystąpił błąd podczas pobierania danych. Spróbuj odświeżyć stronę."
      );
    } finally {
      setLoading(false);
    }
  };

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

  // Funkcje czatu
  const fetchMessages = async () => {
    try {
      const response = await eventsAPI.getEventMessages(id);
      setMessages(response.messages || []);
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
      fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Błąd podczas wysyłania wiadomości");
    } finally {
      setSendingMessage(false);
    }
  };

  // Auto-refresh co 5 sekund
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleEditEvent = async (e) => {
    e.preventDefault();
    setEditLoading(true);

    try {
      const updateData = {
        title: editData.title,
        date: editData.date,
        description: editData.description,
        schedule: editData.schedule,
        program: editData.program,
      };

      await eventsAPI.updateEvent(id, updateData);

      // Odśwież dane wydarzenia
      await fetchEventData();

      setShowEditModal(false);
      setSuccessMessage("Wydarzenie zostało zaktualizowane pomyślnie!");
      setTimeout(() => setSuccessMessage(""), 3500);
    } catch (error) {
      console.error("Error updating event:", error);
      setError("Wystąpił błąd podczas aktualizacji wydarzenia.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    const confirmMessage = `Czy na pewno chcesz USUNĄĆ wydarzenie "${event.title}"?\n\n⚠️ UWAGA: Ta operacja jest nieodwracalna!\n\nWydarzenie zostanie całkowicie usunięte z systemu i zniknie dla wszystkich muzyków.\n\nAby potwierdzić, wpisz: USUŃ`;

    const userInput = prompt(confirmMessage);

    if (userInput !== "USUŃ") {
      if (userInput !== null) {
        setError("Usuwanie anulowane. Aby usunąć wydarzenie, musisz wpisać dokładnie: USUŃ");
      }
      return;
    }

    try {
      setLoading(true);

      await eventsAPI.deleteEvent(id);

      setSuccessMessage("Wydarzenie zostało pomyślnie usunięte.");
      navigate("/conductor/dashboard");
    } catch (error) {
      console.error("Error deleting event:", error);
      setError("Wystąpił błąd podczas usuwania wydarzenia. Spróbuj ponownie.");
      setLoading(false);
    }
  };

  const sendInvitation = async (musicianId) => {
    try {
      // Sprawdź czy muzyk już został zaproszony
      const alreadyInvited = invitations.some(
        (inv) => inv.userId._id === musicianId
      );
      if (alreadyInvited) {
        setError("Ten muzyk już został zaproszony.");
        return;
      }

      await eventsAPI.inviteMusicians(id, [musicianId]);
      setSuccessMessage("Zaproszenie zostało wysłane.");

      // Odśwież dane wydarzenia
      fetchEventData();
    } catch (error) {
      console.error("Error sending invitation:", error);
      setError("Wystąpił błąd podczas wysyłania zaproszenia.");
    }
  };

  const sendMultipleInvitations = async () => {
    if (selectedMusicians.length === 0) return;

    try {
      // Sprawdź czy któryś z muzyków już został zaproszony
      const alreadyInvited = selectedMusicians.filter((musicianId) =>
        invitations.some((inv) => inv.userId._id === musicianId)
      );

      if (alreadyInvited.length > 0) {
        setError(
          "Niektórzy wybrani muzycy już zostali zaproszeni. Zaproszenia zostaną wysłane tylko do nowych muzyków."
        );
      }

      // Wyślij zaproszenia tylko do tych, którzy jeszcze nie zostali zaproszeni
      const newInvitations = selectedMusicians.filter(
        (musicianId) =>
          !invitations.some((inv) => inv.userId._id === musicianId)
      );

      if (newInvitations.length === 0) {
        setError("Wszyscy wybrani muzycy już zostali zaproszeni.");
        setSelectedMusicians([]);
        return;
      }

      await eventsAPI.inviteMusicians(id, newInvitations);

      const count = newInvitations.length;
      setSuccessMessage(
        `Zaproszenia zostały wysłane do ${count} ${
          count === 1 ? "muzyka" : count < 5 ? "muzyków" : "muzyków"
        }.`
      );

      // Wyczyść wybór i odśwież dane
      setSelectedMusicians([]);
      fetchEventData();
    } catch (error) {
      console.error("Error sending multiple invitations:", error);
      setError("Wystąpił błąd podczas wysyłania zaproszeń.");
    }
  };

  const cancelInvitation = async (invitationId, musicianName) => {
    if (
      !window.confirm(
        `Czy na pewno chcesz odwołać zaproszenie dla ${musicianName}?`
      )
    ) {
      return;
    }

    try {
      // Wywołaj endpoint do odwołania zaproszenia
      await eventsAPI.cancelInvitation(id, invitationId);
      setSuccessMessage("Zaproszenie zostało odwołane.");

      // Odśwież dane wydarzenia
      fetchEventData();
    } catch (error) {
      console.error("Error canceling invitation:", error);
      setError("Wystąpił błąd podczas odwoływania zaproszenia.");
    }
  };

  const removeParticipant = async (participantId, musicianName) => {
    if (
      !window.confirm(
        `Czy na pewno chcesz usunąć ${musicianName} z uczestników wydarzenia?`
      )
    ) {
      return;
    }

    try {
      // Wywołaj endpoint do usunięcia uczestnika
      await eventsAPI.removeParticipant(id, participantId);
      setSuccessMessage("Uczestnik został usunięty z wydarzenia.");

      // Odśwież dane wydarzenia
      fetchEventData();
    } catch (error) {
      console.error("Error removing participant:", error);
      setError("Wystąpił błąd podczas usuwania uczestnika.");
    }
  };

  const getParticipationStatus = (userId) => {
    // Sprawdź czy muzyk odpowiedział na zaproszenie
    const participation = participations.find((p) => p.userId._id === userId);
    if (participation) {
      return participation.status === "confirmed"
        ? "Zaakceptowano"
        : "Odrzucono";
    }

    // Sprawdź czy muzyk został zaproszony
    const invitation = invitations.find((inv) => inv.userId._id === userId);
    if (invitation) {
      return "Oczekująca";
    }

    return null;
  };

  if (loading) {
    return <div className="loading">Ładowanie szczegółów wydarzenia...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!event) {
    return <div className="error-message">Nie znaleziono wydarzenia.</div>;
  }

  const invitedMusicianIds = invitations.map((inv) => inv.userId._id);
  const availableMusicians = allMusicians.filter(
    (m) => !invitedMusicianIds.includes(m._id)
  );

  return (
    <div className="event-details">
      <div className="event-details-header">
        <h1>{event.title}</h1>
        <div className="event-actions">
          <button
            onClick={() => navigate("/conductor/dashboard")}
            className="btn-back"
          >
            Powrót do listy
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="btn-edit"
            disabled={loading}
          >
            Edytuj Wydarzenie
          </button>
          <button
            onClick={handleDeleteEvent}
            className="btn-delete"
            disabled={loading}
            title="Usuń wydarzenie (nieodwracalne)"
          >
            Usuń Wydarzenie
          </button>
        </div>
      </div>

      {/* Modal edycji wydarzenia */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edytuj Wydarzenie</h2>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditEvent} className="edit-event-form">
              <div className="form-group">
                <label htmlFor="edit-title">Tytuł wydarzenia*</label>
                <input
                  type="text"
                  id="edit-title"
                  value={editData.title}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  disabled={editLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-date">Data i godzina*</label>
                <input
                  type="datetime-local"
                  id="edit-date"
                  value={editData.date}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, date: e.target.value }))
                  }
                  disabled={editLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-description">Opis wydarzenia</label>
                <textarea
                  id="edit-description"
                  value={editData.description}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  disabled={editLoading}
                  rows="3"
                  placeholder="Opcjonalny opis wydarzenia..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-schedule">Harmonogram</label>
                <textarea
                  id="edit-schedule"
                  value={editData.schedule}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      schedule: e.target.value,
                    }))
                  }
                  disabled={editLoading}
                  rows="4"
                  placeholder="np.&#10;14:00 - Rozgrzewka&#10;14:30 - Próba pierwszej części&#10;15:30 - Przerwa&#10;16:00 - Próba drugiej części"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-program">Program koncertu</label>
                <textarea
                  id="edit-program"
                  value={editData.program}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      program: e.target.value,
                    }))
                  }
                  disabled={editLoading}
                  rows="4"
                  placeholder="np.&#10;1. Mozart - Symfonia nr 40&#10;2. Beethoven - Koncert fortepianowy nr 5&#10;3. Chopin - Nokturny"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={editLoading}
                  className="btn-secondary"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="btn-primary"
                >
                  {editLoading ? "Zapisywanie..." : "Zapisz Zmiany"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="event-details-content event-details-desktop-layout">
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
                        {event.dresscode === 'frak' && <img src="/img/frak.png" alt="frak" />}
                        {event.dresscode === 'black' && <img src="/img/black.png" alt="black" />}
                        {event.dresscode === 'casual' && <img src="/img/casual.png" alt="casual" />}
                        {event.dresscode === 'other' && <img src="/img/other.png" alt="other" />}
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
        </div>
        <div className="event-side-section">
          {/* Czat na mobile nad muzykami, na desktopie pod muzykami */}
          <div className="chat-card chat-responsive-order">
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

                    {/* Status przeczytania - tylko dla dyrygenta */}
                    {message.readBy && (
                      <div className="message-read-status">
                        {(() => {
                          // Znajdź kto NIE przeczytał
                          const allParticipants = message.allParticipants || [];
                          const readByNames = message.readBy.map(
                            (read) => read.name
                          );
                          const notReadBy = allParticipants
                            .map((p) => p.name)
                            .filter((name) => !readByNames.includes(name));

                          return (
                            <small className="read-info">
                              {notReadBy.length > 0 ? (
                                <>
                                  ⚠️ Nie przeczytali:{" "}
                                  <span className="not-read-list">
                                    {notReadBy.join(", ")}
                                  </span>
                                </>
                              ) : (
                                <>
                                  ✅ Wszyscy przeczytali ({message.readCount}/
                                  {message.participantCount})
                                </>
                              )}
                            </small>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-messages">Brak wiadomości. Napisz pierwszą!</p>
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
          <div className="musicians-card">
            <h2>Zaproszeni muzycy</h2>

            {invitations.length > 0 ? (
              <div className="musicians-list">
                {[...invitations]
                  .sort((a, b) => {
                    const statusA = getParticipationStatus(a.userId._id);
                    const statusB = getParticipationStatus(b.userId._id);
                    // Zaakceptowani na górze
                    if (statusA === "Zaakceptowano" && statusB !== "Zaakceptowano") return -1;
                    if (statusA !== "Zaakceptowano" && statusB === "Zaakceptowano") return 1;
                    // Potem alfabetycznie
                    return a.userId.name.localeCompare(b.userId.name, 'pl');
                  })
                  .map((invitation) => {
                    const musician = invitation.userId;
                    if (!musician) return null;

                    const status = getParticipationStatus(musician._id);
                    const participation = participations.find(
                      (p) => p.userId._id === musician._id
                    );
                    let statusClass = "status-pending";

                    if (status === "Zaakceptowano") {
                      statusClass = "status-confirmed";
                    } else if (status === "Odrzucono") {
                      statusClass = "status-declined";
                    }

                    return (
                      <div key={invitation._id} className="musician-item">
                        <div className="musician-info">
                          <div className="musician-name">{musician.name}</div>
                          <div className="musician-instrument">
                            {musician.instrument || "Instrument nieznany"}
                          </div>
                        </div>
                        <div className={`invitation-status ${statusClass}`}>
                          {status}
                        </div>
                        <div className="musician-actions">
                          {status === "Oczekująca" && (
                            <button
                              onClick={() =>
                                cancelInvitation(invitation._id, musician.name)
                              }
                              className="btn-cancel-invitation"
                              title="Odwołaj zaproszenie"
                            >
                              Odwołaj
                            </button>
                          )}
                          {status === "Zaakceptowano" && participation && (
                            <button
                              onClick={() =>
                                removeParticipant(
                                  participation._id,
                                  musician.name
                                )
                              }
                              className="btn-remove-participant"
                              title="Usuń z uczestników"
                            >
                              Usuń
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p>Nie zaproszono jeszcze żadnych muzyków.</p>
            )}

            {availableMusicians.length > 0 && (
              <div className="add-musicians-section">
                <h3>Zaproś więcej muzyków</h3>
                <div className="musicians-selection">
                  {availableMusicians.map((musician) => (
                    <label key={musician._id} className="musician-checkbox">
                      <input
                        type="checkbox"
                        value={musician._id}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMusicians((prev) => [
                              ...prev,
                              musician._id,
                            ]);
                          } else {
                            setSelectedMusicians((prev) =>
                              prev.filter((id) => id !== musician._id)
                            );
                          }
                        }}
                        checked={selectedMusicians.includes(musician._id)}
                      />
                      <span className="musician-label">
                        {musician.name} (
                        {musician.instrument || "Instrument nieznany"})
                      </span>
                    </label>
                  ))}
                </div>
                {selectedMusicians.length > 0 && (
                  <div className="invitation-actions">
                    <button
                      onClick={sendMultipleInvitations}
                      className="btn-invite-selected"
                    >
                      Zaproś wybranych ({selectedMusicians.length})
                    </button>
                    <button
                      onClick={() => setSelectedMusicians([])}
                      className="btn-clear-selection"
                    >
                      Wyczyść wybór
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <SuccessMessage message={successMessage} onClose={() => setSuccessMessage("")} />
    </div>
  );
};

export default EventDetails;
