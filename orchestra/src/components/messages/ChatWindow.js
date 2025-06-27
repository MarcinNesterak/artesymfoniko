import React, { useState, useEffect, useRef } from 'react';
import { privateMessagesAPI } from '../../services/messagesAPI';
import { storage } from '../../services/api';

const ChatWindow = ({ participantId, eventId = null }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const currentUser = storage.getUser();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!participantId) return;

    const fetchMessages = async () => {
      setLoading(true);
      setError('');
      try {
        const history = await privateMessagesAPI.getConversationHistory(participantId);
        setMessages(history);
        
        // Oznacz wiadomości jako przeczytane i wyślij sygnał do odświeżenia licznika
        await privateMessagesAPI.markAsRead(participantId);
        window.dispatchEvent(new CustomEvent('unreadCountUpdated'));
      } catch (err) {
        setError('Nie udało się załadować wiadomości.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [participantId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setError('');

      const sentMessage = await privateMessagesAPI.sendMessage(
        participantId,
        newMessage.trim(),
        eventId
      );

      setMessages(prevMessages => [...prevMessages, sentMessage]);
      setNewMessage('');
    } catch (err) {
      setError('Błąd podczas wysyłania wiadomości.');
      console.error(err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Czy na pewno chcesz usunąć tę wiadomość?')) {
      try {
        await privateMessagesAPI.deleteMessage(messageId);
        setMessages(prevMessages => prevMessages.filter(msg => msg._id !== messageId));
      } catch (err) {
        setError('Błąd podczas usuwania wiadomości.');
        console.error(err);
      }
    }
  };

  if (!participantId) {
    // Ten widok jest już w MessagesPage, ale dla pewności
    return <div className="no-conversation-selected">Wybierz konwersację</div>;
  }
  
  if (loading) {
    return <div className="loading">Wczytywanie wiadomości...</div>;
  }

  return (
    <div className="chat-window">
      <div className="chat-messages-container">
        {messages.map(msg => (
          <div key={msg._id} className={`chat-bubble-wrapper ${msg.senderId._id === currentUser.id ? 'sent' : 'received'}`}>
            {msg.eventId && (
              <div className="event-context-tag">
                Dotyczy wydarzenia: <strong>{msg.eventId.title}</strong>
              </div>
            )}
            <div className={`chat-bubble ${msg.senderId._id === currentUser.id ? 'sent' : 'received'}`}>
              <p className="message-text">{msg.content}</p>
              <span className="message-timestamp">{new Date(msg.createdAt).toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})}</span>
            </div>
            {msg.senderId._id === currentUser.id && (
              <button onClick={() => handleDeleteMessage(msg._id)} className="delete-message-btn">
                &times;
              </button>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="chat-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Napisz wiadomość..."
          className="chat-input"
        />
        <button type="submit" className="send-button">Wyślij</button>
      </form>
      {error && <p className="error-message-small">{error}</p>}
    </div>
  );
};

export default ChatWindow; 