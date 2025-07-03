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
  const [loading, setLoading] = useState(true);
  const [errorMessages, setErrorMessages] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState(new Set());
  
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
      setErrorMessages([]);
      const eventResponse = await eventsAPI.getEvent(eventId);
      const confirmedParticipants = eventResponse.participations.filter(p => p.status === 'confirmed');
      setEvent(eventResponse.event);
      setParticipants(confirmedParticipants);
    } catch (err) {
      setErrorMessages(['Nie udało się załadować danych wydarzenia.']);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const handleSelectionChange = (participationId) => {
    setSelectedParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participationId)) {
        newSet.delete(participationId);
      } else {
        newSet.add(participationId);
      }
      return newSet;
    });
  };

  const handleConductorDataChange = (e) => {
    const { name, value } = e.target;
    setConductorData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateAllContracts = async () => {
    const participantsToProcess = participants.filter(p => selectedParticipants.has(p._id) && (p.contractStatus === 'pending' || !p.contractStatus));
    
    if (participantsToProcess.length === 0) {
        setErrorMessages(["Wybierz przynajmniej jednego muzyka, który nie ma jeszcze gotowej umowy."]);
        return;
    }

    if (!window.confirm(`Czy na pewno chcesz wygenerować ${participantsToProcess.length} umów?`)) {
        return;
    }

    setIsGenerating(true);
    setErrorMessages([]);
    setSuccessMessage('');

    const promises = participantsToProcess.map(async (p) => {
        const musicianDetails = await usersAPI.getMusician(p.userId._id);
        
        if (!musicianDetails?.user) {
            return Promise.reject(new Error(`Nie udało się pobrać danych dla muzyka o ID uczestnictwa: ${p._id}`));
        }
        const musician = musicianDetails.user;

        const personalData = musician.personalData || {};
        const address = personalData.address || {};
        const missingFields = [];
        if (!musician.name) missingFields.push('imię i nazwisko');
        if (!address.street || !address.postalCode || !address.city) missingFields.push('pełny adres');
        if (!personalData.pesel) missingFields.push('PESEL');
        if (!personalData.bankAccountNumber) missingFields.push('numer konta');

        if (missingFields.length > 0) {
            return Promise.reject(new Error(`Brakujące dane dla ${musician.name}: ${missingFields.join(', ')}.`));
        }

        const financials = calculateFinancials(p.fee);

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
                imieNazwisko: musician.name,
                adres: musician.personalData?.address ? `${musician.personalData.address.street}, ${musician.personalData.address.postalCode} ${musician.personalData.address.city}` : '',
                pesel: musician.personalData?.pesel || '',
                numerKonta: musician.personalData?.bankAccountNumber || '',
            },
            numerUmowy: `UOD/${event.title.replace(/\s+/g, '-')}/${musician.name.replace(/\s+/g, '_')}/${new Date().getFullYear()}`,
            miejsceZawarcia: 'Kraków',
            dataZawarcia: new Date().toISOString().split('T')[0],
            dataWykonaniaDziela: new Date(event.date).toISOString().split('T')[0],
            przedmiotUmowy: `Wykonanie partii ${musician.instrument} podczas koncertu "${event.title}"`,
            ...financials,
        };
        return createContract(contractData);
    });

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failedPromises = results.filter(r => r.status === 'rejected');

    setSuccessMessage(`Operacja zakończona. Pomyślnie utworzono: ${successful}.`);
    
    if (failedPromises.length > 0) {
        const newErrorMessages = failedPromises.map(p => p.reason.message);
        setErrorMessages(newErrorMessages);
        console.error("Błędy przy generowaniu umów:", failedPromises.map(p => p.reason));
    }

    setIsGenerating(false);
    setShowBulkGenerateForm(false);
    fetchEventData();
  };

  if (loading) return <div className="loading">Ładowanie...</div>;
  if (errorMessages.length > 0) return (
      <div className="container">
          <div className="error-message">
              <h4>Wystąpiły błędy:</h4>
              <ul>
                  {errorMessages.map((msg, index) => <li key={index}>{msg}</li>)}
              </ul>
              <button onClick={() => setErrorMessages([])} className="button-secondary">Ukryj błędy</button>
          </div>
      </div>
  );

  return (
    <div className="container manage-musicians-container">
      <button onClick={() => navigate(-1)} className="back-button">Powrót</button>
      <h1>Zarządzanie umowami dla wydarzenia</h1>
      <h2>{event?.title}</h2>
      
      <SuccessMessage message={successMessage} onClose={() => setSuccessMessage('')} />

      {errorMessages.length > 0 && (
        <div className="error-message">
            <h4>Wystąpiły błędy:</h4>
            <ul>
                {errorMessages.map((msg, index) => <li key={index}>{msg}</li>)}
            </ul>
            <button onClick={() => setErrorMessages([])} className="button-secondary">Ukryj błędy</button>
        </div>
      )}

      <div className="contract-actions">
        {!showBulkGenerateForm ? (
          <button onClick={() => setShowBulkGenerateForm(true)} className="button-primary">
            Generuj wszystkie umowy
          </button>
        ) : (
          <div className="bulk-generate-form">
              <h3>Dane Zamawiającego do umów</h3>
              <p>Poniższe dane zostaną użyte we wszystkich generowanych umowach. Możesz je edytować.</p>
              <div className="form-grid">
                  <div className="form-group">
                      <label htmlFor="conductor-zamawiajacy">Zamawiający</label>
                      <input type="text" id="conductor-zamawiajacy" name="zamawiajacy" value={conductorData.zamawiajacy} onChange={handleConductorDataChange} placeholder="Zamawiający" />
                  </div>
                  <div className="form-group">
                      <label htmlFor="conductor-reprezentant">Reprezentant</label>
                      <input type="text" id="conductor-reprezentant" name="reprezentant" value={conductorData.reprezentant} onChange={handleConductorDataChange} placeholder="Reprezentant" />
                  </div>
                  <div className="form-group">
                      <label htmlFor="conductor-siedziba">Siedziba (ulica, numer)</label>
                      <input type="text" id="conductor-siedziba" name="siedziba" value={conductorData.siedziba} onChange={handleConductorDataChange} placeholder="Siedziba (ulica, numer)" />
                  </div>
                  <div className="form-group">
                      <label htmlFor="conductor-kod">Kod pocztowy</label>
                      <input type="text" id="conductor-kod" name="kodPocztowy" value={conductorData.kodPocztowy} onChange={handleConductorDataChange} placeholder="Kod pocztowy" />
                  </div>
                  <div className="form-group">
                      <label htmlFor="conductor-poczta">Poczta</label>
                      <input type="text" id="conductor-poczta" name="poczta" value={conductorData.poczta} onChange={handleConductorDataChange} placeholder="Poczta" />
                  </div>
                  <div className="form-group">
                      <label htmlFor="conductor-nip">NIP</label>
                      <input type="text" id="conductor-nip" name="nip" value={conductorData.nip} onChange={handleConductorDataChange} placeholder="NIP" />
                  </div>
                  <div className="form-group">
                      <label htmlFor="conductor-regon">REGON</label>
                      <input type="text" id="conductor-regon" name="regon" value={conductorData.regon} onChange={handleConductorDataChange} placeholder="REGON" />
                  </div>
              </div>
              <div className="form-actions-group">
                <button onClick={handleGenerateAllContracts} className="button-success" disabled={isGenerating}>
                    {isGenerating ? 'Generowanie...' : `Potwierdź i generuj umowy`}
                </button>
                <button onClick={() => setShowBulkGenerateForm(false)} className="button-secondary">
                  Anuluj
                </button>
              </div>
          </div>
        )}
      </div>

      <hr />

      {participants.length > 0 && (
        <div className="musician-list">
          {participants.map((p) => (
            <div key={p._id} className="musician-card">
              <div className="musician-info">
                <input
                  type="checkbox"
                  className="musician-checkbox"
                  checked={selectedParticipants.has(p._id)}
                  onChange={() => handleSelectionChange(p._id)}
                  id={`musician-${p._id}`}
                  disabled={p.contractStatus === 'completed'}
                />
                <label htmlFor={`musician-${p._id}`}>
                  <strong>{p.userId.name}</strong> ({p.userId.instrument})
                  <span className={`contract-status ${p.contractStatus || 'pending'}`}>
                    {p.contractStatus === 'completed' ? 'Umowa gotowa' : 'Brak umowy'}
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default ContractMusicianList; 