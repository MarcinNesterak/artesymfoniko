import webpush from "web-push";
import User from "../models/User.js";

// Konfiguracja VAPID - kluczowa część do autoryzacji
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
};

webpush.setVapidDetails(
    'mailto:admin@example.com', // Adres e-mail administratora
    vapidKeys.publicKey,
    vapidKeys.privateKey
);


/**
 * Wysyła powiadomienie push do określonych użytkowników.
 * @param {string[]} userIds - Tablica ID użytkowników do powiadomienia.
 * @param {object} payload - Obiekt z danymi powiadomienia (title, body, url).
 */
export const sendPushNotification = async (userIds, payload) => {
  if (!userIds || userIds.length === 0) {
    return;
  }

  try {
    // Znajdź wszystkich użytkowników i ich subskrypcje jednym zapytaniem
    const users = await User.find({
      _id: { $in: userIds },
      pushSubscriptions: { $exists: true, $ne: [] },
    }).select("pushSubscriptions");

    if (users.length === 0) {
      console.log("No users with push subscriptions found for notification.");
      return;
    }

    const notificationPayload = JSON.stringify(payload);
    let successfulNotifications = 0;
    let failedNotifications = 0;

    const notificationPromises = users.flatMap((user) =>
      user.pushSubscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(subscription, notificationPayload);
          successfulNotifications++;
        } catch (error) {
          failedNotifications++;
          console.error(
            `Failed to send push notification to user ${user._id}:`,
            error.statusCode,
            error.body
          );
          // Opcjonalnie: można dodać logikę usuwania niedziałających subskrypcji
          if (error.statusCode === 404 || error.statusCode === 410) {
            user.pushSubscriptions = user.pushSubscriptions.filter(
              (s) => s.endpoint !== subscription.endpoint
            );
            await user.save();
          }
        }
      })
    );

    await Promise.all(notificationPromises);

    console.log(
      `Push notifications sent: ${successfulNotifications} successful, ${failedNotifications} failed.`
    );
  } catch (error) {
    console.error("Error sending push notifications:", error);
  }
}; 