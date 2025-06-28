import React, { useEffect } from 'react';
import './SuccessMessage.css';

const SuccessMessage = ({ message, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, onClose, duration]);

  if (!message) return null;

  return (
    <div className="success-message" onClick={onClose}>
      <span className="success-message-text">{message}</span>
      <button className="success-message-close" onClick={onClose}>&times;</button>
    </div>
  );
};

export default SuccessMessage;