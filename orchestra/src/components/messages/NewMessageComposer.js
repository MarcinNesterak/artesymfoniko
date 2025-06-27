import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';
import { privateMessagesAPI } from '../../services/messagesAPI';

const NewMessageComposer = ({ onMessageSent }) => {
  const [musicians, setMusicians] = useState([]);
  const [selectedMusician, setSelectedMusician] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMusicians = async () => {
      try {
        const response = await usersAPI.getMusicians();
        const musiciansList = response.musicians || [];
        setMusicians(musiciansList.filter(user => user.role === 'musician' && user.active));
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
      if (onMessageSent) {
        onMessageSent(selectedMusician);
      }
    } catch (err) {
      setError('Błąd podczas wysyłania wiadomości.');
      console.error(err);
      setLoading(false);
    }
    // `setLoading(false)` nie jest tutaj potrzebne, bo komponent zostanie zastąpiony
  };

  return (
    <div className="new-message-composer">
      <h3>Nowa wiadomość</h3>
      <form onSubmit={handleSubmit} className="new-message-form">
        <div className="form-group">
          <label htmlFor="musician-select">Do:</label>
          <select
            id="musician-select"
            value={selectedMusician}
            onChange={(e) => setSelectedMusician(e.target.value)}
            required
          >
            <option value="" disabled>Wybierz muzyka z listy...</option>
            {musicians.map(m => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="message-content">Wiadomość:</label>
          <textarea
            id="message-content"
            rows="10"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Wpisz treść wiadomości..."
            required
          ></textarea>
        </div>
        {error && <p className="error-message-small">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Wysyłanie...' : 'Wyślij wiadomość'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewMessageComposer; 