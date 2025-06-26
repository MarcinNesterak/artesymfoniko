import React from 'react';

const ConversationList = ({ conversations, onSelectConversation, selectedConversationId }) => {

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Wczoraj';
    }
    return date.toLocaleDateString('pl-PL');
  };
  
  return (
    <div className="conversation-list">
      {conversations.map(conv => {
        const participantId = conv.participant._id;
        const isActive = selectedConversationId === participantId;
        
        return (
          <div
            key={conv._id}
            className={`conversation-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelectConversation(participantId)}
          >
            <div className="conversation-details">
              <span className="participant-name">{conv.participant.name}</span>
              <p className="last-message-preview">
                {conv.content}
              </p>
            </div>
            <div className="conversation-meta">
              <span className="timestamp">{formatTimestamp(conv.createdAt)}</span>
              {conv.unreadCount > 0 && (
                <span className="unread-badge">{conv.unreadCount}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  );
};

export default ConversationList; 