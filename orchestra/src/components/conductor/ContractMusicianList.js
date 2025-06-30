import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsAPI } from '../../services/api'; 
import SuccessMessage from '../common/SuccessMessage';
import '../../styles/forms.css';
import '../../styles/manageMusicians.css'; 

// Bezpośrednie wywołanie API jako obejście problemu z edycją api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://artesymfoniko-production.up.railway.app";

const getAuthToken = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user).token : null;
};

const updateParticipationFee = async (id, fee) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/events/participations/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ fee }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Błąd zapisu wynagrodzenia');
  }
  return response.json();
};
// --- Koniec obejścia ---

const ContractMusicianList = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [fees, setFees] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [savingFee, setSavingFee] = useState(null);

  const fetchEventData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const eventResponse = await eventsAPI.getEvent(eventId);
      const confirmedParticipants = eventResponse.participations.filter(p => p.status === 'confirmed');
      
      setEvent(eventResponse.event);
      setParticipants(confirmedParticipants);

      const initialFees = confirmedParticipants.reduce((acc, p) => {
        acc[p._id] = p.fee || '';
        return acc;
      }, {});
      setFees(initialFees);

    } catch (err) {
      setError('Nie udało się załadować danych wydarzenia.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const handleFeeChange = (participationId, value) => {
    setFees(prev => ({ ...prev, [participationId]: value }));
  };

  const handleSaveFee = async (participationId) => {
    const feeValue = fees[participationId];
    if (feeValue === undefined || feeValue === '' || isNaN(parseFloat(feeValue))) {
      setError('Proszę wprowadzić poprawną kwotę.');
      return;
    }

    setSavingFee(participationId);
    setError('');
    setSuccessMessage('');

    try {
      await updateParticipationFee(participationId, parseFloat(feeValue));
      setSuccessMessage('Wynagrodzenie zostało zapisane.');
      // Odśwież dane, aby upewnić się, że wszystko jest aktualne
      fetchEventData(); 
    } catch (err) {
      setError(err.message || 'Nie udało się zapisać wynagrodzenia.');
    } finally {
      setSavingFee(null);
    }
  };

  if (loading) return <div className="loading">Ładowanie...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="container manage-musicians-container">
      <button onClick={() => navigate(-1)} className="back-button">Powrót</button>
      <h1>Zarządzanie umowami dla wydarzenia</h1>
      <h2>{event?.title}</h2>
      
      <SuccessMessage message={successMessage} onClose={() => setSuccessMessage('')} />

      <div className="musicians-list">
        {participants.length > 0 ? (
          participants.map(p => (
            <div key={p._id} className="musician-card">
              <div className="musician-info">
                <strong>{p.userId.name}</strong> ({p.userId.instrument})
              </div>
              <div className="fee-management">
                <input
                  type="number"
                  value={fees[p._id]}
                  onChange={(e) => handleFeeChange(p._id, e.target.value)}
                  placeholder="Kwota brutto"
                  className="fee-input"
                  min="0"
                  disabled={savingFee === p._id}
                />
                <button
                  onClick={() => handleSaveFee(p._id)}
                  disabled={savingFee === p._id}
                  className="button-primary"
                >
                  {savingFee === p._id ? 'Zapisywanie...' : 'Zapisz kwotę'}
                </button>
                
                {p.contractStatus === 'ready' && p.contractId ? (
                  <button 
                    onClick={() => navigate(`/conductor/events/${p.eventId}/contracts/${p.contractId}`)}
                    className="button-success"
                  >
                    Zobacz umowę
                  </button>
                ) : (
                  <button 
                    onClick={() => navigate(`/conductor/event/${eventId}/contract/${p._id}/generate`)}
                    className="button-secondary"
                    disabled={!p.fee || p.fee === 0}
                  >
                    Generuj umowę
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p>Brak potwierdzonych uczestników w tym wydarzeniu.</p>
        )}
      </div>
    </div>
  );
};

export default ContractMusicianList; 