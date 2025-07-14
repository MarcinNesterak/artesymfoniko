import express from "express";
import webpush from "web-push";
import { authenticate } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

// Endpoint do zapisywania subskrypcji
router.post("/subscribe", authenticate, async (req, res) => {
  const subscription = req.body;
  const userId = req.user._id;

  console.log(`Received subscription request for user: ${userId}`);
  console.log("Subscription object:", JSON.stringify(subscription, null, 2));

  if (!subscription || !subscription.endpoint) {
    console.error("Invalid subscription object received.");
    return res.status(400).json({ error: "Invalid subscription object" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User not found for ID: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // Znajdź indeks istniejącej subskrypcji
    const existingSubscriptionIndex = user.pushSubscriptions.findIndex(
      (sub) => sub.endpoint === subscription.endpoint
    );

    if (existingSubscriptionIndex > -1) {
      // Subskrypcja istnieje, zaktualizuj ją
      console.log(`Updating existing subscription for user: ${userId}`);
      user.pushSubscriptions[existingSubscriptionIndex] = subscription;
    } else {
      // Dodaj nową subskrypcję
      console.log(`Adding new subscription for user: ${userId}`);
      user.pushSubscriptions.push(subscription);
    }
    
    await user.save();

    console.log(`Subscription saved successfully for user: ${userId}`);

    // Wyślij powiadomienie testowe
    const payload = JSON.stringify({
      title: "ArteSymfoniko - Subskrypcja Aktywna",
      body: "Twoja subskrypcja powiadomień jest teraz aktywna.",
      icon: "https://artesymfoniko.vercel.app/artesymfoniko-192x192.png",
    });

    try {
      await webpush.sendNotification(subscription, payload);
      console.log(`Test notification sent successfully to user: ${userId}`);
    } catch (pushError) {
      console.error(`Failed to send test notification for user ${userId}:`, pushError);
      // Nie zwracamy błędu do klienta, bo główna operacja (zapis) się udała
    }

    res.status(201).json({ message: "Subscription saved successfully" });
  } catch (error) {
    console.error(`Error saving subscription for user ${userId}:`, error);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

export default router; 