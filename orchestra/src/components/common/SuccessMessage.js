import React, { useState, useEffect } from 'react';
import './SuccessMessage.css';

const SuccessMessage = ({ message, onClose, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Ten useEffect zarządza cyklem życia komunikatu
  useEffect(() => {
    // Nie rób nic, jeśli nie ma wiadomości
    if (!message) {
      setIsVisible(false);
      return;
    }

    // 1. Pokaż komponent i uruchom animację wjazdu
    setIsVisible(true);

    // 2. Ustaw timer do ukrycia komponentu (uruchomienie animacji wyjazdu)
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    // 3. Ustaw timer do ostatecznego usunięcia z drzewa DOM po zakończeniu animacji
    const removeTimer = setTimeout(() => {
      onClose(); // Wywołuje setSuccessMessage("") w komponencie nadrzędnym
    }, duration + 400); // Czas trwania + czas animacji (400ms)

    // Funkcja czyszcząca
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [message, duration, onClose]);

  // Renderuj komponent tylko, jeśli jest w trakcie bycia widocznym
  // (potrzebne, aby animacja wyjścia mogła się dokończyć)
  if (!isVisible && !message) {
    return null;
  }

  return (
    <div
      className={`success-message ${isVisible ? 'visible' : ''}`}
      onClick={() => {
        setIsVisible(false);
        setTimeout(onClose, 400);
      }}
    >
      <span className="success-message-text">{message}</span>
      <button className="success-message-close" onClick={(e) => {
          e.stopPropagation(); // Zapobiegaj kliknięciu na tło
          setIsVisible(false);
          setTimeout(onClose, 400);
      }}>&times;</button>
    </div>
  );
};

export default SuccessMessage;