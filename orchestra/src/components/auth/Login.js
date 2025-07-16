import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, storage } from '../../services/api';
import { initializePushNotifications } from '../../services/pushNotifications'; // ZMIANA
import '../../styles/auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = storage.getUser();
    if (user && user.token) {
      if (user.role === 'conductor') {
        navigate('/conductor/dashboard');
      } else {
        navigate('/musician/dashboard');
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(email, password);
      
      // Zapisz dane użytkownika z tokenem
      const userData = {
        ...response.user,
        token: response.token
      };
      
      storage.setUser(userData);

      // Po udanym logowaniu, zainicjuj powiadomienia push
      await initializePushNotifications(); // ZMIANA
      
      // Przekieruj w zależności od roli i statusu hasła
      if (response.user.role === 'conductor') {
        navigate('/conductor/dashboard');
      } else {
        // Jeśli muzyk ma hasło tymczasowe, przekieruj do profilu
        if (response.requiresPasswordChange) {
          navigate('/musician/profile');
        } else {
          navigate('/musician/dashboard');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Wystąpił błąd podczas logowania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Logowanie do systemu orkiestry</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Hasło:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          
          <button type="submit" className="btn-block" disabled={loading}>
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>
        
      </div>
    </div>
  );
};

export default Login;