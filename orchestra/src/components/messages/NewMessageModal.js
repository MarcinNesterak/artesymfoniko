import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';
import { privateMessagesAPI } from '../../services/messagesAPI';
import '../../styles/messages.css'; 

const NewMessageModal = ({ onClose, onMessageSent }) => {
  const [musicians, setMusicians] = useState([]);
  const [selectedMusician, setSelectedMusician] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMusicians = async () => {
      try {
        const allUsers = await usersAPI.getMusicians();
        // Filtrujemy, aby zostawić tylko aktywnych muzyków
        setMusicians(allUsers.filter(user => user.role === 'musician' && user.active));
      } catch (err) {
        setError('Nie udało się wczytać listy muzyków.');
        console.error(err);
      }
    };
    fetchMusicians();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMusician || !messageContent.trim()) {
      setError('Proszę wybrać muzyka i wpisać treść wiadomości.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await privateMessagesAPI.sendMessage(selectedMusician, messageContent.trim());
      // Powiadom komponent nadrzędny o sukcesie
      if (onMessageSent) {
        onMessageSent();
      }
      onClose(); // Zamknij modal
    } catch (err) {
      setError('Błąd podczas wysyłania wiadomości.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content new-message-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nowa wiadomość</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="musician-select">Do:</label>
            <select
              id="musician-select"
              value={selectedMusician}
              onChange={(e) => setSelectedMusician(e.target.value)}
              required
            >
              <option value="" disabled>Wybierz muzyka...</option>
              {musicians.map(m => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="message-content">Wiadomość:</label>
            <textarea
              id="message-content"
              rows="8"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              required
            ></textarea>
          </div>
          {error && <p className="error-message">{error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Anuluj</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Wysyłanie...' : 'Wyślij'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewMessageModal; 