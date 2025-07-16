import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI, usersAPI, storage } from "../../services/api";
import "../../styles/myProfile.css";
import api from '../../services/api';
import { sendSubscriptionToServer, unsubscribeFromServer } from '../../services/notificationService';

const MyProfile = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Profile data state
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    street: "",
    city: "",
    postalCode: "",
    country: "Polska",
    pesel: "",
    bankAccountNumber: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);


  const user = storage.getUser();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError("");

      // Pobierz aktualne dane użytkownika z backendu
      const response = await authAPI.getCurrentUser();
      const userData = response.user;

      setUserData(userData);
      setPrivacyAccepted(userData.privacyPolicyAccepted || false);
      setLastUpdated(userData.updatedAt);

      // Initialize profile form with existing data
      setProfileData({
        firstName: userData.personalData?.firstName || "",
        lastName: userData.personalData?.lastName || "",
        phone: userData.personalData?.phone || "",
        street: userData.personalData?.address?.street || "",
        city: userData.personalData?.address?.city || "",
        postalCode: userData.personalData?.address?.postalCode || "",
        country: userData.personalData?.address?.country || "Polska",
        pesel: userData.personalData?.pesel || "",
        bankAccountNumber: userData.personalData?.bankAccountNumber || "",
      });

      // Show password form if user has temporary password
      if (userData.isTemporaryPassword) {
        setShowPasswordForm(true);
        setError("Musisz zmienić hasło tymczasowe na własne.");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError(
        "Nie udało się pobrać danych użytkownika. Spróbuj odświeżyć stronę."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    // Wyczyść błędy walidacji, gdy użytkownik zaczyna pisać
    if (error) {
      setError("");
    }
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setError("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Nowe hasła nie są identyczne");
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("Nowe hasło musi mieć co najmniej 6 znaków");
      setPasswordLoading(false);
      return;
    }

    try {
      // Dla hasła tymczasowego nie wymagamy obecnego hasła
      const currentPassword = userData.isTemporaryPassword
        ? null
        : passwordData.currentPassword;

      await authAPI.changePassword(currentPassword, passwordData.newPassword);

      // Update local user data
      setUserData((prev) => ({
        ...prev,
        isTemporaryPassword: false,
      }));

      // Update user in localStorage
      const updatedUser = { ...user, isTemporaryPassword: false };
      storage.setUser(updatedUser);

      setShowPasswordForm(false);
    } catch (error) {
      console.error("Error changing password:", error);
      setError(error.message || "Wystąpił błąd podczas zmiany hasła");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    // Walidacja danych przed wysłaniem
    if (profileData.pesel && !/^\d{11}$/.test(profileData.pesel)) {
      setError("Numer PESEL musi składać się z dokładnie 11 cyfr.");
      return;
    }
    if (
      profileData.bankAccountNumber &&
      !/^\d{26}$/.test(profileData.bankAccountNumber)
    ) {
      setError(
        "Numer konta bankowego musi składać się z dokładnie 26 cyfr (bez liter i spacji)."
      );
      return;
    }

    // Czyścimy komunikaty dopiero po pomyślnej walidacji
    setError("");
    setProfileLoading(true);

    try {
      // Destrukturyzacja płaskiego stanu `profileData`
      const { street, city, postalCode, country, ...otherPersonalData } =
        profileData;

      // Stworzenie poprawnej, zagnieżdżonej struktury danych dla API
      const updatedProfileData = {
        personalData: {
          ...otherPersonalData,
          address: {
            street,
            city,
            postalCode,
            country,
          },
        },
        privacyPolicyAccepted: privacyAccepted,
      };

      const response = await usersAPI.updateProfile(updatedProfileData);

      // Ustawienie daty ostatniej aktualizacji na podstawie odpowiedzi z serwera
      setUserData(response.user);
      setLastUpdated(response.user.updatedAt);
    } catch (error) {
      setError(error.message || "Nie udało się zaktualizować profilu.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");
    try {
      const response = await usersAPI.deleteCurrentUser();
      alert(response.message);
      setIsDeleteModalOpen(false);
      storage.logout();
      navigate("/login");
    } catch (err) {
      setDeleteError(
        err.message || "Nie udało się usunąć konta. Spróbuj ponownie."
      );
    }
  };

  const handleSubscriptionToggle = async () => {};

  if (loading) {
    return <div className="loading">Ładowanie danych profilu...</div>;
  }

  if (!userData) {
    return (
      <div className="error-message">
        Nie udało się załadować danych użytkownika.
      </div>
    );
  }

  return (
    <div className="my-profile">
      <div className="profile-header">
        <h1>Moje Dane</h1>
        <Link to="/musician/dashboard" className="btn-secondary">
          Powrót do Dashboard
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      {(showPasswordForm || userData.isTemporaryPassword) && (
        <div className="profile-section">
          <h2>Zmiana Hasła {userData.isTemporaryPassword && "(Wymagana)"}</h2>

          <form onSubmit={handlePasswordSubmit} className="password-form">
            {!userData.isTemporaryPassword && (
              <div className="form-group">
                <label htmlFor="currentPassword">Obecne hasło*</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  disabled={passwordLoading}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="newPassword">Nowe hasło*</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                disabled={passwordLoading}
                minLength="6"
                required
              />
              <small>Hasło musi mieć co najmniej 6 znaków</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Potwierdź nowe hasło*</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                disabled={passwordLoading}
                required
              />
            </div>

            <div className="form-actions">
              {!userData.isTemporaryPassword && (
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  disabled={passwordLoading}
                  className="btn-secondary"
                >
                  Anuluj
                </button>
              )}
              <button
                type="submit"
                disabled={passwordLoading}
                className="btn-primary"
              >
                {passwordLoading ? "Zmienianie..." : "Zmień Hasło"}
              </button>
            </div>
          </form>
        </div>
      )}

      {!userData.isTemporaryPassword && !showPasswordForm && (
        <div className="profile-section">
          <div className="section-header">
            <h2>Hasło</h2>
            <button
              onClick={() => setShowPasswordForm(true)}
              className="btn-secondary"
            >
              Zmień Hasło
            </button>
          </div>
          <p>
            Ostatnia zmiana hasła:{" "}
            {userData.isTemporaryPassword
              ? "Hasło tymczasowe"
              : "Hasło zostało zmienione"}
          </p>
        </div>
      )}

      <div className="profile-section">
        <h2>Dane Osobowe</h2>

        <form onSubmit={handleProfileSubmit} className="profile-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">Imię*</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={profileData.firstName}
                onChange={handleProfileChange}
                disabled={profileLoading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Nazwisko*</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={profileData.lastName}
                onChange={handleProfileChange}
                disabled={profileLoading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Telefon</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={profileData.phone}
              onChange={handleProfileChange}
              disabled={profileLoading}
              placeholder="np. +48 123 456 789"
            />
          </div>

          <h3>Adres</h3>

          <div className="form-group">
            <label htmlFor="street">Ulica i numer</label>
            <input
              type="text"
              id="street"
              name="street"
              value={profileData.street}
              onChange={handleProfileChange}
              disabled={profileLoading}
              placeholder="np. ul. Przykładowa 12/5"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="postalCode">Kod pocztowy</label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                value={profileData.postalCode}
                onChange={handleProfileChange}
                disabled={profileLoading}
                placeholder="np. 00-001"
              />
            </div>

            <div className="form-group">
              <label htmlFor="city">Miasto</label>
              <input
                type="text"
                id="city"
                name="city"
                value={profileData.city}
                onChange={handleProfileChange}
                disabled={profileLoading}
                placeholder="np. Warszawa"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="country">Kraj</label>
            <input
              type="text"
              id="country"
              name="country"
              value={profileData.country}
              onChange={handleProfileChange}
              disabled={profileLoading}
            />
          </div>

          <h3>Dane do umowy</h3>
          <div className="form-group">
            <label htmlFor="pesel">PESEL</label>
            <input
              type="text"
              id="pesel"
              name="pesel"
              value={profileData.pesel}
              onChange={handleProfileChange}
              disabled={profileLoading}
              placeholder="PESEL"
            />
          </div>
          <div className="form-group">
            <label htmlFor="bankAccountNumber">Numer konta bankowego</label>
            <input
              type="text"
              id="bankAccountNumber"
              name="bankAccountNumber"
              value={profileData.bankAccountNumber}
              onChange={handleProfileChange}
              disabled={profileLoading}
              placeholder="Numer konta bankowego (26 cyfr)"
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label" htmlFor="privacy-consent">
              <input
                type="checkbox"
                id="privacy-consent"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
              />
              <span>
                Wyrażam zgodę na przetwarzanie moich danych osobowych zgodnie z{" "}
                <Link
                  to="/polityka-prywatnosci"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Polityką Prywatności
                </Link>
                .
              </span>
            </label>
          </div>

          {lastUpdated && (
            <div className="form-group-static">
              <p className="update-timestamp">
                Ostatnie zmiany zapisano:{" "}
                {new Date(lastUpdated).toLocaleString("pl-PL")}
              </p>
            </div>
          )}

          <div className="form-group-static">
            <p className="privacy-consent-status">
              {privacyAccepted
                ? "Udzieliłeś zgody na przetwarzanie danych."
                : "Nie udzieliłeś zgody na przetwarzanie danych."}
            </p>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={profileLoading}
              className="btn-primary"
            >
              {profileLoading ? "Zapisywanie..." : "Zapisz Zmiany w Profilu"}
            </button>
          </div>
        </form>
      </div>

      <div className="profile-section">
        <h2>Informacje o Koncie</h2>

        <div className="account-info">
          <div className="info-item">
            <strong>Email:</strong>
            <span>{userData.email}</span>
          </div>

          <div className="info-item">
            <strong>Instrument:</strong>
            <span>{userData.instrument || "Nie przypisano"}</span>
          </div>

          <div className="info-item">
            <strong>Status konta:</strong>
            <span
              className={`status-badge ${
                userData.active ? "active" : "inactive"
              }`}
            >
              {userData.active ? "Aktywne" : "Nieaktywne"}
            </span>
          </div>
        </div>
      </div>

      <div className="profile-section danger-zone">
        <h2>Strefa Niebezpieczna</h2>
        <p>Operacje w tej strefie są nieodwracalne. Prosimy o ostrożność.</p>
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="btn-danger"
        >
          Usuń Moje Konto
        </button>
      </div>

      {isDeleteModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Czy na pewno chcesz usunąć konto?</h3>
            {deleteError && <div className="error-message">{deleteError}</div>}
            <p>
              Ta operacja jest nieodwracalna. Wszystkie Twoje dane zostaną
              usunięte z systemu.
            </p>
            <p>
              <strong>Uwaga:</strong> Jeśli posiadasz aktywne lub
              niearchiwizowanie umowy, usunięcie konta może nie być możliwe
              natychmiast. Twoje dane zostaną usunięte dopiero po wypełnieniu
              wszystkich zobowiązań prawnych i okresów archiwizacyjnych.
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="btn-secondary"
              >
                Anuluj
              </button>
              <button onClick={handleDeleteAccount} className="btn-danger">
                Tak, usuń konto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
