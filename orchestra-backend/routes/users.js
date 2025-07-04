import express from "express";
import User from "../models/User.js";
import { authenticate, requireConductor } from "../middleware/auth.js";
import { apiLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// GET /api/users - pobierz wszystkich muzyków (tylko dyrygent)
router.get("/", apiLimiter, requireConductor, async (req, res) => {
  try {
    const musicians = await User.find({ role: "musician" })
      .select("-password")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      message: "Lista muzyków",
      count: musicians.length,
      musicians,
    });
  } catch (error) {
    console.error("Get musicians error:", error);
    res.status(500).json({
      error: "Server error",
      message: "Wystąpił błąd podczas pobierania listy muzyków",
    });
  }
});

// GET /api/users/:id - pobierz konkretnego muzyka (tylko dyrygent)
router.get("/:id", apiLimiter, requireConductor, async (req, res) => {
  try {
    const musician = await User.findOne({
      _id: req.params.id,
      role: "musician",
    })
      .select("-password")
      .populate("createdBy", "name email");

    if (!musician) {
      return res.status(404).json({
        error: "Not found",
        message: "Muzyk nie został znaleziony",
      });
    }

    res.json({
      message: "Dane muzyka",
      musician,
    });
  } catch (error) {
    console.error("Get musician error:", error);
    res.status(500).json({
      error: "Server error",
      message: "Wystąpił błąd podczas pobierania danych muzyka",
    });
  }
});

// PUT /api/users/:id - aktualizuj dane muzyka (tylko dyrygent)
router.put("/:id", apiLimiter, requireConductor, async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      instrument,
      phone,
      address,
      pesel,
      bankAccountNumber,
    } = req.body;

    const musician = await User.findOne({
      _id: req.params.id,
      role: "musician",
    });

    if (!musician) {
      return res.status(404).json({
        error: "Not found",
        message: "Muzyk nie został znaleziony",
      });
    }

    // Sprawdź czy email już istnieje (jeśli się zmienił)
    if (email && email !== musician.email) {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: req.params.id },
      });

      if (existingUser) {
        return res.status(400).json({
          error: "Email exists",
          message: "Podany email jest już używany przez innego użytkownika",
        });
      }
    }

    // Aktualizuj dane
    if (email) musician.email = email.toLowerCase();
    if (firstName || lastName) {
      musician.name = `${firstName || musician.personalData?.firstName || ""} ${
        lastName || musician.personalData?.lastName || ""
      }`.trim();
    }
    if (instrument) musician.instrument = instrument;

    // Aktualizuj personalData
    if (!musician.personalData) musician.personalData = {};
    if (firstName) musician.personalData.firstName = firstName;
    if (lastName) musician.personalData.lastName = lastName;
    if (phone !== undefined) musician.personalData.phone = phone;
    if (pesel !== undefined) musician.personalData.pesel = pesel;
    if (bankAccountNumber !== undefined)
      musician.personalData.bankAccountNumber = bankAccountNumber;

    if (address) {
      if (!musician.personalData.address) musician.personalData.address = {};
      if (address.street !== undefined)
        musician.personalData.address.street = address.street;
      if (address.city !== undefined)
        musician.personalData.address.city = address.city;
      if (address.postalCode !== undefined)
        musician.personalData.address.postalCode = address.postalCode;
      if (address.country !== undefined)
        musician.personalData.address.country = address.country;
    }

    await musician.save();

    res.json({
      message: "Dane muzyka zostały zaktualizowane",
      musician: {
        id: musician._id,
        email: musician.email,
        name: musician.name,
        instrument: musician.instrument,
        personalData: musician.personalData,
        active: musician.active,
      },
    });
  } catch (error) {
    console.error("Update musician error:", error);
    res.status(500).json({
      error: "Server error",
      message: "Wystąpił błąd podczas aktualizacji danych muzyka",
    });
  }
});

// PATCH /api/users/:id/reset-password - resetuj hasło muzyka (tylko dyrygent)
router.patch(
  "/:id/reset-password",
  apiLimiter,
  requireConductor,
  async (req, res) => {
    try {
      const musician = await User.findOne({
        _id: req.params.id,
        role: "musician",
      });

      if (!musician) {
        return res.status(404).json({
          error: "Not found",
          message: "Muzyk nie został znaleziony",
        });
      }

      // Wygeneruj nowe hasło tymczasowe
      const newTempPassword = "haslo123";

      musician.password = newTempPassword;
      musician.isTemporaryPassword = true;
      await musician.save();

      res.json({
        message: "Hasło zostało zresetowane",
        musician: {
          id: musician._id,
          name: musician.name,
          email: musician.email,
        },
        temporaryPassword: newTempPassword,
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        error: "Server error",
        message: "Wystąpił błąd podczas resetowania hasła",
      });
    }
  }
);

// PATCH /api/users/:id/toggle-status - aktywuj/dezaktywuj muzyka (tylko dyrygent)
router.patch(
  "/:id/toggle-status",
  apiLimiter,
  requireConductor,
  async (req, res) => {
    try {
      const musician = await User.findOne({
        _id: req.params.id,
        role: "musician",
      });

      if (!musician) {
        return res.status(404).json({
          error: "Not found",
          message: "Muzyk nie został znaleziony",
        });
      }

      musician.active = !musician.active;
      await musician.save();

      res.json({
        message: `Konto muzyka zostało ${
          musician.active ? "aktywowane" : "dezaktywowane"
        }`,
        musician: {
          id: musician._id,
          name: musician.name,
          email: musician.email,
          active: musician.active,
        },
      });
    } catch (error) {
      console.error("Toggle status error:", error);
      res.status(500).json({
        error: "Server error",
        message: "Wystąpił błąd podczas zmiany statusu konta",
      });
    }
  }
);

// DELETE /api/users/:id - usuń muzyka (tylko dyrygent)
router.delete("/:id", requireConductor, async (req, res) => {
  try {
    const musician = await User.findOne({
      _id: req.params.id,
      role: "musician",
    });

    if (!musician) {
      return res.status(404).json({
        error: "Not found",
        message: "Muzyk nie został znaleziony",
      });
    }

    // Sprawdź czy muzyk ma jakieś aktywne uczestnictwa
    const activeParticipations = await User.model(
      "Participation"
    ).countDocuments({
      userId: req.params.id,
      // Można dodać sprawdzenie czy ma nadchodzące wydarzenia
    });

    if (activeParticipations > 0) {
      return res.status(400).json({
        error: "Cannot delete",
        message:
          "Nie można usunąć muzyka który ma aktywne uczestnictwa w wydarzeniach",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: "Konto muzyka zostało usunięte",
      deletedMusician: {
        id: musician._id,
        name: musician.name,
        email: musician.email,
      },
    });
  } catch (error) {
    console.error("Delete musician error:", error);
    res.status(500).json({
      error: "Server error",
      message: "Wystąpił błąd podczas usuwania konta muzyka",
    });
  }
});

// PATCH /api/users/profile - aktualizuj własny profil (zalogowany użytkownik)
router.patch("/profile", authenticate, async (req, res) => {
  try {
    const { firstName, lastName, phone, address, pesel, bankAccountNumber } =
      req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        error: "Not found",
        message: "Użytkownik nie został znaleziony",
      });
    }

    // Aktualizuj dane
    if (firstName || lastName) {
      const newFirstName = firstName || user.personalData.firstName;
      const newLastName = lastName || user.personalData.lastName;
      user.name = `${newFirstName} ${newLastName}`.trim();
    }

    // Aktualizuj personalData
    if (!user.personalData) user.personalData = {};
    if (firstName) user.personalData.firstName = firstName;
    if (lastName) user.personalData.lastName = lastName;
    if (phone !== undefined) user.personalData.phone = phone;
    if (pesel !== undefined) user.personalData.pesel = pesel;
    if (bankAccountNumber !== undefined)
      user.personalData.bankAccountNumber = bankAccountNumber;

    if (address) {
      if (!user.personalData.address) user.personalData.address = {};
      if (address.street !== undefined)
        user.personalData.address.street = address.street;
      if (address.city !== undefined)
        user.personalData.address.city = address.city;
      if (address.postalCode !== undefined)
        user.personalData.address.postalCode = address.postalCode;
      if (address.country !== undefined)
        user.personalData.address.country = address.country;
    }

    await user.save();

    // Zwróć zaktualizowane dane użytkownika
    const updatedUser = await User.findById(req.user._id).select("-password");

    res.json({
      message: "Dane profilu zostały zaktualizowane",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      error: "Server error",
      message: "Wystąpił błąd podczas aktualizacji profilu",
    });
  }
});

export default router;
