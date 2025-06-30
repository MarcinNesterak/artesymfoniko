import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsAPI, usersAPI } from '../../services/api';
import SuccessMessage from '../common/SuccessMessage';
import '../../styles/forms.css';
import '../../styles/contractGenerator.css';

// --- Bezpośrednie wywołanie API jako obejście problemów ---
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://artesymfoniko-production.up.railway.app";
const getAuthToken = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user).token : null;
};
const createContract = async (contractData) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/events/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(contractData),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Błąd tworzenia umowy');
    }
    return response.json();
};
// --- Koniec obejścia ---


const ContractGenerator = () => {
    const { eventId, participationId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [contract, setContract] = useState({
        eventId: '',
        participationId: '',
        conductorId: '',
        zamawiajacy: { nazwa: '', adres: '', nip: '', regon: '', reprezentant: '' },
        wykonawca: { imieNazwisko: '', adres: '', pesel: '', numerKonta: '' },
        numerUmowy: '',
        miejsceZawarcia: 'Kraków',
        dataZawarcia: new Date().toISOString().split('T')[0],
        dataWykonaniaDziela: '',
        przedmiotUmowy: '',
        wynagrodzenieBrutto: 0,
        kosztyUzyskaniaPrzychodu: 0,
        podstawaOpodatkowania: 0,
        zaliczkaNaPodatek: 0,
        wynagrodzenieNetto: 0,
    });

    const calculateFinancials = useCallback((brutto) => {
        const wynagrodzenieBrutto = parseFloat(brutto) || 0;
        const kosztyUzyskaniaPrzychodu = wynagrodzenieBrutto * 0.20;
        const podstawaOpodatkowania = Math.round(wynagrodzenieBrutto - kosztyUzyskaniaPrzychodu);
        const zaliczkaNaPodatek = Math.round(podstawaOpodatkowania * 0.12);
        const wynagrodzenieNetto = wynagrodzenieBrutto - zaliczkaNaPodatek;

        return {
            wynagrodzenieBrutto,
            kosztyUzyskaniaPrzychodu: kosztyUzyskaniaPrzychodu.toFixed(2),
            podstawaOpodatkowania,
            zaliczkaNaPodatek,
            wynagrodzenieNetto: wynagrodzenieNetto.toFixed(2),
        };
    }, []);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const eventDetails = await eventsAPI.getEvent(eventId);
            const conductor = JSON.parse(localStorage.getItem('user'));
            const currentUser = await usersAPI.getMusician(conductor.id); // Dane dyrygenta
            
            const participant = eventDetails.participations.find(p => p._id === participationId);
            if (!participant) throw new Error("Nie znaleziono uczestnika.");
            const musician = await usersAPI.getMusician(participant.userId._id);
            
            const initialBrutto = participant.fee || 0;
            const financials = calculateFinancials(initialBrutto);

            setContract({
                eventId,
                participationId,
                conductorId: currentUser._id,
                zamawiajacy: {
                    nazwa: currentUser.personalData?.companyName || 'Artysymfoniko Marcin Nesterak',
                    adres: currentUser.personalData?.companyAddress || 'ul. ...',
                    nip: currentUser.personalData?.companyNIP || '...',
                    regon: currentUser.personalData?.companyREGON || '',
                    reprezentant: currentUser.name,
                },
                wykonawca: {
                    imieNazwisko: musician.user.name,
                    adres: musician.user.personalData?.address ? `${musician.user.personalData.address.street}, ${musician.user.personalData.address.postalCode} ${musician.user.personalData.address.city}` : '',
                    pesel: musician.user.personalData?.pesel || '',
                    numerKonta: musician.user.personalData?.bankAccountNumber || '',
                },
                numerUmowy: `UOD/${new Date().getFullYear()}/...`,
                miejsceZawarcia: 'Kraków',
                dataZawarcia: new Date().toISOString().split('T')[0],
                dataWykonaniaDziela: new Date(eventDetails.event.date).toISOString().split('T')[0],
                przedmiotUmowy: `Wykonanie partii ${participant.userId.instrument} podczas koncertu "${eventDetails.event.title}"`,
                ...financials,
            });
        } catch (err) {
            setError('Nie udało się załadować danych do generatora. ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [eventId, participationId, calculateFinancials]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const keys = name.split('.');

        if (keys.length > 1) {
            setContract(prev => ({
                ...prev,
                [keys[0]]: { ...prev[keys[0]], [keys[1]]: value }
            }));
        } else {
            setContract(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleBruttoChange = (e) => {
        const newBrutto = e.target.value;
        const financials = calculateFinancials(newBrutto);
        setContract(prev => ({
            ...prev,
            ...financials,
        }));
    };

    const handleSaveContract = async () => {
        setIsSaving(true);
        setError('');
        setSuccess('');
        try {
            await createContract(contract);
            setSuccess('Umowa została pomyślnie zapisana!');
            setTimeout(() => {
                navigate(`/conductor/event/${eventId}/contracts`);
            }, 2000);
        } catch (err) {
            setError('Błąd zapisu umowy: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="loading">Ładowanie generatora...</div>;

    return (
        <div className="container form-container contract-generator">
            <SuccessMessage message={success} onClose={() => setSuccess('')} />
            {error && <div className="error-message sticky-error">{error}</div>}

            <div className="form-header">
                <h1>Generator Umowy o Dzieło</h1>
                <p>Wypełnij i zweryfikuj poniższe dane. Wszystkie pola są edytowalne.</p>
            </div>
            
            <form onSubmit={(e) => {e.preventDefault(); handleSaveContract();}}>
                <div className="form-section">
                    <h2>Dane Zamawiającego</h2>
                    <input name="zamawiajacy.nazwa" value={contract.zamawiajacy.nazwa} onChange={handleInputChange} placeholder="Nazwa firmy / Imię i nazwisko" />
                    <input name="zamawiajacy.adres" value={contract.zamawiajacy.adres} onChange={handleInputChange} placeholder="Adres" />
                    <input name="zamawiajacy.nip" value={contract.zamawiajacy.nip} onChange={handleInputChange} placeholder="NIP" />
                    <input name="zamawiajacy.regon" value={contract.zamawiajacy.regon} onChange={handleInputChange} placeholder="REGON" />
                    <input name="zamawiajacy.reprezentant" value={contract.zamawiajacy.reprezentant} onChange={handleInputChange} placeholder="Reprezentant" />
                </div>

                <div className="form-section">
                    <h2>Dane Wykonawcy</h2>
                    <input name="wykonawca.imieNazwisko" value={contract.wykonawca.imieNazwisko} onChange={handleInputChange} placeholder="Imię i nazwisko" />
                    <input name="wykonawca.adres" value={contract.wykonawca.adres} onChange={handleInputChange} placeholder="Adres" />
                    <input name="wykonawca.pesel" value={contract.wykonawca.pesel} onChange={handleInputChange} placeholder="PESEL" />
                    <input name="wykonawca.numerKonta" value={contract.wykonawca.numerKonta} onChange={handleInputChange} placeholder="Numer konta bankowego" />
                </div>
                
                <div className="form-section">
                    <h2>Szczegóły umowy</h2>
                    <input name="numerUmowy" value={contract.numerUmowy} onChange={handleInputChange} placeholder="Numer umowy" />
                    <input name="miejsceZawarcia" value={contract.miejsceZawarcia} onChange={handleInputChange} placeholder="Miejsce zawarcia" />
                    <label>Data zawarcia</label>
                    <input name="dataZawarcia" type="date" value={contract.dataZawarcia} onChange={handleInputChange} />
                    <label>Data wykonania dzieła</label>
                    <input name="dataWykonaniaDziela" type="date" value={contract.dataWykonaniaDziela} onChange={handleInputChange} />
                    <textarea name="przedmiotUmowy" value={contract.przedmiotUmowy} onChange={handleInputChange} placeholder="Przedmiot umowy" rows="3" />
                </div>

                <div className="form-section">
                    <h2>Rachunek</h2>
                    <label>Wynagrodzenie brutto (PLN)</label>
                    <input name="wynagrodzenieBrutto" type="number" value={contract.wynagrodzenieBrutto} onChange={handleBruttoChange} placeholder="Kwota brutto" />
                    <p>Koszty uzyskania przychodu (20%): <strong>{contract.kosztyUzyskaniaPrzychodu} PLN</strong></p>
                    <p>Podstawa opodatkowania (zaokr.): <strong>{contract.podstawaOpodatkowania} PLN</strong></p>
                    <p>Zaliczka na podatek dochodowy (12%, zaokr.): <strong>{contract.zaliczkaNaPodatek} PLN</strong></p>
                    <p className="net-amount">Do wypłaty (netto): <strong>{contract.wynagrodzenieNetto} PLN</strong></p>
                </div>

                <div className="form-actions">
                    <button type="submit" disabled={isSaving} className="button-primary">
                        {isSaving ? 'Zapisywanie...' : 'Zapisz i wygeneruj umowę'}
                    </button>
                    <button type="button" onClick={() => navigate(-1)} className="button-secondary">Anuluj</button>
                </div>
            </form>
        </div>
    );
};

export default ContractGenerator; 