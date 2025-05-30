import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsAPI, usersAPI } from '../../services/api';
import '../../styles/eventDetails.css';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [allMusicians, setAllMusicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    date: '',
    description: '',
    schedule: '',
    program: ''
  });
  
  useEffect(() => {
    fetchEventData();
  }, [id]);
  
  const fetchEventData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Pobierz szczegóły wydarzenia (zawiera invitations i participations)
      const eventResponse = await eventsAPI.getEvent(id);
      setEvent(eventResponse.event);
      setInvitations(eventResponse.invitations || []);
      setParticipations(eventResponse.participations || []);
      
      // Ustaw dane do edycji
      const eventData = eventResponse.event;
      setEditData({
        title: eventData.title || '',
        date: eventData.date ? new Date(eventData.date).toISOString().slice(0, 16) : '',
        description: eventData.description || '',
        schedule: eventData.schedule || '',
        program: eventData.program || ''
      });
      
      // Pobierz wszystkich muzyków dla selecta
      const musiciansResponse = await usersAPI.getMusicians();
      setAllMusicians(musiciansResponse.musicians || []);
    } catch (error) {
      console.error('Error fetching event data:', error);
      setError('Wystąpił błąd podczas pobierania danych. Spróbuj odświeżyć stronę.');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('pl-PL', options);
  };
  
  const handleEditEvent = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    
    try {
      const updateData = {
        title: editData.title,
        date: editData.date,
        description: editData.description,
        schedule: editData.schedule,
        program: editData.program
      };
      
      await eventsAPI.updateEvent(id, updateData);
      
      // Odśwież dane wydarzenia
      await fetchEventData();
      
      setShowEditModal(false);
      alert('Wydarzenie zostało zaktualizowane pomyślnie!');
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Wystąpił błąd podczas aktualizacji wydarzenia.');
    } finally {
      setEditLoading(false);
    }
  };
  
  const handleDeleteEvent = async () => {
    const confirmMessage = `Czy na pewno chcesz USUNĄĆ wydarzenie "${event.title}"?\n\n⚠️ UWAGA: Ta operacja jest nieodwracalna!\n\nWydarzenie zostanie całkowicie usunięte z systemu i zniknie dla wszystkich muzyków.\n\nAby potwierdzić, wpisz: USUŃ`;
    
    const userInput = prompt(confirmMessage);
    
    if (userInput !== 'USUŃ') {
      if (userInput !== null) {
        alert('Usuwanie anulowane. Aby usunąć wydarzenie, musisz wpisać dokładnie: USUŃ');
      }
      return;
    }
    
    try {
      setLoading(true);
      
      await eventsAPI.deleteEvent(id);
      
      alert('Wydarzenie zostało pomyślnie usunięte.');
      navigate('/conductor/dashboard');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Wystąpił błąd podczas usuwania wydarzenia. Spróbuj ponownie.');
      setLoading(false);
    }
  };
  
  const sendInvitation = async (musicianId) => {
    try {
      // Sprawdź czy muzyk już został zaproszony
      const alreadyInvited = invitations.some(inv => inv.userId._id === musicianId);
      if (alreadyInvited) {
        alert('Ten muzyk już został zaproszony.');
        return;
      }
      
      await eventsAPI.inviteMusicians(id, [musicianId]);
      alert('Zaproszenie zostało wysłane.');
      
      // Odśwież dane wydarzenia
      fetchEventData();
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Wystąpił błąd podczas wysyłania zaproszenia.');
    }
  };
  
  const cancelInvitation = async (invitationId, musicianName) => {
    if (!window.confirm(`Czy na pewno chcesz odwołać zaproszenie dla ${musicianName}?`)) {
      return;
    }
    
    try {
      // Wywołaj endpoint do odwołania zaproszenia
      await eventsAPI.cancelInvitation(id, invitationId);
      alert('Zaproszenie zostało odwołane.');
      
      // Odśwież dane wydarzenia
      fetchEventData();
    } catch (error) {
      console.error('Error canceling invitation:', error);
      alert('Wystąpił błąd podczas odwoływania zaproszenia.');
    }
  };
  
  const removeParticipant = async (participantId, musicianName) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć ${musicianName} z uczestników wydarzenia?`)) {
      return;
    }
    
    try {
      // Wywołaj endpoint do usunięcia uczestnika
      await eventsAPI.removeParticipant(id, participantId);
      alert('Uczestnik został usunięty z wydarzenia.');
      
      // Odśwież dane wydarzenia
      fetchEventData();
    } catch (error) {
      console.error('Error removing participant:', error);
      alert('Wystąpił błąd podczas usuwania uczestnika.');
    }
  };
  
  const getParticipationStatus = (userId) => {
    // Sprawdź czy muzyk odpowiedział na zaproszenie
    const participation = participations.find(p => p.userId._id === userId);
    if (participation) {
      return participation.status === 'confirmed' ? 'Zaakceptowano' : 'Odrzucono';
    }
    
    // Sprawdź czy muzyk został zaproszony
    const invitation = invitations.find(inv => inv.userId._id === userId);
    if (invitation) {
      return 'Oczekująca';
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
  
  const invitedMusicianIds = invitations.map(inv => inv.userId._id);
  const availableMusicians = allMusicians.filter(m => !invitedMusicianIds.includes(m._id));
  
  return (
    <div className="event-details">
      <div className="event-details-header">
        <h1>{event.title}</h1>
        <div className="event-actions">
          <button onClick={() => navigate('/conductor/dashboard')} className="btn-back">
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
                  onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
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
                  onChange={(e) => setEditData(prev => ({ ...prev, date: e.target.value }))}
                  disabled={editLoading}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="edit-description">Opis wydarzenia</label>
                <textarea
                  id="edit-description"
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
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
                  onChange={(e) => setEditData(prev => ({ ...prev, schedule: e.target.value }))}
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
                  onChange={(e) => setEditData(prev => ({ ...prev, program: e.target.value }))}
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
                  {editLoading ? 'Zapisywanie...' : 'Zapisz Zmiany'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <div className="event-details-content">
        <div className="event-info-section">
          <div className="event-info-card">
            <h2>Informacje o wydarzeniu</h2>
            
            <div className="info-item">
              <strong>Data i godzina:</strong>
              <span>{formatDate(event.date)}</span>
            </div>
            
            {event.description && (
              <div className="info-item">
                <strong>Opis:</strong>
                <p>{event.description}</p>
              </div>
            )}
            
            {event.schedule && (
              <div className="info-item">
                <strong>Harmonogram:</strong>
                <pre>{event.schedule}</pre>
              </div>
            )}
            
            {event.program && (
              <div className="info-item">
                <strong>Program:</strong>
                <pre>{event.program}</pre>
              </div>
            )}
          </div>
        </div>
        
        <div className="event-musicians-section">
          <div className="musicians-card">
            <h2>Zaproszeni muzycy</h2>
            
            {invitations.length > 0 ? (
              <div className="musicians-list">
                {invitations.map(invitation => {
                  const musician = invitation.userId;
                  if (!musician) return null;
                  
                  const status = getParticipationStatus(musician._id);
                  const participation = participations.find(p => p.userId._id === musician._id);
                  let statusClass = 'status-pending';
                  
                  if (status === 'Zaakceptowano') {
                    statusClass = 'status-confirmed';
                  } else if (status === 'Odrzucono') {
                    statusClass = 'status-declined';
                  }
                  
                  return (
                    <div key={invitation._id} className="musician-item">
                      <div className="musician-info">
                        <div className="musician-name">{musician.name}</div>
                        <div className="musician-instrument">{musician.instrument || 'Instrument nieznany'}</div>
                      </div>
                      <div className={`invitation-status ${statusClass}`}>
                        {status}
                      </div>
                      <div className="musician-actions">
                        {status === 'Oczekująca' && (
                          <button
                            onClick={() => cancelInvitation(invitation._id, musician.name)}
                            className="btn-cancel-invitation"
                            title="Odwołaj zaproszenie"
                          >
                            Odwołaj
                          </button>
                        )}
                        {status === 'Zaakceptowano' && participation && (
                          <button
                            onClick={() => removeParticipant(participation._id, musician.name)}
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
                <select 
                  onChange={(e) => {
                    if (e.target.value) {
                      sendInvitation(e.target.value);
                      e.target.value = ''; // Reset select
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Wybierz muzyka</option>
                  {availableMusicians.map(musician => (
                    <option key={musician._id} value={musician._id}>
                      {musician.name} ({musician.instrument || 'Instrument nieznany'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;