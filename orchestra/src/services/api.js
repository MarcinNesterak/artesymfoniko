// Konfiguracja API
const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  "https://artesymfoniko-production.up.railway.app";

// Funkcja pomocnicza do pobierania tokena
const getAuthToken = () => {
  const user = localStorage.getItem("user");
  if (user) {
    const userData = JSON.parse(user);
    return userData.token;
  }
  return null;
};

// Funkcja pomocnicza do tworzenia headers
const getHeaders = (includeAuth = true) => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
};

// Funkcja pomocnicza do obsługi odpowiedzi
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`
    );
  }
  return response.json();
};

// Auth API
export const authAPI = {
  // Logowanie
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: getHeaders(false),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  // Rejestracja (tylko pierwszy dyrygent)
  register: async (email, password, name) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: getHeaders(false),
      body: JSON.stringify({ email, password, name }),
    });
    return handleResponse(response);
  },

  // Tworzenie muzyka (tylko dyrygent)
  createMusician: async (musicianData) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/create-musician`, {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify(musicianData),
    });
    return handleResponse(response);
  },

  // Zmiana hasła
  changePassword: async (currentPassword, newPassword) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
      method: "PATCH",
      headers: getHeaders(true),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return handleResponse(response);
  },

  // Sprawdź aktualnego użytkownika
  getCurrentUser: async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },
};

// Users API (zarządzanie muzykami)
export const usersAPI = {
  // Pobierz wszystkich muzyków (tylko dyrygent)
  getMusicians: async () => {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // Pobierz konkretnego muzyka (tylko dyrygent)
  getMusician: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // Aktualizuj dane muzyka (tylko dyrygent)
  updateMusician: async (id, musicianData) => {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      method: "PUT",
      headers: getHeaders(true),
      body: JSON.stringify(musicianData),
    });
    return handleResponse(response);
  },

  // Resetuj hasło muzyka (tylko dyrygent)
  resetMusicianPassword: async (id) => {
    const response = await fetch(
      `${API_BASE_URL}/api/users/${id}/reset-password`,
      {
        method: "PATCH",
        headers: getHeaders(true),
      }
    );
    return handleResponse(response);
  },

  // Aktywuj/dezaktywuj muzyka (tylko dyrygent)
  toggleMusicianStatus: async (id) => {
    const response = await fetch(
      `${API_BASE_URL}/api/users/${id}/toggle-status`,
      {
        method: "PATCH",
        headers: getHeaders(true),
      }
    );
    return handleResponse(response);
  },

  // Usuń muzyka (tylko dyrygent)
  deleteMusician: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      method: "DELETE",
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // Aktualizuj własny profil (muzyk)
  updateProfile: async (profileData) => {
    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: "PATCH",
      headers: getHeaders(true),
      body: JSON.stringify(profileData),
    });
    return handleResponse(response);
  },
};

// Events API
export const eventsAPI = {
  // Pobierz wydarzenia
  getEvents: async (archived) => {
    let url = `${API_BASE_URL}/api/events`;
    if (archived === true || archived === false) {
      url += `?archived=${archived}`;
    }
    const response = await fetch(url, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // Pobierz konkretne wydarzenie
  getEvent: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // Utwórz wydarzenie (tylko dyrygent)
  createEvent: async (eventData) => {
    const response = await fetch(`${API_BASE_URL}/api/events`, {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify(eventData),
    });
    return handleResponse(response);
  },

  // Aktualizuj wydarzenie (tylko dyrygent-właściciel)
  updateEvent: async (id, eventData) => {
    const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
      method: "PUT",
      headers: getHeaders(true),
      body: JSON.stringify(eventData),
    });
    return handleResponse(response);
  },

  // Usuń wydarzenie (tylko dyrygent-właściciel)
  deleteEvent: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
      method: "DELETE",
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // Zaproś muzyków do wydarzenia (tylko dyrygent-właściciel)
  inviteMusicians: async (eventId, userIds) => {
    const response = await fetch(
      `${API_BASE_URL}/api/events/${eventId}/invite`,
      {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify({ userIds }),
      }
    );
    return handleResponse(response);
  },

  // Odwołaj zaproszenie (tylko dyrygent-właściciel)
  cancelInvitation: async (eventId, invitationId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/events/${eventId}/invitations/${invitationId}`,
      {
        method: "DELETE",
        headers: getHeaders(true),
      }
    );
    return handleResponse(response);
  },

  // Usuń uczestnika z wydarzenia (tylko dyrygent-właściciel)
  removeParticipant: async (eventId, participantId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/events/${eventId}/participants/${participantId}`,
      {
        method: "DELETE",
        headers: getHeaders(true),
      }
    );
    return handleResponse(response);
  },

  // Odpowiedz na zaproszenie (muzyk)
  updateParticipationStatus: async (eventId, status) => {
    const response = await fetch(
      `${API_BASE_URL}/api/events/${eventId}/respond`,
      {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify({ status }),
      }
    );
    return handleResponse(response);
  },

  // Pobierz wiadomości dla wydarzenia
  getEventMessages: async (eventId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/events/${eventId}/messages`,
      {
        method: "GET",
        headers: getHeaders(true),
      }
    );
    return handleResponse(response);
  },

  // Wyślij wiadomość w wydarzeniu
  sendEventMessage: async (eventId, content) => {
    const response = await fetch(
      `${API_BASE_URL}/api/events/${eventId}/messages`,
      {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify({ content }),
      }
    );
    return handleResponse(response);
  },

  // Usuń wiadomość (tylko autor)
  deleteEventMessage: async (eventId, messageId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/events/${eventId}/messages/${messageId}`,
      {
        method: "DELETE",
        headers: getHeaders(true),
      }
    );
    return handleResponse(response);
  },

  // Oznacz wiadomości jako przeczytane
  markMessagesAsRead: async (eventId, messageIds) => {
    const response = await fetch(
      `${API_BASE_URL}/api/events/${eventId}/messages/mark-read`,
      {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify({ messageIds }),
      }
    );
    return handleResponse(response);
  },

  // Aktualizuj ostatnią wizytę
  updateLastView: async (eventId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/events/${eventId}/update-last-view`,
      {
        method: "PUT",
        headers: getHeaders(true),
      }
    );
    return handleResponse(response);
  },

  // Zarchiwizuj wydarzenie (tylko dyrygent-właściciel)
  archiveEvent: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/events/${id}/archive`, {
      method: 'PATCH',
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },
};

// Private Messages API
export const privateMessagesAPI = {
  // Pobierz listę konwersacji
  getConversations: async () => {
    const response = await fetch(`${API_BASE_URL}/api/private-messages/conversations`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // Pobierz historię konkretnej konwersacji
  getConversationHistory: async (otherUserId) => {
    const response = await fetch(`${API_BASE_URL}/api/private-messages/conversations/${otherUserId}`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // Wyślij wiadomość
  sendMessage: async (recipientId, content, eventId = null) => {
    const body = { recipientId, content };
    if (eventId) {
      body.eventId = eventId;
    }
    const response = await fetch(`${API_BASE_URL}/api/private-messages`, {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },
  
  // Oznacz wiadomości jako przeczytane
  markAsRead: async (conversationId) => {
    const response = await fetch(`${API_BASE_URL}/api/private-messages/read`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ conversationId }),
    });
    return handleResponse(response);
  },
};

// Storage (dane użytkownika w localStorage)
export const storage = {
  // Zapisz użytkownika
  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
  },

  // Pobierz użytkownika
  getUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  // Usuń użytkownika
  removeUser: () => {
    localStorage.removeItem("user");
  },
};