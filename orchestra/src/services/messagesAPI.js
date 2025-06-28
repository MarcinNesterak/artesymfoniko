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
  if (response.status === 204) {
    return null;
  }
  return response.json();
};


// Private Messages API
export const privateMessagesAPI = {
  // Pobierz listę konwersacji
  getConversations: async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/private-messages/conversations`,
      {
        method: "GET",
        headers: getHeaders(true),
      }
    );
    return handleResponse(response);
  },

  // Pobierz historię konkretnej konwersacji
  getConversationHistory: async (otherUserId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/private-messages/conversations/${otherUserId}`,
      {
        method: "GET",
        headers: getHeaders(true),
      }
    );
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

  // Oznacz wiadomości jako przeczytane - POPRAWIONA WERSJA
  markAsRead: async (otherUserId) => {
    const response = await fetch(`${API_BASE_URL}/api/private-messages/conversations/${otherUserId}/read`, {
      method: 'PUT', // Właściwa metoda
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  // DODANO BRAKUJĄCĄ FUNKCJĘ
  getUnreadCount: async () => {
    const response = await fetch(`${API_BASE_URL}/api/private-messages/unread-count`, {
        method: 'GET',
        headers: getHeaders(true),
    });
    const data = await handleResponse(response);
    return data ? data.count : 0;
  },

  deleteMessage: async (messageId) => {
    const response = await fetch(`${API_BASE_URL}/api/private-messages/${messageId}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },
}; 