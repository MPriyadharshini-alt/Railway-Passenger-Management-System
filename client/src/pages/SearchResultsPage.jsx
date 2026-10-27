import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import TrainCard from '../components/TrainCard';
import { 
  Search, 
  MapPin, 
  Calendar, 
  SlidersHorizontal, 
  ArrowUpDown, 
  AlertCircle, 
  Train,
  CheckCircle2
} from 'lucide-react';

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const sourceParam = searchParams.get('source') || '';
  const destParam = searchParams.get('destination') || '';
  const dateParam = searchParams.get('journeyDate') || new Date().toISOString().split('T')[0];

  const [source, setSource] = useState(sourceParam);
  const [destination, setDestination] = useState(destParam);
  const [journeyDate, setJourneyDate] = useState(dateParam);
  const [stations, setStations] = useState([]);

  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Sorting
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState('departure');

  useEffect(() => {
    api.getStations()
      .then((res) => setStations(res.stations || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSource(sourceParam);
    setDestination(destParam);
    setJourneyDate(dateParam);

    let isMounted = true;
    async function fetchResults() {
      if (!sourceParam && !destParam) {
        try {
          setLoading(true);
          const res = await api.getAllTrains();
          if (isMounted) {
            setTrains(res);
            setError('');
          }
        } catch (err) {
          if (isMounted) setError(err.message || 'Failed to fetch trains.');
        } finally {
          if (isMounted) setLoading(false);
        }
        return;
      }

      if (sourceParam && destParam && sourceParam.toLowerCase() === destParam.toLowerCase()) {
        setError('Origin and destination stations cannot be the same.');
        setTrains([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const res = await api.searchTrains(sourceParam, destParam, dateParam);
        if (isMounted) {
          setTrains(res);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to search trains.');
          setTrains([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchResults();
    return () => { isMounted = false; };
  }, [sourceParam, destParam, dateParam]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!source.trim() || !destination.trim()) return;
    setSearchParams({
      source: source.trim(),
      destination: destination.trim(),
      journeyDate: journeyDate.trim()
    });
  };

  const filteredTrains = trains
    .filter((t) => {
      if (onlyAvailable && t.availableSeats <= 0) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'fare') return a.fare - b.fare;
      if (sortBy === 'seats') return b.availableSeats - a.availableSeats;
      return a.departureTime.localeCompare(b.departureTime);
    });

  return (
    <div className="page-wrapper">
      {/* Header Search Filter Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <form onSubmit={handleSearchSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              alignItems: 'flex-end'
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="res-source">
                <MapPin size={14} color="var(--primary)" />
                <span>Origin Station</span>
              </label>
              <input
                id="res-source"
                type="text"
                list="search-stations"
                className="form-control"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. New Delhi"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="res-dest">
                <MapPin size={14} color="#ec4899" />
                <span>Destination Station</span>
              </label>
              <input
                id="res-dest"
                type="text"
                list="search-stations"
                className="form-control"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Mumbai Central"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="res-date">
                <Calendar size={14} color="var(--accent-gold)" />
                <span>Date</span>
              </label>
              <input
                id="res-date"
                type="date"
                className="form-control"
                value={journeyDate}
                onChange={(e) => setJourneyDate(e.target.value)}
                required
              />
            </div>

            <div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '44px' }}>
                <Search size={16} />
                <span>Update Search</span>
              </button>
            </div>
          </div>

          <datalist id="search-stations">
            {stations.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </form>
      </div>

      {/* Results Header with Filters & Sort */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {sourceParam && destParam ? (
              <>
                Trains from <span style={{ color: 'var(--primary)' }}>{sourceParam}</span> to{' '}
                <span style={{ color: '#ec4899' }}>{destParam}</span>
              </>
            ) : (
              'All Active Railway Network Services'
            )}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Showing {filteredTrains.length} matching train service(s)
          </p>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              color: 'var(--text-main)',
              cursor: 'pointer',
              userSelect: 'none',
              fontWeight: 600
            }}
          >
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <span>Available Berths Only</span>
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowUpDown size={15} color="var(--text-muted)" />
            <select
              className="form-control"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="departure">Sort: Departure Time</option>
              <option value="fare">Sort: Lowest Fare</option>
              <option value="seats">Sort: Highest Seat Availability</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div
          style={{
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--danger-border)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.9rem'
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Train Cards List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="spinner" style={{ width: 36, height: 36, marginBottom: '1rem' }} />
          <div style={{ color: 'var(--text-muted)' }}>Searching available train services...</div>
        </div>
      ) : filteredTrains.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredTrains.map((train) => (
            <TrainCard key={train.trainId || train.id} train={train} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Train className="empty-icon" />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>No trains found for this route</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '480px', fontSize: '0.9rem' }}>
            We could not find any direct trains matching the selected route. Try selecting major corridors like New Delhi to Mumbai Central or New Delhi to Varanasi.
          </p>
          <button
            onClick={() => {
              setSource('');
              setDestination('');
              setSearchParams({});
            }}
            className="btn btn-secondary btn-sm"
          >
            <span>View All Scheduled Trains</span>
          </button>
        </div>
      )}
    </div>
  );
}
