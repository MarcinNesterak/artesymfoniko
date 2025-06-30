import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../styles/contractDetails.css'; // Dedykowane style

// --- Bezpośrednie wywołanie API jako obejście ---
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://artesymfoniko-production.up.railway.app";
const getAuthToken = () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user).token : null;
};
const getContractDetails = async (id) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/events/contracts/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Błąd pobierania umowy');
    }
    return response.json();
};
// --- Koniec obejścia ---

const ContractDetails = () => {
    const { contractId } = useParams(); // UWAGA: Zmienione z participationId
    const navigate = useNavigate();
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchContract = async () => {
            if (!contractId) return;
            try {
                setLoading(true);
                const data = await getContractDetails(contractId);
                setContract(data);
            } catch (err) {
                setError('Nie udało się załadować umowy. ' + err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchContract();
    }, [contractId]);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('pl-PL');
    };
    
    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="loading">Ładowanie umowy...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!contract) return <div className="error-message">Nie znaleziono umowy.</div>;

    return (
        <div className="contract-details-container">
            <div className="contract-actions no-print">
                <button onClick={() => navigate(-1)} className="button-secondary">Powrót</button>
                <button onClick={handlePrint} className="button-primary">Drukuj / Zapisz PDF</button>
            </div>

            <div className="contract-paper">
                <h1 className="contract-title">UMOWA O DZIEŁO nr {contract.numerUmowy}</h1>
                <p className="contract-date-place">
                    zawarta w {contract.miejsceZawarcia} w dniu {formatDate(contract.dataZawarcia)}
                </p>

                <div className="party-section">
                    <p>pomiędzy:</p>
                    <p><strong>{contract.zamawiajacy.nazwa}</strong>, {contract.zamawiajacy.adres}, NIP: {contract.zamawiajacy.nip}, REGON: {contract.zamawiajacy.regon}, reprezentowanym przez {contract.zamawiajacy.reprezentant},</p>
                    <p>zwanym dalej "Zamawiającym",</p>
                    <p>a</p>
                    <p><strong>{contract.wykonawca.imieNazwisko}</strong>, zam. {contract.wykonawca.adres}, PESEL: {contract.wykonawca.pesel},</p>
                    <p>zwaną/ym dalej "Wykonawcą".</p>
                </div>
                
                <div className="contract-body">
                    <p><strong>§ 1. Przedmiot umowy</strong></p>
                    <p>1. Zamawiający zamawia, a Wykonawca zobowiązuje się do wykonania dzieła polegającego na: {contract.przedmiotUmowy}.</p>
                    <p>2. Dzieło zostanie wykonane w dniu {formatDate(contract.dataWykonaniaDziela)}.</p>

                    <p><strong>§ 2. Wynagrodzenie</strong></p>
                    <p>1. Za wykonanie dzieła, o którym mowa w § 1, strony ustalają wynagrodzenie w wysokości {contract.wynagrodzenieBrutto} zł brutto.</p>
                    <p>2. Wynagrodzenie zostanie wypłacone przelewem na rachunek bankowy Wykonawcy o numerze: {contract.wykonawca.numerKonta} w terminie 14 dni od daty wykonania dzieła.</p>
                    
                    {/* ... (dalsze paragrafy umowy) ... */}
                </div>

                <div className="signature-section">
                    <div>
                        <p>..............................</p>
                        <p>(Zamawiający)</p>
                    </div>
                    <div>
                        <p>..............................</p>
                        <p>(Wykonawca)</p>
                    </div>
                </div>

                <hr className="invoice-hr" />
                <h2 className="invoice-title">RACHUNEK DO UMOWY O DZIEŁO nr {contract.numerUmowy}</h2>
                <div className="invoice-details">
                    <p><strong>Koszty uzyskania przychodu (20%):</strong> {contract.kosztyUzyskaniaPrzychodu} zł</p>
                    <p><strong>Podstawa opodatkowania:</strong> {contract.podstawaOpodatkowania} zł</p>
                    <p><strong>Zaliczka na podatek dochodowy (12%):</strong> {contract.zaliczkaNaPodatek} zł</p>
                    <p className="net-amount"><strong>Do wypłaty (netto):</strong> {contract.wynagrodzenieNetto} zł</p>
                </div>
            </div>
        </div>
    );
};

export default ContractDetails; 