import { eventsAPI } from './api';

// Funkcja do automatycznej archiwizacji wydarzeń
export const archiveOldEvents = async () => {
  try {
    // Pobierz wszystkie nieznarchiwizowane wydarzenia
    const events = await eventsAPI.getEvents(false); // false = nieznarchiwizowane
    const now = new Date();
    
    if (!events || events.length === 0) {
      console.log('Brak wydarzeń do sprawdzenia');
      return 0;
    }
    
    // Znajdź wydarzenia, które powinny zostać zarchiwizowane
    // (te, których data jest wcześniejsza niż dzisiejszy dzień o godzinie 23:59)
    const eventsToArchive = events.filter(event => {
      const eventDate = new Date(event.date);
      const endOfEventDay = new Date(eventDate);
      
      // Ustaw koniec dnia wydarzenia na 23:59:59
      endOfEventDay.setHours(23, 59, 59, 999);
      
      // Archiwizuj jeśli koniec dnia wydarzenia minął
      return now > endOfEventDay;
    });
    
    if (eventsToArchive.length === 0) {
      console.log('Brak wydarzeń do archiwizacji');
      return 0;
    }
    
    // Archiwizuj każde wydarzenie, które spełnia warunki
    const archivePromises = eventsToArchive.map(event =>
      eventsAPI.updateEvent(event._id, { // MongoDB używa _id zamiast id
        ...event,
        archived: true
      })
    );
    
    await Promise.all(archivePromises);
    
    console.log(`Zarchiwizowano ${eventsToArchive.length} wydarzeń:`, 
      eventsToArchive.map(e => e.title)
    );
    
    return eventsToArchive.length;
  } catch (error) {
    console.error('Błąd podczas archiwizacji wydarzeń:', error);
    
    // Jeśli błąd wynika z braku autoryzacji, nie rzucaj błędu
    // (może użytkownik się wylogował w międzyczasie)
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      console.log('Brak autoryzacji - pomijanie archiwizacji');
      return 0;
    }
    
    throw error;
  }
};

// Funkcja do uruchamiania archiwizacji w tle
export const startArchiveService = () => {
  // Uruchom archiwizację po 5 sekundach (daj czas na zalogowanie)
  setTimeout(() => {
    archiveOldEvents().catch(err => {
      console.log('Pierwsza archiwizacja nieudana:', err.message);
    });
  }, 5000);
  
  // Następnie uruchamiaj co godzinę
  const intervalId = setInterval(() => {
    archiveOldEvents().catch(err => {
      console.log('Archiwizacja w tle nieudana:', err.message);
    });
  }, 60 * 60 * 1000); // 1 godzina = 60 * 60 * 1000 milisekund
  
  return intervalId;
};

// Funkcja do zatrzymania serwisu archiwizacji
export const stopArchiveService = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
  }
};

// Funkcja do manualnej archiwizacji (dla dyrygenta)
export const manualArchiveEvent = async (eventId) => {
  try {
    const event = await eventsAPI.getEvent(eventId);
    const updatedEvent = await eventsAPI.updateEvent(eventId, {
      ...event,
      archived: true
    });
    
    console.log(`Ręcznie zarchiwizowano wydarzenie: ${event.title}`);
    return updatedEvent;
  } catch (error) {
    console.error('Błąd podczas ręcznej archiwizacji:', error);
    throw error;
  }
};

// Funkcja do przywracania wydarzenia z archiwum
export const unarchiveEvent = async (eventId) => {
  try {
    const event = await eventsAPI.getEvent(eventId);
    const updatedEvent = await eventsAPI.updateEvent(eventId, {
      ...event,
      archived: false
    });
    
    console.log(`Przywrócono wydarzenie z archiwum: ${event.title}`);
    return updatedEvent;
  } catch (error) {
    console.error('Błąd podczas przywracania wydarzenia:', error);
    throw error;
  }
};