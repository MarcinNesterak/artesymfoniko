import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authAPI, usersAPI } from '../../services/api';
import '../../styles/manageMusicians.css';
import SuccessMessage from '../common/SuccessMessage';

const ManageMusicians = () => {
  const [musicians, setMusicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMusician, setEditingMusician] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    instrument: '',
    phone: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  useEffect(() => {
    fetchMusicians();
  }, []);
  
  const fetchMusicians = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await usersAPI.getMusicians();
      setMusicians(response.musicians || []);
    } catch (error) {
      console.error('Error fetching musicians:', error);
      setError('Nie udało się pobrać listy muzyków. Spróbuj odświeżyć stronę.');
    } finally {
      setLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      instrument: '',
      phone: ''
    });
    setEditingMusician(null);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAddMusician = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      const musicianData = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        instrument: formData.instrument,
        phone: formData.phone
      };
      
      const response = await authAPI.createMusician(musicianData);
      
      setSuccessMessage(`Konto utworzone pomyślnie! Dane do logowania: Email: ${formData.email} Hasło tymczasowe: ${response.temporaryPassword} Przekaż te dane muzykowi. Przy pierwszym logowaniu będzie musiał zmienić hasło.`);
      setTimeout(() => setSuccessMessage(""), 3500);
      
      // Odśwież listę muzyków
      fetchMusicians();
      
      // Resetuj formularz
      resetForm();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating musician:', error);
      setError(error.message || 'Wystąpił błąd podczas tworzenia konta muzyka');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleEditMusician = (musician) => {
    setEditingMusician(musician);
    setFormData({
      email: musician.email,
      firstName: musician.personalData?.firstName || '',
      lastName: musician.personalData?.lastName || '',
      instrument: musician.instrument || '',
      phone: musician.personalData?.phone || ''
    });
    setShowAddForm(true);
  };
  
  const handleUpdateMusician = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      const updatedData = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        instrument: formData.instrument,
        phone: formData.phone
      };
      
      await usersAPI.updateMusician(editingMusician._id, updatedData);
      
      // Odśwież listę muzyków
      fetchMusicians();
      
      // Resetuj formularz
      resetForm();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error updating musician:', error);
      setError(error.message || 'Wystąpił błąd podczas aktualizacji danych muzyka');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleResetPassword = async (musician) => {
    if (!window.confirm(`Czy na pewno chcesz zresetować hasło dla ${musician.name}?`)) {
      return;
    }
    
    try {
      const response = await usersAPI.resetMusicianPassword(musician._id);
      
      setSuccessMessage('Hasło zostało zresetowane! Nowe hasło tymczasowe: ' + response.temporaryPassword + ' Przekaż je muzykowi.');
      setTimeout(() => setSuccessMessage(""), 3500);
      
      // Odśwież listę muzyków
      fetchMusicians();
    } catch (error) {
      console.error('Error resetting password:', error);
      setSuccessMessage('Wystąpił błąd podczas resetowania hasła');
      setTimeout(() => setSuccessMessage(""), 3500);
    }
  };
  
  const toggleMusicianStatus = async (musician) => {
    const newStatus = !musician.active;
    const action = newStatus ? 'aktywować' : 'dezaktywować';
    
    if (!window.confirm(`Czy na pewno chcesz ${action} konto ${musician.name}?`)) {
      return;
    }
    
    try {
      await usersAPI.toggleMusicianStatus(musician._id);
      
      // Odśwież listę muzyków
      fetchMusicians();
    } catch (error) {
      console.error('Error toggling musician status:', error);
      setSuccessMessage('Wystąpił błąd podczas zmiany statusu konta');
      setTimeout(() => setSuccessMessage(""), 3500);
    }
  };
  
  
  
  return (
    <div className="manage-musicians">
      <div className="manage-musicians-header">
        <h1>Zarządzanie Muzykami</h1>
        <div className="header-actions">
          <Link to="/conductor/dashboard" className="btn-secondary">Powrót do Dashboard</Link>
          <button 
            onClick={() => {
              setShowAddForm(!showAddForm);
              if (showAddForm) {
                resetForm();
              }
            }} 
            className="btn-primary"
          >
            {showAddForm ? 'Anuluj' : 'Dodaj Muzyka'}
          </button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {showAddForm && (
        <div className="add-musician-form">
          <h2>{editingMusician ? 'Edytuj Muzyka' : 'Dodaj Nowego Muzyka'}</h2>
          
          <form onSubmit={editingMusician ? handleUpdateMusician : handleAddMusician}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">Imię*</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={submitting}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="lastName">Nazwisko*</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={submitting}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email*</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={submitting}
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="instrument">Instrument*</label>
                <input
                  type="text"
                  id="instrument"
                  name="instrument"
                  value={formData.instrument}
                  onChange={handleInputChange}
                  disabled={submitting}
                  placeholder="np. skrzypce, flet, wiolonczela"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Telefon</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={submitting}
                  placeholder="np. +48 123 456 789"
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }} 
                disabled={submitting}
                className="btn-secondary"
              >
                Anuluj
              </button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Zapisywanie...' : (editingMusician ? 'Zaktualizuj' : 'Utwórz Konto')}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="musicians-section">
        <h2>Lista Muzyków</h2>
        
        {loading ? (
          <p>Ładowanie listy muzyków...</p>
        ) : musicians.length > 0 ? (
          <div className="musicians-table">
            <div className="table-header">
              <div>Imię i Nazwisko</div>
              <div>Email</div>
              <div>Instrument</div>
              <div>Status</div>
              <div>Hasło</div>
              <div>Akcje</div>
            </div>
            
            {musicians.map(musician => (
              <div key={musician._id} className={`table-row ${!musician.active ? 'inactive' : ''}`} data-label="">
                <div className="musician-name" data-label="Imię i Nazwisko">
                  {musician.name}
                  {musician.isTemporaryPassword && (
                    <span className="temp-password-badge">Hasło tymczasowe</span>
                  )}
                </div>
                <div className="musician-email" data-label="Email">{musician.email}</div>
                <div className="musician-instrument" data-label="Instrument">{musician.instrument || 'Nie podano'}</div>
                <div className="musician-status" data-label="Status">
                  <span className={`status-badge ${musician.active ? 'active' : 'inactive'}`}>
                    {musician.active ? 'Aktywny' : 'Nieaktywny'}
                  </span>
                </div>
                <div className="musician-password" data-label="Hasło">
  <span className="password-display">********</span>
  <button 
    onClick={() => handleResetPassword(musician)}
    className="btn-reset-password"
    title="Resetuj hasło"
  >
    Resetuj
  </button>
</div>
                <div className="musician-actions" data-label="Akcje">
                  <button 
                    onClick={() => handleEditMusician(musician)}
                    className="btn-edit"
                    title="Edytuj dane"
                  >
                    Edytuj
                  </button>
                  <button 
                    onClick={() => toggleMusicianStatus(musician)}
                    className={`btn-toggle ${musician.active ? 'deactivate' : 'activate'}`}
                    title={musician.active ? 'Dezaktywuj konto' : 'Aktywuj konto'}
                  >
                    {musician.active ? 'Dezaktywuj' : 'Aktywuj'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Nie masz jeszcze żadnych muzyków. Dodaj pierwszego muzyka!</p>
        )}
      </div>
      <SuccessMessage message={successMessage} onClose={() => setSuccessMessage("")} />
    </div>
  );
};

export default ManageMusicians;