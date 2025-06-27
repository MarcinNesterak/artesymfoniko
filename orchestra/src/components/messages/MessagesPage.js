import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { privateMessagesAPI } from '../../services/messagesAPI';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import NewMessageModal from './NewMessageModal';
import '../../styles/messages.css'; // Ten plik też za chwilę stworzymy

const MessagesPage = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);

  const location = useLocation();

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedConversations = await privateMessagesAPI.getConversations();
      setConversations(fetchedConversations);
    } catch (err) {
      setError('Nie udało się załadować konwersacji. Spróbuj odświeżyć stronę.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Sprawdź, czy w URL jest parametr 'with' (przekierowanie z EventDetails)
    const params = new URLSearchParams(location.search);
    const preselectId = params.get('with');
    if (preselectId) {
      setSelectedConversationId(preselectId);
    }
    fetchConversations();
  }, [location.search, fetchConversations]);

  const handleSelectConversation = (participantId) => {
    setSelectedConversationId(participantId);
  };

  if (loading) {
    return <div className="loading">Ładowanie wiadomości...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="messages-page">
      <div className="conversations-list-panel">
        <div className="conversations-header">
          <h2>Konwersacje</h2>
          <button className="new-message-btn" onClick={() => setModalOpen(true)}>Nowa wiadomość</button>
        </div>
        <ConversationList
          conversations={conversations}
          onSelectConversation={handleSelectConversation}
          selectedConversationId={selectedConversationId}
        />
      </div>
      <div className="chat-window-panel">
        {selectedConversationId ? (
          <ChatWindow participantId={selectedConversationId} />
        ) : (
          <div className="no-conversation-selected">
            {conversations.length > 0 ? (
              <>
                <h2>Wybierz konwersację z listy</h2>
                <p>Aby rozpocząć, wybierz rozmowę z panelu po lewej stronie.</p>
              </>
            ) : (
              <>
                <h2>Brak konwersacji</h2>
                <p>Nie masz jeszcze żadnych wiadomości. Możesz rozpocząć rozmowę z muzykiem z widoku szczegółów wydarzenia.</p>
              </>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <NewMessageModal
          onClose={() => setModalOpen(false)}
          onMessageSent={() => {
            fetchConversations(); // Odśwież listę po wysłaniu
          }}
        />
      )}
    </div>
  );
};

export default MessagesPage; 