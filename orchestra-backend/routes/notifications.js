import express from "express";
import webpush from "web-push";
import { authenticate } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

// Endpoint do zapisywania subskrypcji
router.post("/subscribe", authenticate, async (req, res) => {
  const subscription = req.body;
  const userId = req.user._id; // Zmienione z req.session.userId na req.user._id z middleware

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: "Invalid subscription object" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Sprawdzenie, czy subskrypcja już istnieje
    const existingSubscription = user.pushSubscriptions.find(
      (sub) => sub.endpoint === subscription.endpoint
    );

    if (existingSubscription) {
      console.log(`Subscription already exists for user: ${userId}`);
      return res
        .status(200)
        .json({ message: "Subscription already exists" });
    }

    // Dodanie nowej subskrypcji
    user.pushSubscriptions.push(subscription);
    await user.save();

    console.log(`Subscription saved for user: ${userId}`);

    // Opcjonalnie: Wyślij powitalne powiadomienie
    const payload = JSON.stringify({
      title: "Witaj w ArteSymfoniko!",
      body: "Subskrypcja powiadomień została włączona.",
      icon: "https://artesymfoniko.vercel.app/artesymfoniko-192x192.png",
    });

    await webpush.sendNotification(subscription, payload);

    res.status(201).json({ message: "Subscription saved successfully" });
  } catch (error) {
    console.error("Error saving subscription:", error);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

export default router; 