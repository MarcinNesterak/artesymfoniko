import React from 'react';
import './SuccessMessage.css';

const SuccessMessage = ({ message, onClose }) => {
  if (!message) return null;
  return (
    <div className="success-message" onClick={onClose}>
      {message}
    </div>
  );
};

export default SuccessMessage; 