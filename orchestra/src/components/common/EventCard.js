import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/eventCard.css';

const EventCard = ({ event, linkTo, showDeleteButton = false, onDelete }) => {
  // Format date - obsługa MongoDB date format
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
  
  const handleDeleteClick = (e) => {
    e.preventDefault(); // Zapobiega nawigacji po kliknięciu delete
    e.stopPropagation();
    
    if (onDelete) {
      onDelete(event);
    }
  };
  
  return (
    <div className="event-card-wrapper">
      <Link to={linkTo} className="event-card-link">
        <div className="event-card">
          <div className="event-card-header">
            <h3>{event.title}</h3>
          </div>
          
          <div className="event-card-body">
            <div className="event-info">
              <div className="event-date">
                <i className="event-icon">📅</i>
                <span>{formatDate(event.date)}</span>
              </div>
              
              <div className="event-description">
                {event.description && event.description.length > 100 
                  ? `${event.description.substring(0, 100)}...` 
                  : event.description}
              </div>
            </div>
          </div>
          
          <div className="event-card-footer">
            <span className="view-details">Zobacz szczegóły →</span>
          </div>
        </div>
      </Link>
      
      {showDeleteButton && (
        <button 
          onClick={handleDeleteClick}
          className="btn-delete-card"
          title="Usuń wydarzenie"
        >
          🗑️
        </button>
      )}
    </div>
  );
};

export default EventCard;