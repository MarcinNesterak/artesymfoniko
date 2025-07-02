import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsAPI, usersAPI } from '../../services/api';
import { amountToWords } from '../../utils/contractUtils'; 
import '../../styles/contractGenerator.css';
import '../../styles/forms.css';

const ContractGenerator = () => {
    const { eventId, participationId } = useParams();
    const navigate = useNavigate();

    const [contractData, setContractData] = useState({
        numerUmowy: '',
        miejsceZawarcia: 'Kraków',
        dataZawarcia: new Date().toISOString().split('T')[0],
        dataWykonaniaDziela: '',
        zamawiajacy: {
            nazwa: 'MIECZYSŁAW SMYDA AGENCJA ARTYSTYCZNA VIOLIN & CLASSIC',
            adres: 'Powroźnik 123, 33-370 Muszyna',
            nip: '734-145-41-48',
            regon: '492698947',
            reprezentant: 'Mieczysław Smyda'
        },
        wykonawca: {
            imieNazwisko: '',
            adres: '',
            pesel: '',
            numerKonta: ''
        },
        przedmiotUmowy: '',
        wynagrodzenieBrutto: 0,
        kosztyUzyskaniaPrzychodu: 0,
        podstawaOpodatkowania: 0,
        zaliczkaNaPodatek: 0,
        wynagrodzenieNetto: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const calculateFinancials = useCallback((brutto) => {
        const wynagrodzenieBrutto = parseFloat(brutto) || 0;
        const kosztyUzyskaniaPrzychodu = wynagrodzenieBrutto * 0.50;
        const podstawaOpodatkowania = Math.round(wynagrodzenieBrutto - kosztyUzyskaniaPrzychodu);
        const zaliczkaNaPodatek = Math.round(podstawaOpodatkowania * 0.12);
        const wynagrodzenieNetto = wynagrodzenieBrutto - zaliczkaNaPodatek;
        
        setContractData(prev => ({
            ...prev,
            wynagrodzenieBrutto: wynagrodzenieBrutto.toFixed(2),
            kosztyUzyskaniaPrzychodu: kosztyUzyskaniaPrzychodu.toFixed(2),
            podstawaOpodatkowania: podstawaOpodatkowania.toFixed(2),
            zaliczkaNaPodatek: zaliczkaNaPodatek.toFixed(2),
            wynagrodzenieNetto: wynagrodzenieNetto.toFixed(2),
        }));
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const eventDetails = await eventsAPI.getEvent(eventId);
                const participation = eventDetails.participations.find(p => p._id === participationId);
                if (!participation) throw new Error('Nie znaleziono uczestnictwa');
                
                const musicianDetails = await usersAPI.getMusician(participation.userId._id);
                const eventDate = new Date(eventDetails.event.date).toISOString().split('T')[0];
                
                setContractData(prev => ({
                    ...prev,
                    dataWykonaniaDziela: eventDate,
                    numerUmowy: `UOD/${eventDetails.event.title.replace(/\s+/g, '-')}/${participation.userId.name.replace(/\s+/g, '_')}/${new Date().getFullYear()}`,
                    wykonawca: {
                        imieNazwisko: musicianDetails.user.name,
                        adres: musicianDetails.user.personalData?.address ? `${musicianDetails.user.personalData.address.street}, ${musicianDetails.user.personalData.address.postalCode} ${musicianDetails.user.personalData.address.city}` : '',
                        pesel: musicianDetails.user.personalData?.pesel || '',
                        numerKonta: musicianDetails.user.personalData?.bankAccountNumber || ''
                    },
                    przedmiotUmowy: `Opracowanie, przygotowanie oraz nagrania prezentacji partii ${musicianDetails.user.instrument} połączonej z elementami improwizacji premierowego programu artystycznego: ${eventDetails.event.title} w dniu ${eventDate}`,
                    wynagrodzenieBrutto: participation.fee || 0,
                }));
                calculateFinancials(participation.fee || 0);
            } catch (err) {
                setError('Błąd podczas ładowania danych do umowy: ' + err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [eventId, participationId, calculateFinancials]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setContractData(prev => ({
            ...prev,
            [name]: value,
        }));
        if (name === 'wynagrodzenieBrutto') {
            calculateFinancials(value);
        }
    };
    
    const handleNestedChange = (section, e) => {
        const { name, value } = e.target;
        setContractData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [name]: value,
            }
        }));
    };
    
    const handleSaveContract = async () => {
        try {
            const finalContractData = {
                ...contractData,
                eventId,
                participationId,
            };
            await eventsAPI.createContract(finalContractData);
            navigate(`/conductor/events/${eventId}/contracts`);
        } catch (err) {
            setError('Nie udało się zapisać umowy: ' + err.message);
        }
    };
    
    if (loading) return <div>Ładowanie...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="contract-generator-container">
            <div className="form-section">
                <h2>Edytor Umowy</h2>
                <div className="form-group">
                    <label htmlFor="nazwa">Nazwa Zamawiającego:</label>
                    <input type="text" id="nazwa" name="nazwa" value={contractData.zamawiajacy.nazwa} onChange={(e) => handleNestedChange('zamawiajacy', e)} />
                </div>
                <div className="form-group">
                    <label htmlFor="adres">Adres Zamawiającego:</label>
                    <input type="text" id="adres" name="adres" value={contractData.zamawiajacy.adres} onChange={(e) => handleNestedChange('zamawiajacy', e)} />
                </div>
                <div className="form-group">
                    <label htmlFor="nip">NIP:</label>
                    <input type="text" id="nip" name="nip" value={contractData.zamawiajacy.nip} onChange={(e) => handleNestedChange('zamawiajacy', e)} />
                </div>
                <div className="form-group">
                    <label htmlFor="regon">REGON:</label>
                    <input type="text" id="regon" name="regon" value={contractData.zamawiajacy.regon} onChange={(e) => handleNestedChange('zamawiajacy', e)} />
                </div>
                <div className="form-group">
                    <label htmlFor="reprezentant">Reprezentant:</label>
                    <input type="text" id="reprezentant" name="reprezentant" value={contractData.zamawiajacy.reprezentant} onChange={(e) => handleNestedChange('zamawiajacy', e)} />
                </div>
                <div className="form-group">
                    <label htmlFor="wynagrodzenieBrutto">Wynagrodzenie Brutto (PLN):</label>
                    <input type="number" step="0.01" id="wynagrodzenieBrutto" name="wynagrodzenieBrutto" value={contractData.wynagrodzenieBrutto} onChange={handleInputChange} />
                </div>
                <button onClick={handleSaveContract}>Zapisz umowę</button>
                <button onClick={() => window.print()}>Drukuj / Zapisz PDF</button>
                <button onClick={() => navigate(-1)}>Anuluj</button>
            </div>
            
            <div className="preview-section">
                <div className="page-break">
                    <h1>Rachunek do umowy o dzieło nr {contractData.numerUmowy}</h1>
                    <p><strong>{contractData.miejsceZawarcia}, {contractData.dataWykonaniaDziela}</strong></p>
                    <hr />
                    <h2>Rachunek do umowy o dzieło nr {contractData.numerUmowy}</h2>
                    <p>z dnia {contractData.dataZawarcia}</p>
                    
                    <h3>Zamawiający:</h3>
                    <p><strong>{contractData.zamawiajacy.nazwa}</strong><br />
                    z siedzibą przy {contractData.zamawiajacy.adres},<br />
                    NIP: {contractData.zamawiajacy.nip}, REGON: {contractData.zamawiajacy.regon},<br />
                    zwanym dalej Zamawiającym.</p>
                    
                    <h3>Wykonawca:</h3>
                    <p><strong>{contractData.wykonawca.imieNazwisko}</strong><br />
                    zamieszkały/a pod adresem {contractData.wykonawca.adres},<br />
                    posługujący/a się numerem PESEL: {contractData.wykonawca.pesel},<br />
                    zwanym/ą dalej Wykonawcą</p>
                    
                    <p>Dzieło zostało wykonane w dniu {contractData.dataWykonaniaDziela}.</p>
                    
                    <h3>Rozliczenie:</h3>
                    <table>
                        <tbody>
                            <tr><td>Wynagrodzenie brutto</td><td>{contractData.wynagrodzenieBrutto} PLN</td></tr>
                            <tr><td>Koszty uzyskania przychodu (50%)</td><td>{contractData.kosztyUzyskaniaPrzychodu} PLN</td></tr>
                            <tr><td>Podstawa naliczenia podatku dochodowego</td><td>{contractData.podstawaOpodatkowania} PLN</td></tr>
                            <tr><td>Należna zaliczka na podatek dochodowy</td><td>{contractData.zaliczkaNaPodatek} PLN</td></tr>
                            <tr><td><strong>Wynagrodzenie netto</strong></td><td><strong>{contractData.wynagrodzenieNetto} PLN</strong></td></tr>
                            <tr><td><strong>Do wypłaty</strong></td><td><strong>{contractData.wynagrodzenieNetto} PLN</strong></td></tr>
                        </tbody>
                    </table>
                    
                    <p><strong>Sposób zapłaty:</strong> przelew<br />
                    <strong>NUMER KONTA BANKOWEGO:</strong> {contractData.wykonawca.numerKonta}</p>
                    
                    <div className="signatures">
                        <div><p>____________________</p><p>Wykonawca</p></div>
                    </div>
                </div>

                <div className="page-break">
                    <h1>Umowa o dzieło nr {contractData.numerUmowy}</h1>
                    <p><strong>{contractData.miejsceZawarcia}, {contractData.dataZawarcia}</strong></p>
                    <p>Zawarta w dniu {contractData.dataZawarcia} pomiędzy:</p>
                    <p><strong>{contractData.zamawiajacy.nazwa}</strong>, z siedzibą przy {contractData.zamawiajacy.adres}, NIP: {contractData.zamawiajacy.nip}, REGON: {contractData.zamawiajacy.regon}, reprezentowana przez {contractData.zamawiajacy.reprezentant} zwanego dalej Zamawiającym.</p>
                    <p>a</p>
                    <p><strong>{contractData.wykonawca.imieNazwisko}</strong>, zamieszkały/a pod adresem {contractData.wykonawca.adres}, posługujący/a się numerem PESEL: {contractData.wykonawca.pesel}, zwanym dalej Wykonawcą.</p>
                    
                    <h2>§1 - Przedmiot umowy</h2>
                    <p>Zamawiający zamawia, a Wykonawca przyjmuje do wykonania dzieło polegające na: {contractData.przedmiotUmowy}</p>
                    
                    <h2>§2 - Czas trwania umowy</h2>
                    <p>Termin rozpoczęcia prac strony ustaliły na {contractData.dataZawarcia}, a termin ukończenia dzieła na {contractData.dataWykonaniaDziela}.</p>
                    
                    <h2>§3 - Wynagrodzenie</h2>
                    <ol>
                        <li>Z tytułu wykonywanych czynności opisanych w §1 niniejszej umowy Wykonawca otrzyma wynagrodzenie w wysokości <strong>{contractData.wynagrodzenieBrutto}</strong> (słownie: {amountToWords(contractData.wynagrodzenieBrutto)}).</li>
                        <li>Wynagrodzenie płatne będzie przez Zamawiającego po wykonaniu dzieła na podany rachunek bankowy, w terminie 30 dni od wykonania dzieła przez Wykonawcę.</li>
                        <li>Zamawiający zastrzega sobie prawo dokonania stosownych potrąceń z wynagrodzenia na poczet zaliczek na podatek dochodowy.</li>
                        <li>W przypadku nienależytego lub nieterminowego wykonania dzieła Zamawiający ma prawo odmowy wypłaty lub części umównej kwoty.</li>
                        <li>Wykonawca oświadcza, że w zakresie wykonywanej umowy o dzieło nie prowadzi działalności gospodarczej.</li>
                    </ol>

                    {/* ... Pozostałe paragrafy jako statyczny tekst ... */}
                    <h2>§4 - Przeniesienie praw autorskich</h2>
                    <ol>
                        <li>Wykonawca z chwilą przekazania dzieła przenosi w całości na Zamawiającego całość majątkowych praw autorskich i praw pokrewnych do wykonanego dzieła w zakresie wszystkich znanych pól eksploatacji...</li>
                    </ol>

                    <h2>§5 - Warunki wykonywania umowy</h2>
                    <ol>
                       <li>Wykonawca zobowiązuje się wykonać powierzone dzieło z należytą starannością...</li>
                       <li>Wykonawca oświadcza, że dzieło będzie wynikiem jego oryginalnej twórczości...</li>
                    </ol>

                    <h2>§6 - Klauzula informacyjna</h2>
                    <ol>
                        <li>Administratorem danych osobowych jest {contractData.zamawiajacy.nazwa} z siedzibą w {contractData.zamawiajacy.adres.split(',')[0]}...</li>
                    </ol>

                    <h2>§7 - Inne postanowienia</h2>
                    <ol>
                        <li>W sprawach nie unormowanych niniejszą umową mają zastosowanie przepisy Kodeksu Cywilnego oraz Prawa Autorskiego.</li>
                        <li>Strony zobowiązują się do zachowania poufności treści niniejszej umowy.</li>
                        <li>Wszelkie zmiany niniejszej umowy wymagają zachowania formy pisemnej pod rygorem nieważności.</li>
                        <li>Umowę sporządzono w dwóch jednakowych egzemplarzach po jednym dla każdej strony.</li>
                    </ol>

                    <div className="signatures">
                        <div>
                            <p>____________________</p>
                            <p><strong>{contractData.zamawiajacy.nazwa}</strong></p>
                            <p>{contractData.zamawiajacy.adres}</p>
                            <p>NIP {contractData.zamawiajacy.nip}, REGON {contractData.zamawiajacy.regon}</p>
                            <p>Zamawiający</p>
                        </div>
                        <div>
                            <p>____________________</p>
                            <p>Wykonawca</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContractGenerator; 