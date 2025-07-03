import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { eventsAPI, usersAPI } from "../../services/api";
import ChatWindow from "../messages/ChatWindow";
import "../../styles/eventDetails.css";
import SuccessMessage from '../common/SuccessMessage';

const INSTRUMENT_ORDER = [
  'skrzypce', 'altówka', 'wiolonczela', 'kontrabas', 
  'flet', 'obój', 'klarnet', 'fagot', 'saksofon', 
  'waltornia', 'trąbka', 'puzon', 'tuba', 
  'fortepian', 'akordeon', 'gitara', 'perkusja'
];

const DRESSCODE_DESCRIPTIONS = {
  frak: 'frak, biała koszula, biała muszka',
  black: 'czarna marynarka, czarna koszula',
  casual: 'biała koszula, czarna marynarka',
  other: 'inny'
};

// Funkcja pomocnicza do formatowania daty dla input[type="datetime-local"]
const formatDateForInput = (date) => {
  const pad = (num) => num.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [event, setEvent] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [allMusicians, setAllMusicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    location: "",
    dresscode: "",
  });
  const [customDresscode, setCustomDresscode] = useState('');
  const [successMessage, setSuccessMessage] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [isChatModalOpen, setChatModalOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showDresscodeOptions, setShowDresscodeOptions] = useState(false);

  const getMusicianDisplayName = (musician) => {
    if (!musician || !musician.name) return '';
    const nameParts = musician.name.split(' ');
    const lastName = nameParts.pop() || '';
    const firstName = nameParts.join(' ');
    return `${lastName} ${firstName}`.trim();
  };

  useEffect(() => {
    fetchEventData();
  }, [id]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      setError("");

      // Pobierz szczegóły wydarzenia (zawiera invitations i participations)
      const eventResponse = await eventsAPI.getEvent(id);
      setEvent(eventResponse.event);
      setInvitations(eventResponse.invitations || []);
      
      const sortedParticipations = (eventResponse.participations || []).sort((a, b) => {
        const nameA = a.userId?.name || '';
        const nameB = b.userId?.name || '';
        const lastNameA = nameA.split(' ').pop() || '';
        const lastNameB = nameB.split(' ').pop() || '';
        return lastNameA.localeCompare(lastNameB, 'pl', { sensitivity: 'base' });
      });
      setParticipations(sortedParticipations);

      // Ustaw dane do edycji
      const eventData = eventResponse.event;
      const scheduleText = Array.isArray(eventData.schedule)
        ? eventData.schedule.map(item => `${item.time} - ${item.activity}`).join('\\n')
        : eventData.schedule || "";
      
      const initialDresscode = eventData.dresscode || "";
      const isStandardDresscode = ['frak', 'black', 'casual', ''].includes(initialDresscode);

      setEditData({
        title: eventData.title || "",
        date: eventData.date ? formatDateForInput(new Date(eventData.date)) : "",
        description: eventData.description || "",
        schedule: scheduleText,
        program: eventData.program || "",
        location: eventData.location || "",
        dresscode: isStandardDresscode ? initialDresscode : 'other',
      });

      if (!isStandardDresscode) {
        setCustomDresscode(initialDresscode);
      } else {
        setCustomDresscode('');
      }

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
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Błąd podczas wysyłania wiadomości");
    } finally {
      setSendingMessage(false);
    }
  };

  // Auto-refresh co 5 sekund - jedyne źródło prawdy dla odświeżania czatu
  useEffect(() => {
    // Pierwsze pobranie wiadomości
    fetchMessages();
    
    // Ustawienie interwału
    const interval = setInterval(fetchMessages, 5000);
    
    // Czyszczenie interwału po odmontowaniu komponentu
    return () => clearInterval(interval);
  }, [id]);

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Czy na pewno chcesz usunąć tę wiadomość?")) {
      return;
    }
    try {
      await eventsAPI.deleteEventMessage(id, messageId);
      // Wiadomości odświeżą się automatycznie przez interwał,
      // ale możemy wywołać fetchMessages() dla natychmiastowego efektu.
      fetchMessages(); 
    } catch (error) {
      console.error("Error deleting message:", error);
      setError("Nie udało się usunąć wiadomości.");
    }
  };

  const handleEditEvent = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setError(null);

    try {
      const updateData = {
        title: editData.title,
        date: new Date(editData.date).toISOString(),
        description: editData.description,
        schedule: editData.schedule,
        program: editData.program,
        location: editData.location,
        dresscode: editData.dresscode === 'other' ? customDresscode : editData.dresscode,
      };

      await eventsAPI.updateEvent(id, updateData);

      // Po udanej edycji, przekieruj na dashboard z informacją o sukcesie w parametrze URL
      const successMessage = "Wydarzenie zostało zaktualizowane pomyślnie!";
      navigate(`/conductor/dashboard?successMessage=${encodeURIComponent(successMessage)}`);

    } catch (error) {
      console.error("Error updating event:", error);
      if (error.response && error.response.data && Array.isArray(error.response.data.errors)) {
        const errorMessages = error.response.data.errors.map(err => err.msg);
        setError(errorMessages);
      } else {
        setError(["Wystąpił nieoczekiwany błąd podczas aktualizacji."]);
      }
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

  const getDresscodeInfo = () => {
    if (!event || !event.dresscode) return null;
    const { dresscode } = event;
    const isStandard = DRESSCODE_DESCRIPTIONS[dresscode];
    return {
      image: isStandard ? `/img/${dresscode}.png` : '/img/other.png',
      description: isStandard || dresscode,
    };
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

  const addToGoogleCalendar = () => {
    if (!event) return;

    const startDate = new Date(event.date);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2h

    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(
      `${event.description ? event.description + '\n\n' : ''}${
        event.schedule ? 'Harmonogram:\n' + event.schedule + '\n\n' : ''
      }${event.program ? 'Program:\n' + event.program : ''}`
    );
    const location = encodeURIComponent(event.location);
    const start = startDate.toISOString().replace(/-|:|\.\d+/g, '');
    const end = endDate.toISOString().replace(/-|:|\.\d+/g, '');

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${start}/${end}`;
    window.open(url, '_blank');
    setCalendarAdded(true);
  };

  const openChatModal = (participant) => {
    setSelectedParticipant(participant);
    setChatModalOpen(true);
  };

  const closeChatModal = () => {
    setChatModalOpen(false);
    setSelectedParticipant(null);
  };

  const handleOpenEditModal = () => {
    // Upewnij się, że stan opcji stroju jest zsynchronizowany z danymi wydarzenia
    setShowDresscodeOptions(!!editData.dresscode);
    setShowEditModal(true);
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

  const dresscodeInfo = getDresscodeInfo();

  const confirmedParticipants = participations.filter(p => p.status === 'confirmed');

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
          {/* Przycisk kalendarza Google lub komunikat */}
          {!calendarAdded ? (
            <button
              onClick={addToGoogleCalendar}
              className="btn-calendar"
              title="Dodaj do kalendarza Google"
            >
              📅 Dodaj do kalendarza
            </button>
          ) : (
            <div className="calendar-added-message" style={{color: 'var(--accent-color)', margin: '0 8px'}}>
              ✔️ Dodano do kalendarza Google!
            </div>
          )}
          <button
            onClick={handleOpenEditModal}
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

            {error && (
              <div className="error-message modal-error">
                {Array.isArray(error) ? (
                  <ul>
                    {error.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{error}</p> 
                )}
              </div>
            )}

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

              <div className="form-group">
                <label htmlFor="edit-location">Miejsce*</label>
                <input
                  type="text"
                  id="edit-location"
                  value={editData.location}
                  onChange={e => setEditData(prev => ({ ...prev, location: e.target.value }))}
                  required
                  disabled={editLoading}
                  placeholder="Np. Filharmonia Krakowska, ul. Zwierzyniecka 1"
                />
              </div>

              <div className="form-group">
                <label>Dresscode (ubiór panów):</label>
                {!showDresscodeOptions ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowDresscodeOptions(true)}
                  >
                    Dodaj strój (opcjonalnie)
                  </button>
                ) : (
                  <>
                    <div className="dresscode-options">
                      <div className={`dresscode-option ${editData.dresscode === 'frak' ? 'selected' : ''}`} onClick={() => setEditData(prev => ({ ...prev, dresscode: 'frak' }))}>
                        <img src="/img/frak.png" alt="frak" />
                        <span>{DRESSCODE_DESCRIPTIONS['frak']}</span>
                      </div>
                      <div className={`dresscode-option ${editData.dresscode === 'black' ? 'selected' : ''}`} onClick={() => setEditData(prev => ({ ...prev, dresscode: 'black' }))}>
                        <img src="/img/black.png" alt="black" />
                        <span>{DRESSCODE_DESCRIPTIONS['black']}</span>
                      </div>
                      <div className={`dresscode-option ${editData.dresscode === 'casual' ? 'selected' : ''}`} onClick={() => setEditData(prev => ({ ...prev, dresscode: 'casual' }))}>
                        <img src="/img/casual.png" alt="casual" />
                        <span>{DRESSCODE_DESCRIPTIONS['casual']}</span>
                      </div>
                      <div className={`dresscode-option ${editData.dresscode === 'other' ? 'selected' : ''}`} onClick={() => setEditData(prev => ({ ...prev, dresscode: 'other' }))}>
                        <img src="/img/other.png" alt="other" />
                        <span>inne</span>
                      </div>
                    </div>
                    {editData.dresscode === 'other' && (
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label htmlFor="custom-dresscode-edit">Wpisz własny strój:</label>
                        <input
                          type="text"
                          id="custom-dresscode-edit"
                          value={customDresscode}
                          onChange={(e) => setCustomDresscode(e.target.value)}
                          placeholder="Np. strój galowy"
                        />
                      </div>
                    )}
                    <button type="button" onClick={() => { setShowDresscodeOptions(false); setEditData(prev => ({ ...prev, dresscode: '' })); setCustomDresscode(''); }} className="button-secondary-small">
                      Anuluj wybór stroju
                    </button>
                  </>
                )}
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

      <div className="event-details-content">
          <div className="event-info-card">
            <h2>Informacje o wydarzeniu</h2>
          <div className="event-info-grid">
            {/* <div className="info-item">
                <span className="info-label">Nazwa:</span>
                <span className="info-value">{event.name}</span>
              </div> */}
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
              {dresscodeInfo && (
                <div className="info-item">
                  <span className="info-label">Dresscode:</span>
                  <div className="dresscode-info">
                    <div className="dresscode-grid">
                      <div className="dresscode-column">
                        <div className="dresscode-image-container">
                          <img src={dresscodeInfo.image} alt={dresscodeInfo.description} />
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
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Dyrygent:</span>
                <p>{event.conductor && `${event.conductor.firstName} ${event.conductor.lastName}`}</p>
              </div>
          </div>
          {event.description && (
            <div className="event-extra-info">
              <strong>Opis:</strong>
              <p>{event.description}</p>
            </div>
          )}
          {event.schedule && (
            <div className="event-extra-info">
              <h3>Harmonogram</h3>
              {Array.isArray(event.schedule) && event.schedule.length > 0 ? (
                <ul>
                  {event.schedule.map((item, index) => (
                    <li key={index}>
                      <strong>{item.time}</strong> - {item.activity}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{event.schedule && !Array.isArray(event.schedule) ? event.schedule : 'Brak szczegółowego harmonogramu.'}</p>
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

        {/* Czat Wydarzenia */}
        <div className="chat-card">
            <h2>💬 Czat Wydarzenia</h2>
            <div className="chat-messages">
              {messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`chat-message ${
                    msg.userId._id === user.id ? "my-message" : "other-message"
                  }`}
                >
                    <div className="message-header">
                    <strong>{msg.userId.name}</strong>
                      <span className="message-time">
                      {new Date(msg.createdAt).toLocaleString("pl-PL")}
                      </span>
                    </div>
                  <p className={`message-content ${msg.isDeleted ? 'deleted-message' : ''}`}>
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
                  {/* Status przeczytania - tylko dla wiadomości dyrygenta */}
                  {msg.readBy && msg.userId._id === user.id && (
                      <div className="message-read-status">
                        {(() => {
                          // Znajdź kto NIE przeczytał
                        const allParticipants = msg.allParticipants || [];
                        const readByNames = msg.readBy.map(
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
                                ✅ Wszyscy przeczytali ({msg.readCount}/
                                {msg.participantCount})
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

                  // Sortowanie po statusie (Zaakceptowano > Oczekująca > Odrzucono)
                  const statusOrder = { "Zaakceptowano": 1, "Oczekująca": 2, "Odrzucono": 3 };
                  const orderA = statusOrder[statusA] || 4;
                  const orderB = statusOrder[statusB] || 4;
                  
                  if (orderA !== orderB) {
                    return orderA - orderB;
                  }
                  
                  // Jeśli statusy są takie same, sortuj po instrumentach
                  const musicianA = a.userId;
                  const musicianB = b.userId;
                  
                  const instrumentA = musicianA.instrument?.toLowerCase() || '';
                  const instrumentB = musicianB.instrument?.toLowerCase() || '';
                  
                  const indexA = INSTRUMENT_ORDER.indexOf(instrumentA);
                  const indexB = INSTRUMENT_ORDER.indexOf(instrumentB);
                  
                  const effectiveIndexA = indexA === -1 ? Infinity : indexA;
                  const effectiveIndexB = indexB === -1 ? Infinity : indexB;
                  
                  if (effectiveIndexA !== effectiveIndexB) {
                    return effectiveIndexA - effectiveIndexB;
                  }

                  // Jeśli instrumenty też są takie same, sortuj po nazwisku
                  const lastNameA = getMusicianDisplayName(musicianA).split(' ')[0] || '';
                  const lastNameB = getMusicianDisplayName(musicianB).split(' ')[0] || '';
                  return lastNameA.localeCompare(lastNameB, 'pl', { sensitivity: 'base' });
                })
                .map((invitation, index) => {
                  const musician = invitation.userId;
                  if (!musician) return null;
                  
                  const status = getParticipationStatus(musician._id);
                  const isConfirmed = status === "Zaakceptowano";
                  
                  // Logika numerowania tylko dla potwierdzonych
                  const confirmedIndex = isConfirmed ? 
                    [...invitations]
                      .slice(0, index + 1)
                      .filter(inv => getParticipationStatus(inv.userId._id) === "Zaakceptowano")
                      .length
                    : null;

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
                        <div className="musician-name">
                          {isConfirmed && <span className="musician-number">{confirmedIndex}. </span>}
                          {getMusicianDisplayName(musician)}
                        </div>
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
                              cancelInvitation(invitation._id, getMusicianDisplayName(musician))
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
                                getMusicianDisplayName(musician)
                              )
                            }
                            className="btn-remove-participant"
                            title="Usuń z uczestników"
                          >
                            Usuń
                          </button>
                        )}
                        {status === "Zaakceptowano" && (
                          <button
                            onClick={() => openChatModal(musician)}
                            className="btn-private-message"
                            title={`Wiadomość do ${getMusicianDisplayName(musician)}`}
                          >
                            💬
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
                        checked={selectedMusicians.includes(musician._id)}
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
                      />
                      <span className="musician-label">
                        {getMusicianDisplayName(musician)} ({musician.instrument || "Instrument nieznany"})
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
      <SuccessMessage message={successMessage} onClose={() => setSuccessMessage("")} />

      {/* Modal Czat Prywatny */}
      {isChatModalOpen && selectedParticipant && (
        <div className="modal-overlay" onClick={closeChatModal}>
          <div className="modal-content chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Wiadomość do: {getMusicianDisplayName(selectedParticipant)}</h2>
              <button className="modal-close" onClick={closeChatModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <ChatWindow
                participantId={selectedParticipant._id}
                eventId={id}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetails;
