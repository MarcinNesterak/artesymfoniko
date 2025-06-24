# Plan Wdrożenia Funkcjonalności Generowania Umów

Data: 14 czerwca 2025

## 1. Wprowadzenie i Klauzula Odpowiedzialności

Niniejszy dokument opisuje plan wdrożenia modułu do generowania umów dla muzyków. Celem jest automatyzacja procesu tworzenia umów (np. o dzieło) na podstawie danych z systemu oraz umożliwienie dyrygentowi ich edycji i wydruku.

**BARDZO WAŻNE:** Poniższy plan stanowi propozycję rozwiązania **technicznego**. Nie jest i nie może być traktowany jako porada prawna. Kwestie związane z treścią samej umowy, zgodami na przetwarzanie danych osobowych (RODO) oraz obowiązkami prawno-podatkowymi **muszą być skonsultowane z profesjonalnym radcą prawnym lub specjalistą ds. RODO**. Aplikacja jest jedynie narzędziem wspomagającym proces.

---

## 2. Główne Założenia Funkcjonalne

-   **Muzyk:** Po pierwszym logowaniu jest proszony o uzupełnienie szczegółowych danych niezbędnych do umowy (adres, PESEL/NIP, Urząd Skarbowy, nr konta). Udziela również świadomej zgody na przetwarzanie tych danych.
-   **Dyrygent:** W widoku szczegółów wydarzenia, przy każdym muzyku, który potwierdził udział, ma możliwość wygenerowania umowy.
-   **Umowa:** Dane do umowy są pobierane automatycznie z profilu muzyka i szczegółów wydarzenia. Pola kluczowe, takie jak stawka, są edytowalne.
-   **Wydruk:** Dyrygent może wydrukować gotową, wypełnioną umowę bezpośrednio z przeglądarki.

---

## 3. Faza 1: Modyfikacje w Backendzie

### 3.1. Aktualizacja Modeli Danych (Mongoose)

#### a) Model `User` (`orchestra-backend/models/User.js`)
Konieczne jest dodanie nowych, wrażliwych pól do profilu muzyka.

```javascript
// Proponowane nowe pola w userSchema:
personalData: {
  fullName: { type: String, trim: true }, // Imię i nazwisko do dokumentów
  address: {
    street: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    city: { type: String, trim: true },
  },
  pesel: { type: String, trim: true }, // Alternatywnie NIP dla firm
  taxOffice: { type: String, trim: true }, // Nazwa i adres Urzędu Skarbowego
  bankAccountNumber: { type: String, trim: true },
},
hasCompletedPersonalData: { type: Boolean, default: false }, // Flaga do wymuszenia uzupełnienia danych
gdprConsent: { // Zapisanie zgody
  version: { type: String }, // Wersja zgody, np. "1.0-2025-06-14"
  grantedAt: { type: Date },
}
```
**Rekomendacja:** Pola `pesel` i `bankAccountNumber` powinny być dodatkowo zaszyfrowane w bazie danych (np. przy użyciu biblioteki `crypto` w Node.js lub `mongoose-encryption`).

#### b) Model `Participation` (`orchestra-backend/models/Participation.js`)
Model ten łączy muzyka z wydarzeniem. To idealne miejsce na przechowywanie danych specyficznych dla danego kontraktu.

```javascript
// Proponowane nowe pola w participationSchema:
contract: {
  rate: { type: Number, default: 0 }, // Stawka za koncert
  contractType: { type: String, enum: ['umowa-o-dzielo', 'umowa-zlecenie', 'inne'], default: 'umowa-o-dzielo' },
  status: { type: String, enum: ['wersja-robocza', 'wygenerowana'], default: 'wersja-robocza' },
}
```

### 3.2. Nowe Endpointy API (`orchestra-backend/routes/`)

#### a) Endpoint do aktualizacji danych osobowych muzyka
-   **Ścieżka:** `PATCH /api/users/me/personal-data`
-   **Logika:** Pozwala zalogowanemu muzykowi na zapisanie/aktualizację swoich danych osobowych. Ustawia `hasCompletedPersonalData` na `true`. Waliduje dane i obsługuje zgodę RODO.

#### b) Endpoint do pobierania danych do umowy
-   **Ścieżka:** `GET /api/events/:eventId/participations/:participationId/contract-details`
-   **Logika:** Zwraca połączone dane z modeli `Event`, `User` (dane muzyka) i `Participation` (dane kontraktowe). Dostępny tylko dla dyrygenta-właściciela wydarzenia.

#### c) Endpoint do aktualizacji danych w umowie
-   **Ścieżka:** `PATCH /api/events/:eventId/participations/:participationId/contract-details`
-   **Logika:** Pozwala dyrygentowi na zapisanie edytowalnych pól (np. `rate`).

---

## 4. Faza 2: Modyfikacje w Frontendzie

### 4.1. Przepływ dla Muzyka

#### a) Wymuszenie uzupełnienia danych
-   Po zalogowaniu, aplikacja sprawdza pole `user.hasCompletedPersonalData`. Jeśli jest `false`, muzyk jest przekierowywany na dedykowaną stronę/modal "Uzupełnij dane do umów".

#### b) Formularz Danych Osobowych
-   Nowy komponent, np. `CompleteProfile.js`.
-   Zawiera formularz z polami (adres, PESEL, etc.).
-   **Kluczowy element:** Zawiera **checkbox ze zgodą RODO**. Treść zgody musi być przygotowana przez prawnika. Przykład:
    > "Wyrażam zgodę na przetwarzanie moich danych osobowych, w tym danych wrażliwych, przez [Nazwa i dane Organizatora] w celu przygotowania, zawarcia i rozliczenia umów dotyczących mojego udziału w wydarzeniach artystycznych. Zostałem/am poinformowany/a o prawie do dostępu do moich danych, ich sprostowania, usunięcia oraz o okresie ich przechowywania."
-   Zapisanie formularza jest niemożliwe bez zaznaczenia zgody.

### 4.2. Przepływ dla Dyrygenta

#### a) Przycisk w widoku `EventDetails.js`
-   Na liście muzyków, którzy potwierdzili udział (`participations`), przy każdym nazwisku dodajemy przycisk "Generuj umowę".
-   Przycisk jest nieaktywny, jeśli dany muzyk nie uzupełnił danych (`hasCompletedPersonalData === false`).

#### b) Modal Generowania Umowy
-   Po kliknięciu przycisku otwiera się modal (`ContractGeneratorModal.js`).
-   Modal pobiera dane z endpointu `.../contract-details`.
-   Wyświetla treść umowy z automatycznie wstawionymi danymi.
-   Pola takie jak `stawka` są edytowalnymi inputami.
-   **Przycisk "Zapisz zmiany"**: Wysyła `PATCH` z nową stawką.
-   **Przycisk "Drukuj"**: Uruchamia `window.print()`.

### 4.3. Stylizacja do Wydruku
-   Należy stworzyć dedykowane style CSS dla wydruku.
-   W pliku CSS (np. `eventDetails.css`) dodajemy blok `@media print`:
    ```css
    @media print {
      body * {
        visibility: hidden; /* Ukryj wszystko */
      }
      .printable-contract, .printable-contract * {
        visibility: visible; /* Pokaż tylko kontener umowy */
      }
      .printable-contract {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      /* Ukryj przyciski i niepotrzebne elementy UI wewnątrz modala */
      .btn-print, .btn-save {
        display: none;
      }
    }
    ```
-   Kontener z umową w modalu musi mieć klasę `printable-contract`.

---

## 5. Podsumowanie i Kolejność Działań

1.  **Konsultacja prawna:** Uzyskanie finalnej treści umowy i zgody RODO.
2.  **Backend - Modele:** Modyfikacja schematów `User` i `Participation`.
3.  **Backend - API:** Implementacja trzech nowych endpointów.
4.  **Frontend - Muzyk:** Stworzenie formularza uzupełniania danych i logiki przekierowania.
5.  **Frontend - Dyrygent:** Dodanie przycisku i modala do generowania umowy.
6.  **Stylizacja:** Dopracowanie stylów dla wydruku.
7.  **Testy:** Gruntowne przetestowanie całego przepływu.

---

## 6. Aktualizacja (14.06.2025) - Funkcjonalność Wydruku Masowego

Na podstawie uwag użytkownika, plan zostaje rozszerzony o kluczową funkcjonalność wydruku masowego wszystkich umów dla danego wydarzenia.

### 6.1. Zmiany w Założeniach Funkcjonalnych
- Zamiast przycisku "Generuj umowę" przy każdym muzyku, w widoku szczegółów wydarzenia znajdzie się jeden, główny przycisk, np. **"Drukuj/Zarządzaj umowami"**.

### 6.2. Zmiany w Backendzie (API)
- Należy stworzyć nowy, zbiorczy endpoint API.
- **Ścieżka:** `GET /api/events/:eventId/all-contract-details`
- **Logika:** Endpoint zbierze dane do umów dla **wszystkich** muzyków z potwierdzonym udziałem w danym wydarzeniu i zwróci je w postaci tablicy obiektów. To znacznie wydajniejsze niż wielokrotne odpytywanie o pojedyncze umowy.

### 6.3. Zmiany w Frontendzie
- Po kliknięciu przycisku "Drukuj/Zarządzaj umowami" użytkownik zostanie przeniesiony na nową stronę lub zobaczy duży modal, np. `BulkContractsView.js`.
- Komponent ten odpyta nowy endpoint `.../all-contract-details`.
- W widoku zostaną wyrenderowane **wszystkie umowy, jedna pod drugą**, każda w osobnym, ostylowanym kontenerze.
- Dyrygent wciąż będzie miał możliwość edycji stawki w każdej umowie indywidualnie. Zmiany będą zapisywane asynchronicznie.
- Główny przycisk "Drukuj wszystko" na tej stronie uruchomi `window.print()`.

### 6.4. Kluczowe Zmiany w Stylach Wydruku
- W bloku `@media print` należy dodać regułę, która zapewni, że każda umowa będzie drukowana na osobnej stronie.
    ```css
    .contract-page-container {
      page-break-after: always;
    }
    ```
- Każda indywidualna umowa w widoku masowym musi być owinięta w kontener z klasą `contract-page-container`. 