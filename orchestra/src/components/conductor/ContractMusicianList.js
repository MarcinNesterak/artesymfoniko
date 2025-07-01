import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsAPI, usersAPI } from '../../services/api';
import SuccessMessage from '../common/SuccessMessage';
import '../../styles/forms.css';
import '../../styles/manageMusicians.css';

// Ponieważ edycja api.js się nie powiodła, definiujemy funkcje API lokalnie
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://artesymfoniko-production.up.railway.app";
const getAuthToken = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user).token : null;
};

const updateParticipationFee = async (id, fee) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/events/participations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ fee }),
  });
  if (!response.ok) throw new Error((await response.json()).message || 'Błąd zapisu wynagrodzenia');
  return response.json();
};

const createContract = async (contractData) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/events/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(contractData),
    });
    if (!response.ok) throw new Error((await response.json()).message || 'Błąd tworzenia umowy');
    return response.json();
};
// Koniec lokalnych funkcji API

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
  const [bulkFee, setBulkFee] = useState('');
  
  const [showBulkGenerateForm, setShowBulkGenerateForm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [conductorData, setConductorData] = useState({
    zamawiajacy: 'MIECZYSŁAW SMYDA AGENCJA ARTYSTYCZNA VIOLIN & CLASSIC',
    siedziba: 'Powroźnik 123',
    kodPocztowy: '33-370',
    poczta: 'Muszyna',
    nip: '734-145-41-48',
    regon: '492698947',
    reprezentant: 'Mieczysław Smyda'
  });

  const calculateFinancials = useCallback((brutto) => {
    const wynagrodzenieBrutto = parseFloat(brutto) || 0;
    const kosztyUzyskaniaPrzychodu = wynagrodzenieBrutto * 0.50;
    const podstawaOpodatkowania = Math.round(wynagrodzenieBrutto - kosztyUzyskaniaPrzychodu);
    const zaliczkaNaPodatek = Math.round(podstawaOpodatkowania * 0.12);
    const wynagrodzenieNetto = wynagrodzenieBrutto - zaliczkaNaPodatek;
    return {
        wynagrodzenieBrutto,
        kosztyUzyskaniaPrzychodu: kosztyUzyskaniaPrzychodu.toFixed(2),
        podstawaOpodatkowania,
        zaliczkaNaPodatek: zaliczkaNaPodatek.toFixed(2),
        wynagrodzenieNetto: wynagrodzenieNetto.toFixed(2),
    };
  }, []);

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
      fetchEventData(); 
    } catch (err) {
      setError(err.message || 'Nie udało się zapisać wynagrodzenia.');
    } finally {
      setSavingFee(null);
    }
  };
  
  const handleSetBulkFee = () => {
    if (bulkFee === '' || isNaN(parseFloat(bulkFee))) {
      setError('Proszę wprowadzić poprawną kwotę hurtową.');
      return;
    }
    const newFees = { ...fees };
    participants.forEach(p => {
      newFees[p._id] = bulkFee;
    });
    setFees(newFees);
    setError('');
  };

  const handleConductorDataChange = (e) => {
    const { name, value } = e.target;
    setConductorData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateAllContracts = async () => {
    const participantsToProcess = participants.filter(p => (p.contractStatus === 'pending' || !p.contractStatus) && fees[p._id] > 0);
    
    if (participantsToProcess.length === 0) {
        setError("Brak muzyków, dla których można wygenerować nowe umowy (sprawdź czy kwoty są ustawione i czy umowy już nie istnieją).");
        return;
    }

    if (!window.confirm(`Czy na pewno chcesz wygenerować ${participantsToProcess.length} umów?`)) {
        return;
    }

    setIsGenerating(true);
    setError('');
    setSuccessMessage('');

    const promises = participantsToProcess.map(async (p) => {
        const musicianDetails = await usersAPI.getMusician(p.userId._id);
        const financials = calculateFinancials(fees[p._id]);

        const contractData = {
            eventId,
            participationId: p._id,
            zamawiajacy: {
                nazwa: conductorData.zamawiajacy,
                adres: `${conductorData.siedziba}, ${conductorData.kodPocztowy} ${conductorData.poczta}`,
                nip: conductorData.nip,
                regon: conductorData.regon,
                reprezentant: conductorData.reprezentant,
            },
            wykonawca: {
                imieNazwisko: musicianDetails.user.name,
                adres: musicianDetails.user.personalData?.address ? `${musicianDetails.user.personalData.address.street}, ${musicianDetails.user.personalData.address.postalCode} ${musicianDetails.user.personalData.address.city}` : '',
                pesel: musicianDetails.user.personalData?.pesel || '',
                numerKonta: musicianDetails.user.personalData?.bankAccountNumber || '',
            },
            numerUmowy: `UOD/${event.title.replace(/\s+/g, '-')}/${p.userId.name.replace(/\s+/g, '_')}/${new Date().getFullYear()}`,
            miejsceZawarcia: 'Kraków',
            dataZawarcia: new Date().toISOString().split('T')[0],
            dataWykonaniaDziela: new Date(event.date).toISOString().split('T')[0],
            przedmiotUmowy: `Wykonanie partii ${p.userId.instrument} podczas koncertu "${event.title}"`,
            ...financials,
        };
        return createContract(contractData);
    });

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    setSuccessMessage(`Operacja zakończona. Pomyślnie utworzono: ${successful}. Nie udało się: ${failed}.`);
    if(failed > 0) {
        setError(`Niektóre umowy nie mogły zostać utworzone. Sprawdź konsolę lub dane muzyków.`);
        console.error("Błędy przy generowaniu umów:", results.filter(r => r.status === 'rejected').map(r => r.reason));
    }

    setIsGenerating(false);
    setShowBulkGenerateForm(false);
    fetchEventData();
  };

  if (loading) return <div className="loading">Ładowanie...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="container manage-musicians-container">
      <button onClick={() => navigate(-1)} className="back-button">Powrót</button>
      <h1>Zarządzanie umowami dla wydarzenia</h1>
      <h2>{event?.title}</h2>
      
      <SuccessMessage message={successMessage} onClose={() => setSuccessMessage('')} />

      <div className="bulk-fee-section">
        <input 
          type="number"
          value={bulkFee}
          onChange={(e) => setBulkFee(e.target.value)}
          placeholder="Wpisz ogólną kwotę"
          className="fee-input"
        />
        <button onClick={handleSetBulkFee} className="button-secondary">Ustaw wszystkim</button>
        <button 
            onClick={() => setShowBulkGenerateForm(!showBulkGenerateForm)} 
            className="button-primary"
        >
            {showBulkGenerateForm ? 'Anuluj' : 'Generuj wszystkie umowy'}
        </button>
      </div>
      
      {showBulkGenerateForm && (
        <div className="bulk-generate-form">
            <h3>Dane Zamawiającego do umów</h3>
            <p>Poniższe dane zostaną użyte we wszystkich generowanych umowach. Możesz je edytować.</p>
            <div className="form-grid">
                <input type="text" name="zamawiajacy" value={conductorData.zamawiajacy} onChange={handleConductorDataChange} placeholder="Zamawiający" />
                <input type="text" name="reprezentant" value={conductorData.reprezentant} onChange={handleConductorDataChange} placeholder="Reprezentant" />
                <input type="text" name="siedziba" value={conductorData.siedziba} onChange={handleConductorDataChange} placeholder="Siedziba (ulica, numer)" />
                <input type="text" name="kodPocztowy" value={conductorData.kodPocztowy} onChange={handleConductorDataChange} placeholder="Kod pocztowy" />
                <input type="text" name="poczta" value={conductorData.poczta} onChange={handleConductorDataChange} placeholder="Poczta" />
                <input type="text" name="nip" value={conductorData.nip} onChange={handleConductorDataChange} placeholder="NIP" />
                <input type="text" name="regon" value={conductorData.regon} onChange={handleConductorDataChange} placeholder="REGON" />
            </div>
            <button onClick={handleGenerateAllContracts} className="button-success" disabled={isGenerating}>
                {isGenerating ? 'Generowanie...' : `Potwierdź i generuj umowy`}
            </button>
        </div>
      )}

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