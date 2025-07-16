// This file is intentionally left blank for now.
// It will be populated with service worker logic in the next steps.

console.log("Service Worker loaded.");

self.addEventListener("push", (event) => {
  const data = event.data.json();
  console.log("Push notification received:", data);

  const title = data.title || "Nowe powiadomienie";
  const options = {
    body: data.body || "Masz nową wiadomość.",
    icon: data.icon || "/artesymfoniko-192x192.png", // Domyślna ikona
    badge: "/artesymfoniko-96x96.png", // Ikona na pasku powiadomień Android
    data: {
      url: data.url || "/", // URL do otwarcia po kliknięciu
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked.");
  event.notification.close(); // Zamknij powiadomienie

  // Otwórz okno przeglądarki z adresem URL z danych powiadomienia
  event.waitUntil(
    clients.openWindow(event.notification.data.url).then((windowClient) => {
      // Jeśli okno zostało otwarte, ustaw je jako aktywne
      if (windowClient) {
        windowClient.focus();
      }
    })
  );
}); 