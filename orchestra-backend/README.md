# Orchestra Backend API

Backend API dla aplikacji orkiestry, napisany w Node.js z Express.

## Technologie

- Node.js
- Express
- MongoDB (baza danych)
- JWT (autoryzacja)
- Express Session (sesje w MongoDB)

## Wymagania

- Node.js 18+
- MongoDB
- npm lub yarn

## Konfiguracja

1. Sklonuj repozytorium
2. Zainstaluj zależności:
   ```bash
   npm install
   ```
3. Utwórz plik `.env` z następującymi zmiennymi:
   ```
   PORT=3002
   NODE_ENV=development
   MONGODB_URI=mongodb+srv://user:password@your-cluster.mongodb.net/your-database
   SESSION_SECRET=your-session-secret
   JWT_SECRET=your-jwt-secret
   ```

## Uruchomienie

### Lokalnie
```bash
npm start
```

### Produkcja
Aplikacja jest skonfigurowana do działania na Railway.

## Rate Limiting

Aplikacja używa wbudowanego rate limitingu:

- Logowanie: 5 prób na 15 minut
- Rejestracja: 3 próby na godzinę
- API: 100 requestów na minutę

## Sesje

Sesje są przechowywane w MongoDB z następującą konfiguracją:
- Czas życia: 14 dni
- Secure cookies w produkcji
- HttpOnly cookies

## Endpointy

### Autoryzacja
- `POST /api/auth/login` - logowanie
- `POST /api/auth/register` - rejestracja (tylko pierwszy użytkownik)
- `POST /api/auth/create-musician` - tworzenie konta muzyka (tylko dyrygent)

### Użytkownicy
- `GET /api/users` - lista muzyków (tylko dyrygent)
- `GET /api/users/:id` - szczegóły muzyka (tylko dyrygent)
- `PUT /api/users/:id` - aktualizacja danych muzyka (tylko dyrygent)
- `PATCH /api/users/:id/reset-password` - reset hasła (tylko dyrygent)
- `PATCH /api/users/:id/toggle-status` - aktywacja/dezaktywacja konta (tylko dyrygent)

### Wydarzenia
- `GET /api/events` - lista wydarzeń
- `GET /api/events/:id` - szczegóły wydarzenia
- `POST /api/events` - tworzenie wydarzenia (tylko dyrygent)
- `PUT /api/events/:id` - aktualizacja wydarzenia (tylko dyrygent)
- `DELETE /api/events/:id` - usunięcie wydarzenia (tylko dyrygent)

## Bezpieczeństwo

- Rate limiting dla wszystkich endpointów
- Sesje przechowywane w MongoDB
- JWT dla autoryzacji
- Helmet dla nagłówków bezpieczeństwa
- CORS skonfigurowany dla określonych domen

## Deployment

Aplikacja jest skonfigurowana do działania na Railway. Wymagane zmienne środowiskowe:
- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `SESSION_SECRET`
- `JWT_SECRET` 