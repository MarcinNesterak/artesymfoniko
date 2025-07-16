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
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Przeglądarka nie wspiera powiadomień push.");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Jeśli subskrypcja już istnieje, wyślij ją ponownie na backend, aby zapewnić synchronizację
      await sendSubscriptionToBackend(subscription);
      return;
    }

    const vapidPublicKey = "BI87BRg2_feYPKWjrVgcqLQgeuvJo3IFDbgIdBOiBXgkn6kfcNAgVHCrE-ujEr_w0wWhl-8XVMjkIWvWXNAvxBc";
    if (!vapidPublicKey) {
      console.error("Klucz VAPID publiczny nie jest dostępny.");
      return;
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    await sendSubscriptionToBackend(subscription);
  } catch (error) {
    console.error("Błąd podczas procesu subskrypcji powiadomień:", error);
  }
}

// Funkcja do wysyłania subskrypcji na backend
async function sendSubscriptionToBackend(subscription) {
  try {
    await notificationsAPI.subscribe(subscription);
  } catch (error) {
    console.error("Błąd podczas wysyłania subskrypcji na backend:", error);
  }
} 