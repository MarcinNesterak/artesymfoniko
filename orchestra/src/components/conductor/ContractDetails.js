import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { eventsAPI } from "../../services/api";
import { amountToWords } from "../../utils/contractUtils"; // Importujemy nową funkcję
import "../../styles/contractDetails.css";

const ContractDetails = () => {
  const { eventId, contractId } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const data = await eventsAPI.getContract(contractId);
        setContract(data.contract);
      } catch (err) {
        setError("Nie udało się załadować umowy. " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchContract();
  }, [contractId]);

  if (loading) return <div>Ładowanie umowy...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!contract) return <div>Nie znaleziono umowy.</div>;

  // Destrukturyzacja dla łatwiejszego dostępu
  const {
    numerUmowy,
    miejsceZawarcia,
    dataZawarcia,
    dataWykonaniaDziela,
    zamawiajacy,
    wykonawca,
    przedmiotUmowy,
    wynagrodzenieBrutto,
    kosztyUzyskaniaPrzychodu,
    podstawaOpodatkowania,
    zaliczkaNaPodatek,
    wynagrodzenieNetto,
  } = contract;

  return (
    <div className="contract-details-container">
      <div className="contract-actions">
        <button
          onClick={() => navigate(`/conductor/events/${eventId}/contracts`)}
          className="back-button"
        >
          Powrót do listy
        </button>
        <button onClick={() => window.print()} className="button-primary">
          Drukuj / Zapisz jako PDF
        </button>
      </div>

      <div className="contract-preview">
        {/* --- UMOWA O DZIEŁO --- */}
        <div className="page-break">
          <h1>Umowa o dzieło nr {numerUmowy}</h1>
          <p>
            <strong>
              {miejsceZawarcia}, {dataZawarcia}
            </strong>
          </p>
          <p>Zawarta w dniu {dataZawarcia} pomiędzy:</p>
          <p>
            <strong>{zamawiajacy.nazwa}</strong>, z siedzibą przy{" "}
            {zamawiajacy.adres}, NIP: {zamawiajacy.nip}, REGON:{" "}
            {zamawiajacy.regon}, reprezentowana przez {zamawiajacy.reprezentant}{" "}
            zwanego dalej Zamawiającym.
          </p>
          <p>a</p>
          <p>
            <strong>{wykonawca.imieNazwisko}</strong>, zamieszkały/a pod adresem{" "}
            {wykonawca.adres}, posługujący/a się numerem PESEL:{" "}
            {wykonawca.pesel}, zwanym dalej Wykonawcą.
          </p>

          <h2>§1 - Przedmiot umowy</h2>
          <p>
            Zamawiający zamawia, a Wykonawca przyjmuje do wykonania dzieło
            polegające na: {przedmiotUmowy}
          </p>

          <h2>§2 - Czas trwania umowy</h2>
          <p>
            Termin rozpoczęcia prac strony ustaliły na {dataZawarcia}, a termin
            ukończenia dzieła na {dataWykonaniaDziela}.
          </p>

          <h2>§3 - Wynagrodzenie</h2>
          <ol>
            <li>
              Z tytułu wykonywanych czynności opisanych w §1 niniejszej umowy
              Wykonawca otrzyma wynagrodzenie w wysokości{" "}
              <strong>{wynagrodzenieBrutto}</strong> (słownie:{" "}
              {amountToWords(wynagrodzenieBrutto)}).
            </li>
            <li>
              Wynagrodzenie płatne będzie przez Zamawiającego po wykonaniu
              dzieła na podany rachunek bankowy, w terminie 30 dni od wykonania
              dzieła przez Wykonawcę.
            </li>
            <li>
              Zamawiający zastrzega sobie prawo dokonania stosownych potrąceń z
              wynagrodzenia na poczet zaliczek na podatek dochodowy.
            </li>
            <li>
              W przypadku nienależytego lub nieterminowego wykonania dzieła
              Zamawiający ma prawo odmowy wypłaty lub części umównej kwoty.
            </li>
            <li>
              Wykonawca oświadcza, że w zakresie wykonywanej umowy o dzieło nie
              prowadzi działalności gospodarczej.
            </li>
          </ol>

          <h2>§4 - Przeniesienie praw autorskich</h2>
          <ol>
            <li>
              Wykonawca z chwilą przekazania dzieła przenosi w całości na
              Zamawiającego całość majątkowych praw autorskich i praw pokrewnych
              do wykonanego dzieła w zakresie wszystkich znanych pól
              eksploatacji...
            </li>
          </ol>

          <h2>§5 - Warunki wykonywania umowy</h2>
          <ol>
            <li>
              Wykonawca zobowiązuje się wykonać powierzone dzieło z należytą
              starannością...
            </li>
            <li>
              Wykonawca oświadcza, że dzieło będzie wynikiem jego oryginalnej
              twórczości...
            </li>
          </ol>

          <h2>§6 - Klauzula informacyjna</h2>
          <ol>
            <li>
              Administratorem danych osobowych jest {zamawiajacy.nazwa} z
              siedzibą w {zamawiajacy.adres.split(",")[0]}...
            </li>
          </ol>

          <h2>§7 - Inne postanowienia</h2>
          <ol>
            <li>
              W sprawach nie unormowanych niniejszą umową mają zastosowanie
              przepisy Kodeksu Cywilnego oraz Prawa Autorskiego.
            </li>
            <li>
              Strony zobowiązują się do zachowania poufności treści niniejszej
              umowy.
            </li>
            <li>
              Wszelkie zmiany niniejszej umowy wymagają zachowania formy
              pisemnej pod rygorem nieważności.
            </li>
            <li>
              Umowę sporządzono w dwóch jednakowych egzemplarzach po jednym dla
              każdej strony.
            </li>
          </ol>

          <div className="signatures">
            <div>
              <p>____________________</p>
              <p>
                <strong>{zamawiajacy.nazwa}</strong>
              </p>
              <p>{zamawiajacy.adres}</p>
              <p>
                NIP {zamawiajacy.nip}, REGON {zamawiajacy.regon}
              </p>
              <p>Zamawiający</p>
            </div>
            <div>
              <p>____________________</p>
              <p>Wykonawca</p>
            </div>
          </div>
        </div>

        {/* --- RACHUNEK --- */}
        <div className="page-break">
          <h1>Rachunek do umowy o dzieło nr {numerUmowy}</h1>
          <p>
            <strong>
              {miejsceZawarcia}, {dataWykonaniaDziela}
            </strong>
          </p>
          <hr />
          <h2>Rachunek do umowy o dzieło nr {numerUmowy}</h2>
          <p>z dnia {dataZawarcia}</p>

          <h3>Zamawiający:</h3>
          <p>
            <strong>{zamawiajacy.nazwa}</strong>
            <br />z siedzibą przy {zamawiajacy.adres},<br />
            NIP: {zamawiajacy.nip}, REGON: {zamawiajacy.regon},<br />
            zwanym dalej Zamawiającym.
          </p>

          <h3>Wykonawca:</h3>
          <p>
            <strong>{wykonawca.imieNazwisko}</strong>
            <br />
            zamieszkały/a pod adresem {wykonawca.adres},<br />
            posługujący/a się numerem PESEL: {wykonawca.pesel},<br />
            zwanym/ą dalej Wykonawcą
          </p>

          <p>Dzieło zostało wykonane w dniu {dataWykonaniaDziela}.</p>

          <h3>Rozliczenie:</h3>
          <table>
            <tbody>
              <tr>
                <td>Wynagrodzenie brutto</td>
                <td>{wynagrodzenieBrutto} PLN</td>
              </tr>
              <tr>
                <td>Koszty uzyskania przychodu (50%)</td>
                <td>{kosztyUzyskaniaPrzychodu} PLN</td>
              </tr>
              <tr>
                <td>Podstawa naliczenia podatku dochodowego</td>
                <td>{podstawaOpodatkowania} PLN</td>
              </tr>
              <tr>
                <td>Należna zaliczka na podatek dochodowy</td>
                <td>{zaliczkaNaPodatek} PLN</td>
              </tr>
              <tr>
                <td>
                  <strong>Wynagrodzenie netto</strong>
                </td>
                <td>
                  <strong>{wynagrodzenieNetto} PLN</strong>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Do wypłaty</strong>
                </td>
                <td>
                  <strong>{wynagrodzenieNetto} PLN</strong>
                </td>
              </tr>
            </tbody>
          </table>

          <p>
            <strong>Sposób zapłaty:</strong> przelew
            <br />
            <strong>NUMER KONTA BANKOWEGO:</strong> {wykonawca.numerKonta}
          </p>

          <div className="signatures">
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

export default ContractDetails;
