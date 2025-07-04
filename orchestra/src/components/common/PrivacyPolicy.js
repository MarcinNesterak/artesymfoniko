import React from "react";
import "../../styles/forms.css"; // Użyjemy istniejących stylów dla spójności

const PrivacyPolicy = () => {
  return (
    <div className="form-container" style={{ maxWidth: "800px", margin: "2rem auto" }}>
      <h2>Polityka Prywatności</h2>
      <p>
        Data wejścia w życie: {new Date().toLocaleDateString("pl-PL")}
      </p>

      <h3>§1. Postanowienia ogólne</h3>
      <ol>
        <li>
          Niniejsza polityka prywatności ma charakter informacyjny i określa
          zasady przetwarzania i ochrony danych osobowych przekazanych przez
          Użytkowników w związku z korzystaniem przez nich z aplikacji ArteSymfoniko.
        </li>
        <li>
          Administratorem Danych Osobowych (ADO) jest [Nazwa Administratora, np. Fundacja ArteSymfoniko] z siedzibą w [Adres], NIP: [NIP], REGON: [REGON], zwany dalej "Administratorem".
        </li>
        <li>
          Dbamy o Twoją prywatność i bezpieczeństwo Twoich danych. W tym celu
          używany jest m.in. bezpieczny protokół szyfrowania komunikacji (SSL).
        </li>
      </ol>

      <h3>§2. Cel i podstawa prawna przetwarzania danych</h3>
      <ol>
        <li>
          Twoje dane osobowe przetwarzane są na podstawie Art. 6 ust. 1 lit. a RODO (Twoja świadoma zgoda) oraz Art. 6 ust. 1 lit. b
          RODO (niezbędność do wykonania umowy), w następujących celach:
          <ul>
            <li>
              Założenia i utrzymania konta w aplikacji, co umożliwia Ci
              otrzymywanie zaproszeń do udziału w wydarzeniach muzycznych (koncertach).
            </li>
            <li>
              Zawierania i realizacji umów o dzieło, w tym rozliczeń
              finansowych i podatkowych, na podstawie podanych przez Ciebie danych.
            </li>
            <li>
              Organizacji wydarzeń muzycznych, w tym komunikacji z Tobą w
              sprawach logistycznych i organizacyjnych.
            </li>
          </ul>
        </li>
         <li>
          Podanie danych jest dobrowolne, ale niezbędne do uzupełnienia profilu i brania udziału w wydarzeniach, które wymagają zawarcia umowy.
        </li>
      </ol>

      <h3>§3. Jakie dane przetwarzamy?</h3>
      <p>
        W celu realizacji powyższych celów, przetwarzamy następujące kategorie Twoich danych, które nam podajesz:
        imię i nazwisko, adres e-mail, numer telefonu, adres zamieszkania, PESEL, numer konta bankowego.
      </p>

      <h3>§4. Prawa osób, których dane dotyczą</h3>
      <p>
        Przysługuje Ci prawo do:
      </p>
      <ul>
        <li>
          <strong>Dostępu do swoich danych</strong> – możesz w każdej chwili
          zobaczyć swoje dane w zakładce "Mój profil".
        </li>
        <li>
          <strong>Sprostowania (poprawiania) swoich danych</strong> – możesz
          zaktualizować swoje dane w zakładce "Mój profil".
        </li>
        <li>
          <strong>Usunięcia danych (prawo do bycia zapomnianym)</strong> –
          możesz zażądać usunięcia swojego konta. Usunięcie konta jest
          równoznaczne z usunięciem Twoich danych osobowych, z zastrzeżeniem, że
          nie możemy usunąć danych, do których przechowywania zobowiązują nas
          przepisy prawa (np. dane na umowach do celów podatkowych) przez
          określony w nich czas.
        </li>
        <li>
          Cofnięcia zgody na przetwarzanie danych w dowolnym momencie, co nie wpływa na zgodność z prawem przetwarzania, którego dokonano przed jej cofnięciem.
        </li>
        <li>
          Wniesienia skargi do organu nadzorczego – Prezesa Urzędu Ochrony
          Danych Osobowych (PUODO).
        </li>
      </ul>
      
      <h3>§5. Okres przechowywania danych</h3>
      <p>
         Twoje dane osobowe będą przechowywane przez cały okres posiadania przez Ciebie konta w aplikacji. Po usunięciu konta, Twoje dane zostaną zanonimizowane lub usunięte, o ile przepisy prawa (np. podatkowe, rachunkowe, cywilne) nie nakładają na nas obowiązku ich dalszego przechowywania.
      </p>

      <h3>§6. Postanowienia końcowe</h3>
      <p>
        Zastrzegamy sobie prawo do zmiany w polityce prywatności, o czym poinformujemy Użytkowników.
      </p>
    </div>
  );
};

export default PrivacyPolicy; 