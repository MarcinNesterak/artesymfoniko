import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { eventsAPI } from "../../services/api";
import EventCard from "../common/EventCard";
import "../../styles/dashboard.css";
import SuccessMessage from '../common/SuccessMessage';

const ConductorDashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError("");

      // Pobierz nieznarchiwizowane wydarzenia
      const response = await eventsAPI.getEvents(false);
      setEvents(response.events || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      setError(
        "Nie udało się pobrać listy wydarzeń. Spróbuj odświeżyć stronę."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventToDelete) => {
    const confirmMessage = `Czy na pewno chcesz USUNĄĆ wydarzenie "${eventToDelete.title}"?\n\n⚠️ UWAGA: Ta operacja jest nieodwracalna!\n\nWydarzenie zostanie całkowicie usunięte z systemu i zniknie dla wszystkich muzyków.\n\nAby potwierdzić, wpisz: USUŃ`;

    const userInput = prompt(confirmMessage);

    if (userInput !== "USUŃ") {
      if (userInput !== null) {
        setError("Usuwanie anulowane. Aby usunąć wydarzenie, musisz wpisać dokładnie: USUŃ");
        setTimeout(() => setError(""), 3500);
      }
      return;
    }

    try {
      await eventsAPI.deleteEvent(eventToDelete._id);
      setSuccessMessage("Wydarzenie zostało pomyślnie usunięte.");
      setTimeout(() => setSuccessMessage(""), 3500);

      // Odśwież listę wydarzeń
      fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      setError("Wystąpił błąd podczas usuwania wydarzenia. Spróbuj ponownie.");
      setTimeout(() => setError(""), 3500);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await eventsAPI.getBackup();

      // Utwórz plik JSON do pobrania
      const dataStr = JSON.stringify(response, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Pobierz plik
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-orkiestra-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Zwolnij pamięć
      URL.revokeObjectURL(url);

      setSuccessMessage(
        `✅ Kopia zapasowa została pobrana!\n\nLiczba danych:\n- Użytkownicy: ${response.counts.users}\n- Wydarzenia: ${response.counts.events}\n- Wiadomości: ${response.counts.messages}\n- Uczestnictwa: ${response.counts.participations}`
      );
      setTimeout(() => setSuccessMessage(""), 3500);
    } catch (error) {
      console.error("Backup error:", error);
      setError("❌ Błąd podczas tworzenia kopii zapasowej");
      setTimeout(() => setError(""), 3500);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset input
    event.target.value = "";

    setRestoreLoading(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      // Sprawdź czy to prawidłowy backup
      if (!backupData.users || !backupData.events) {
        throw new Error("Nieprawidłowy format pliku backup");
      }

      const confirmed = window.confirm(
        `⚠️ UWAGA!\n\nPrzywrócenie kopii zapasowej:\n- USUNIE wszystkie obecne dane\n- Przywróci dane z: ${
          backupData.createdAt
        }\n- Liczba użytkowników: ${
          backupData.counts?.users || 0
        }\n- Liczba wydarzeń: ${
          backupData.counts?.events || 0
        }\n\nCzy na pewno chcesz kontynuować?`
      );

      if (!confirmed) {
        setRestoreLoading(false);
        return;
      }

      await eventsAPI.restoreBackup(backupData);
      setSuccessMessage(
        "✅ Kopia zapasowa została przywrócona!\n\nOdśwież stronę, aby zobaczyć zmiany."
      );
      setTimeout(() => setSuccessMessage(""), 3500);

      // Odśwież dane
      fetchEvents();
    } catch (error) {
      console.error("Restore error:", error);
      setError("❌ Błąd podczas przywracania kopii zapasowej");
      setTimeout(() => setError(""), 3500);
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Panel Dyrygenta</h1>
        <div className="dashboard-actions">
          <Link to="/conductor/archive" className="btn-secondary">
            Archiwum
          </Link>
          <Link to="/conductor/create-event" className="btn-primary">
            Utwórz nowe wydarzenie
          </Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-section">
        <h2>Aktualne Wydarzenia</h2>

        {loading ? (
          <p>Ładowanie wydarzeń...</p>
        ) : events.length > 0 ? (
          <div className="events-grid">
            {events.map((event) => (
              <EventCard
                key={event._id}
                event={event}
                linkTo={`/conductor/events/${event._id}`}
                showDeleteButton={true}
                onDelete={handleDeleteEvent}
              />
            ))}
          </div>
        ) : (
          <p>Nie masz aktualnych wydarzeń. Utwórz swoje pierwsze wydarzenie!</p>
        )}
      </div>
      {/* Admin Footer - tylko desktop */}
      <div className="admin-footer">
        <h3>🔧 Narzędzia administratora</h3>
        <div className="admin-buttons">
          <button
            onClick={handleBackup}
            className="btn-backup"
            disabled={backupLoading}
          >
            {backupLoading ? "⏳ Tworzenie..." : "💾 Pobierz kopię zapasową"}
          </button>
          <button
            onClick={() => document.getElementById("restore-file").click()}
            className="btn-restore"
            disabled={restoreLoading}
          >
            {restoreLoading
              ? "⏳ Przywracanie..."
              : "📥 Przywróć kopię zapasową"}
          </button>
          <input
            id="restore-file"
            type="file"
            accept=".json"
            onChange={handleRestore}
            style={{ display: "none" }}
          />
        </div>
      </div>
      <SuccessMessage message={successMessage} onClose={() => setSuccessMessage("")} />
    </div>
  );
};

export default ConductorDashboard;
