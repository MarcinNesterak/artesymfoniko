import { notificationsAPI } from "./api";

// Funkcja pomocnicza do konwersji klucza VAPID
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Główna funkcja do subskrypcji użytkownika
export async function subscribeUserToPush() {
  console.log("--- 1. Rozpoczynam próbę subskrypcji powiadomień. ---");

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("--- X. BŁĄD KRYTYCZNY: Przeglądarka nie wspiera powiadomień push. ---");
    return;
  }
  console.log("--- 2. Przeglądarka wspiera powiadomienia. Przechodzę dalej. ---");

  try {
    const registration = await navigator.serviceWorker.ready;
    console.log("--- 3. Service Worker jest gotowy. ---");

    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log("--- 4a. ZNALEZIONO ISTNIEJĄCĄ SUBSKRYPCJĘ. ---");
      console.log("Istniejący obiekt subskrypcji:", subscription);
      await sendSubscriptionToBackend(subscription);
      return;
    }

    console.log("--- 4b. BRAK ISTNIEJĄCEJ SUBSKRYPCJI. Próbuję stworzyć nową. ---");
    
    const vapidPublicKey =
      "BI87BRg2_feYPKWjrVgcqLQgeuvJo3IFDbgIdBOiBXgkn6kfcNAgVHCrE-ujEr_w0wWhl-8XVMjkIWvWXNAvxBc";

    if (!vapidPublicKey) {
      console.error("--- X. BŁĄD: Klucz VAPID publiczny nie jest dostępny. ---");
      return;
    }
    console.log("--- 5. Klucz VAPID jest dostępny. ---");

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    console.log("--- 6. Proszę przeglądarkę o zgodę i nową subskrypcję... (Czekam na odpowiedź użytkownika lub przeglądarki) ---");
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    console.log("--- 7. UDAŁO SIĘ! Otrzymano nową subskrypcję od przeglądarki. ---");
    console.log("Nowy obiekt subskrypcji:", subscription);

    await sendSubscriptionToBackend(subscription);
  } catch (error) {
    console.error("--- X. BŁĄD KRYTYCZNY PODCZAS PROCESU SUBSKRYPCJI: ---", error);
  }
}

// Funkcja do wysyłania subskrypcji na backend
async function sendSubscriptionToBackend(subscription) {
  console.log("--- 8. Próbuję wysłać subskrypcję na backend... ---");
  try {
    const response = await notificationsAPI.subscribe(subscription);
    console.log("--- 9. SUKCES! Subskrypcja wysłana na backend. Odpowiedź serwera:", response);
  } catch (error) {
    console.error("--- X. BŁĄD PODCZAS WYSYŁANIA SUBSKRYPCJI NA BACKEND: ---", error);
  }
} 