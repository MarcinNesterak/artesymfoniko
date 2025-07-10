import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';
import { privateMessagesAPI } from '../../services/messagesAPI';

const NewMessageComposer = ({ onMessageSent, userRole }) => {
  const [musicians, setMusicians] = useState([]);
  const [conductor, setConductor] = useState(null);
  const [selectedMusician, setSelectedMusician] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await usersAPI.getMusicians(); // Ta funkcja pobiera wszystkich użytkowników
        const allUsers = response.musicians || [];
        
        if (userRole === 'conductor') {
          setMusicians(allUsers.filter(user => user.role === 'musician' && user.active));
        } else if (userRole === 'musician') {
          const foundConductor = allUsers.find(user => user.role === 'conductor');
          if (foundConductor) {
            setConductor(foundConductor);
          } else {
            setError('Nie znaleziono dyrygenta.');
          }
        }
      } catch (err) {
        setError('Nie udało się wczytać listy użytkowników.');
        console.error(err);
      }
    };
    fetchUsers();
  }, [userRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const recipientId = userRole === 'conductor' ? selectedMusician : conductor?._id;

    if (!recipientId || !messageContent.trim()) {
      setError('Proszę wybrać odbiorcę i wpisać treść wiadomości.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await privateMessagesAPI.sendMessage(recipientId, messageContent.trim());
      if (onMessageSent) {
        onMessageSent(recipientId);
      }
    } catch (err) {
      setError('Błąd podczas wysyłania wiadomości.');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="new-message-composer">
      <h3>Nowa wiadomość</h3>
      <form onSubmit={handleSubmit} className="new-message-form">
        <div className="form-group">
          <label htmlFor="recipient">Do:</label>
          {userRole === 'conductor' ? (
            <select
              id="recipient"
              value={selectedMusician}
              onChange={(e) => setSelectedMusician(e.target.value)}
              required
            >
              <option value="" disabled>Wybierz muzyka z listy...</option>
              {musicians.map(m => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          ) : conductor ? (
            <div className="recipient-display">{conductor.name}</div>
          ) : (
            <div className="recipient-display">Ładowanie...</div>
          )}
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