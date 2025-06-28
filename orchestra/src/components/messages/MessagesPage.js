import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { privateMessagesAPI } from '../../services/messagesAPI';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import NewMessageComposer from './NewMessageComposer';
import '../../styles/messages.css'; // Ten plik też za chwilę stworzymy

const MessagesPage = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();
  const isComposing = selectedConversationId === 'new';

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
    const params = new URLSearchParams(location.search);
    const preselectId = params.get('with');
    if (preselectId) {
      setSelectedConversationId(preselectId);
    }
    fetchConversations();
  }, [location.search, fetchConversations]);

  useEffect(() => {
    const handleUnreadUpdate = (event) => {
      const readConversationParticipantId = event.detail?.conversationWith;
      if (readConversationParticipantId) {
        setConversations(prev =>
          prev.map(conv =>
            String(conv.participant._id) === String(readConversationParticipantId)
              ? { ...conv, unreadCount: 0 }
              : conv
          )
        );
      }
    };

    window.addEventListener('unreadCountUpdated', handleUnreadUpdate);
    return () => {
      window.removeEventListener('unreadCountUpdated', handleUnreadUpdate);
    };
  }, []);

  const handleStartNewMessage = () => {
    setSelectedConversationId('new');
  };

  const handleMessageSent = (recipientId) => {
    // Po wysłaniu wiadomości, odświeżamy listę i przechodzimy do nowej konwersacji
    fetchConversations().then(() => {
       navigate(`/conductor/messages?with=${recipientId}`);
       setSelectedConversationId(recipientId);
    });
  };

  const handleSelectConversation = (participantId) => {
    setSelectedConversationId(participantId);
    // Usuwamy parametr 'with' z URL, jeśli użytkownik kliknie inną konwersację
    if (location.search.includes('with=')) {
        navigate(location.pathname);
    }
  };

  const displayedConversations = isComposing 
    ? [{ _id: 'new', participant: { _id: 'new', name: 'Nowa wiadomość' }, content: 'Wybierz odbiorcę...' }, ...conversations] 
    : conversations;

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
          <button className="new-message-btn" onClick={handleStartNewMessage}>Nowa wiadomość</button>
        </div>
        <ConversationList
          conversations={displayedConversations}
          onSelectConversation={handleSelectConversation}
          selectedConversationId={selectedConversationId}
        />
      </div>
      <div className="chat-window-panel">
        {isComposing ? (
          <NewMessageComposer onMessageSent={handleMessageSent} />
        ) : selectedConversationId ? (
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
                <p>Kliknij "Nowa wiadomość", aby rozpocząć rozmowę.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage; 