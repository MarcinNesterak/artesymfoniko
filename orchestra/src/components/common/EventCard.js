import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/eventCard.css";

const EventCard = ({ event, linkTo, showDeleteButton = false, onDelete, isContractView }) => {
  const userJson = localStorage.getItem("user");
  const user = userJson ? JSON.parse(userJson) : null;
  const navigate = useNavigate();

  // Zdefiniuj docelowy URL na podstawie widoku
  const targetUrl = isContractView
    ? `/conductor/event/${event._id}/contracts`
    : linkTo;

  // Format date - obsługa MongoDB date format
  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("pl-PL", options);
  };

  const handleCardClick = (e) => {
    // Zapobiegaj nawigacji, jeśli kliknięto w przycisk usuwania
    if (e.target.closest('.event-card-delete-button')) {
      return;
    }
    navigate(targetUrl);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Zapobiegaj propagacji kliknięcia do kontenera karty

    if (onDelete) {
      onDelete(event);
    }
  };

  return (
    <div className="event-card-wrapper">
      <Link to={targetUrl} className="event-card-link" onClick={handleCardClick}>
        <div className="event-card">
          <div className="event-card-header">
            <div className="event-title-with-notifications">
              <h3>{event.title}</h3>
              {event.notifications && (
                <div className="event-notifications">
                  {event.notifications.newMessages > 0 && (
                    <span className="notification-badge new-messages">
                      {event.notifications.newMessages} nowych
                    </span>
                  )}
                  {event.notifications.wasModified && (
                    <span className="notification-badge modified">
                      Zmieniono
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="event-card-body">
            <div className="event-info">
              <div className="event-date">
                <i className="event-icon">📅</i>
                <span>{formatDate(event.date)}</span>
              </div>

              <div className="event-location">
                <i className="event-icon">📍</i>
                <span>{event.location || 'Brak lokalizacji'}</span>
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
