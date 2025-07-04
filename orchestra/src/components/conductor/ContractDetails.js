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

  // Funkcja do formatowania daty
  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split("T")[0];
  };

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
          
          <p className="align-right">
            <strong>
              {miejsceZawarcia}, {formatDate(dataZawarcia)}
            </strong>
          </p>
          <h1>Umowa o dzieło nr {numerUmowy}</h1>
          <p>Zawarta w dniu {formatDate(dataZawarcia)} pomiędzy:</p>
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

          <h4>§1 - Przedmiot umowy</h4>
          <p>
            Zamawiający zamawia, a Wykonawca przyjmuje do wykonania dzieło
            polegające na: {przedmiotUmowy}
          </p>

          <h4>§2 - Czas trwania umowy</h4>
          <p>
            Termin rozpoczęcia prac strony ustaliły na {formatDate(dataZawarcia)}, a
            termin ukończenia dzieła na {formatDate(dataWykonaniaDziela)}.
          </p>

          <h4>§3 - Wynagrodzenie</h4>
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

          <h4>§4 - Przeniesienie praw autorskich</h4>
          <ol>
            <li>
              Wykonawca z chwilą przekazania dzieła przenosi w całości na
              Zamawiającego całość majątkowych praw autorskich i praw pokrewnych
              do wykonanego dzieła w zakresie wszystkich znanych pól
              eksploatacji...
            </li>
          </ol>

          <h4>§5 - Warunki wykonywania umowy</h4>
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

          <h4>§6 - Klauzula informacyjna</h4>
          <ol>
            <li>
              Administratorem danych osobowych jest {zamawiajacy.nazwa} z
              siedzibą w {zamawiajacy.adres.split(",")[0]}...
            </li>
          </ol>

          <h4>§7 - Inne postanowienia</h4>
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
              <p>Zamawiający</p>
            </div>
            <div>
              <p>____________________</p>
              <p>Wykonawca</p>
            </div>
          </div>
        </div>
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        {/* --- RACHUNEK --- */}
        <div className="page-break">
          <h1>Rachunek do umowy o dzieło nr {numerUmowy}</h1>
          <p>
            <strong>
              {miejsceZawarcia}, {formatDate(dataWykonaniaDziela)}
            </strong>
          </p>
          <hr />
          <h4>Rachunek do umowy o dzieło nr {numerUmowy}</h4>
          <p>z dnia {formatDate(dataZawarcia)}</p>

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

          <p>
            Dzieło zostało wykonane w dniu {formatDate(dataWykonaniaDziela)}.
          </p>

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
