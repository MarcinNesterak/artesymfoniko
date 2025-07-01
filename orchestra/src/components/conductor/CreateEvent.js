import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsAPI, usersAPI } from '../../services/api';
import '../../styles/forms.css';

const CreateEvent = () => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('');
  const [program, setProgram] = useState('');
  const [selectedMusicians, setSelectedMusicians] = useState([]);
  const [availableMusicians, setAvailableMusicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dresscode, setDresscode] = useState('');
  const [location, setLocation] = useState('');
  const navigate = useNavigate();
  const [showDresscodeOptions, setShowDresscodeOptions] = useState(false);
  
  // Fetch available musicians
  useEffect(() => {
    const fetchMusicians = async () => {
      try {
        const response = await usersAPI.getMusicians();
        // Sort musicians alphabetically by last name
        const sortedMusicians = (response.musicians || []).sort((a, b) => {
          const lastNameA = a.name.split(' ').pop().toLowerCase();
          const lastNameB = b.name.split(' ').pop().toLowerCase();
          return lastNameA.localeCompare(lastNameB, 'pl', { sensitivity: 'base' });
        });
        setAvailableMusicians(sortedMusicians);
      } catch (error) {
        console.error('Error fetching musicians:', error);
        setError('Nie udało się pobrać listy muzyków');
      }
    };
    
    fetchMusicians();
  }, []);
  
  const handleToggleMusician = (musicianId) => {
    if (selectedMusicians.includes(musicianId)) {
      setSelectedMusicians(selectedMusicians.filter(id => id !== musicianId));
    } else {
      setSelectedMusicians([...selectedMusicians, musicianId]);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title || !date || !time) {
      setError('Wypełnij wymagane pola: tytuł, data i godzina');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Combine date and time
      const eventDateTime = new Date(`${date}T${time}`);
      
      // Create event data
      const eventData = {
        title,
        date: eventDateTime.toISOString(),
        description,
        schedule,
        program,
        inviteUserIds: selectedMusicians,
        dresscode,
        location
      };
      
      const response = await eventsAPI.createEvent(eventData);
      
      navigate(`/conductor/events/${response.event._id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      setError(error.message || 'Wystąpił błąd podczas tworzenia wydarzenia');
      setLoading(false);
    }
  };
  
  // Get today's date in YYYY-MM-DD format for min date attribute
  const today = new Date().toISOString().split('T')[0];
  
  return (
    <div className="create-event">
      <h1>Nowe wydarzenie</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="event-form">
        <div className="form-group">
          <label htmlFor="title">Nazwa wydarzenia*</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="date">Data*</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={today}
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="time">Godzina*</label>
            <input
              type="time"
              id="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Opis wydarzenia</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
            disabled={loading}
          ></textarea>
        </div>
        
        <div className="form-group">
          <label htmlFor="schedule">Harmonogram</label>
          <textarea
            id="schedule"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            rows="4"
            placeholder="Np. 17:00 - Próba generalna&#10;18:00 - Rozpoczęcie koncertu"
            disabled={loading}
          ></textarea>
        </div>
        
        <div className="form-group">
          <label htmlFor="program">Program (lista utworów)</label>
          <textarea
            id="program"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            rows="4"
            placeholder="Np. 1. Mozart - Uwertura do Wesela Figara&#10;2. Vivaldi - Cztery Pory Roku (Wiosna)"
            disabled={loading}
          ></textarea>
        </div>
        
        <div className="form-group">
      <label>Dresscode:</label>
      {showDresscodeOptions ? (
        <>
          <div className="dresscode-options">
            <div className={`dresscode-option ${dresscode === 'frak' ? 'selected' : ''}`} onClick={() => setDresscode('frak')}>
              <img src="/img/frak.png" alt="frak" />
              <span>frak, biała koszula, biała mucha</span>
            </div>
            <div className={`dresscode-option ${dresscode === 'black' ? 'selected' : ''}`} onClick={() => setDresscode('black')}>
              <img src="/img/black.png" alt="black" />
              <span>czarna koszula i czarna marynarka</span>
            </div>
            <div className={`dresscode-option ${dresscode === 'casual' ? 'selected' : ''}`} onClick={() => setDresscode('casual')}>
              <img src="/img/casual.png" alt="casual" />
              <span>biała koszula i czarna marynarka</span>
            </div>
            <div className={`dresscode-option ${dresscode === 'other' ? 'selected' : ''}`} onClick={() => setDresscode('other')}>
              <img src="/img/other.png" alt="other" />
              <span>inne</span>
            </div>
          </div>
          <button type="button" onClick={() => { setShowDresscodeOptions(false); setDresscode(''); }} className="button-secondary-small">
            Anuluj wybór stroju
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setShowDresscodeOptions(true)} className="button-secondary">
          Dodaj strój (opcjonalnie)
        </button>
      )}
    </div>
        
        <div className="form-group">
          <label htmlFor="location">Miejsce*</label>
          <input
            type="text"
            id="location"
            value={location}
            onChange={e => setLocation(e.target.value)}
            required
            disabled={loading}
            placeholder="Np. Filharmonia Krakowska, ul. Zwierzyniecka 1"
          />
        </div>
        
        <div className="form-group">
          <label>Zaproś muzyków:</label>
          <div className="musicians-list">
            {availableMusicians.length > 0 ? (
              availableMusicians.map(musician => (
                <div key={musician._id} className="musician-item">
                  <label htmlFor={`musician-${musician._id}`} className="musician-label">
                    <input
                      type="checkbox"
                      id={`musician-${musician._id}`}
                      checked={selectedMusicians.includes(musician._id)}
                      onChange={() => handleToggleMusician(musician._id)}
                      disabled={loading}
                    />
                    <span className="musician-name">{musician.name}</span>
                    <span className="musician-instrument">({musician.instrument || 'Instrument nieznany'})</span>
                  </label>
                </div>
              ))
            ) : (
              <p>Brak dostępnych muzyków.</p>
            )}
          </div>
        </div>
        
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/conductor/dashboard')} disabled={loading}>
            Anuluj
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Tworzenie...' : 'Utwórz wydarzenie'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEvent;