import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import TrainCard from '../components/TrainCard';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Ticket, 
  Radio, 
  Bell, 
  ArrowRight, 
  Sparkles
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search State with real, authentic defaults
  const [source, setSource] = useState('New Delhi');
  const [destination, setDestination] = useState('Mumbai Central');
  const [journeyDate, setJourneyDate] = useState(new Date().toISOString().split('T')[0]);
  const [stations, setStations] = useState([]);

  // Dashboard Data
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [featuredTrains, setFeaturedTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        const [stationsRes, bookingsRes, notifsRes, trainsRes] = await Promise.all([
          api.getStations(),
          api.getMyBookings(),
          api.getNotifications(),
          api.getAllTrains()
        ]);

        if (isMounted) {
          setDashboardError('');
          setStations(stationsRes.stations || []);
          setRecentBookings(bookingsRes.slice(0, 3));
          setRecentNotifications((notifsRes.notifications || []).slice(0, 4));
          setFeaturedTrains((trainsRes || []).slice(0, 4));
        }
      } catch (err) {
        if (isMounted) setDashboardError(err.message || 'Unable to load dashboard data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboard();
    return () => { isMounted = false; };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!source || !destination) return;
    navigate(`/search?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}&journeyDate=${journeyDate}`);
  };

  const quickSelectRoute = (src, dest) => {
    setSource(src);
    setDestination(dest);
  };

  const activeBookings = recentBookings.filter(b => b.status === 'CONFIRMED');

  return (
    <div className="page-wrapper">
      {/* Welcome Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            <Sparkles size={16} />
            <span>WELCOME, {user?.name?.toUpperCase() || 'PASSENGER'}</span>
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
            Book Your Next Journey
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Search train schedules, check current seat availability, and review simulated train-running updates.
          </p>
        </div>

        <button
          onClick={() => navigate('/train-status')}
          className="btn btn-secondary"
        >
          <Radio size={16} color="var(--primary)" />
          <span>Train Status</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }} role="status">
          <div className="spinner" style={{ width: 36, height: 36, marginBottom: '1rem' }} />
          <div style={{ color: 'var(--text-muted)' }}>Loading your railway dashboard...</div>
        </div>
      ) : dashboardError ? (
        <div className="empty-state" role="alert">
          <p>{dashboardError}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary btn-sm">Try Again</button>
        </div>
      ) : (
      <>
      {/* Hero Search Box */}
      <div
        className="glass-card"
        style={{
          padding: '2rem',
          marginBottom: '2.5rem',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={18} color="var(--primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>Journey Search & Seat Availability</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Direct connectivity between major railway terminals</div>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              alignItems: 'flex-end'
            }}
          >
            {/* Origin Station */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="source-input">
                <MapPin size={15} color="var(--primary)" />
                <span>Origin Station</span>
              </label>
              <input
                id="source-input"
                type="text"
                list="station-list"
                className="form-control"
                placeholder="e.g. New Delhi"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required
              />
            </div>

            {/* Destination Station */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="dest-input">
                <MapPin size={15} color="#ec4899" />
                <span>Destination Station</span>
              </label>
              <input
                id="dest-input"
                type="text"
                list="station-list"
                className="form-control"
                placeholder="e.g. Mumbai Central"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
              />
            </div>

            {/* Journey Date */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="date-input">
                <Calendar size={15} color="var(--accent-gold)" />
                <span>Date of Journey</span>
              </label>
              <input
                id="date-input"
                type="date"
                className="form-control"
                value={journeyDate}
                onChange={(e) => setJourneyDate(e.target.value)}
                required
              />
            </div>

            {/* Search Submit Button */}
            <div>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', height: '46px' }}
              >
                <Search size={18} />
                <span>Find Available Trains</span>
              </button>
            </div>
          </div>

          <datalist id="station-list">
            {stations.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </form>

        {/* Quick Popular Routes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '1.25rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>POPULAR CORRIDORS:</span>
          {[
            ['New Delhi', 'Mumbai Central'],
            ['New Delhi', 'Varanasi'],
            ['Bangalore', 'Chennai Central'],
            ['Mumbai Central', 'Ahmedabad'],
            ['Pune', 'Mumbai Central']
          ].map(([src, dst]) => (
            <button
              key={`${src}-${dst}`}
              type="button"
              onClick={() => quickSelectRoute(src, dst)}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-body)',
                borderRadius: 'var(--radius-full)',
                padding: '0.3rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-body)'; }}
            >
              {src} → {dst}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Upcoming Bookings & Recent Notifications */}
      <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
        {/* Active Journey Card (2 columns) */}
        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ticket size={20} color="var(--primary)" />
              <span>Upcoming Reserved Journey</span>
            </h3>
            <button
              onClick={() => navigate('/bookings')}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700 }}
            >
              View All Bookings →
            </button>
          </div>

          {activeBookings.length > 0 ? (
            <div className="glass-card" style={{ borderLeft: '4px solid var(--success)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <span className="badge badge-confirmed">Confirmed Booking</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-main)' }}>
                    {activeBookings[0].trainName} ({activeBookings[0].trainNumber})
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.15rem' }}>
                    PNR Reference: <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{activeBookings[0].bookingReference}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ticket Fare</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)' }}>
                    ₹{activeBookings[0].fare}
                  </div>
                </div>
              </div>

              {/* Station Route Preview */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: '1rem',
                  alignItems: 'center',
                  background: '#f8fafc',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  margin: '1.25rem 0',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>{activeBookings[0].departureTime}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-body)', fontWeight: 600 }}>{activeBookings[0].source}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{activeBookings[0].journeyDate}</div>
                  <ArrowRight size={18} color="var(--primary)" />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>{activeBookings[0].arrivalTime}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-body)', fontWeight: 600 }}>{activeBookings[0].destination}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Passenger: <strong style={{ color: 'var(--text-main)' }}>{activeBookings[0].passengerName}</strong> ({activeBookings[0].passengerAge}y, {activeBookings[0].seatCount} seats)
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => navigate(`/train-status?trainId=${activeBookings[0].trainId}`)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Radio size={14} />
                    <span>View Train Status</span>
                  </button>
                  <button
                    onClick={() => navigate(`/bookings/${activeBookings[0].id}`)}
                    className="btn btn-primary btn-sm"
                  >
                    <span>View e-Ticket</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <Ticket className="empty-icon" />
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>No active journey reserved</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Search for trains above to plan your journey and secure instant seat allocation.
                </p>
              </div>
              <button
                onClick={() => navigate('/search')}
                className="btn btn-primary btn-sm"
              >
                <span>Browse Scheduled Trains</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications Column */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={20} color="var(--accent-gold)" />
              <span>Journey Alerts</span>
            </h3>
            <button
              onClick={() => navigate('/notifications')}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700 }}
            >
              All Alerts →
            </button>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentNotifications.length > 0 ? (
              recentNotifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    background: n.isRead ? '#f8fafc' : '#f0f9ff',
                    border: n.isRead ? '1px solid var(--border-subtle)' : '1px solid #bae6fd',
                    padding: '0.9rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: n.isRead ? 'var(--text-main)' : 'var(--primary)' }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-body)', lineHeight: 1.45 }}>
                    {n.message}
                  </p>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                You have no journey notifications yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Featured Scheduled Trains Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>Featured National Express Services</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Check availability and reserve your journey on high-speed Vande Bharat and Rajdhani corridors
            </p>
          </div>
          <button
            onClick={() => navigate('/search')}
            className="btn btn-secondary btn-sm"
          >
            <span>Explore All Trains</span>
          </button>
        </div>

        {featuredTrains.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {featuredTrains.map((train) => (
              <TrainCard key={train.trainId || train.id} train={train} />
            ))}
          </div>
        ) : (
          <div className="empty-state">No train services are currently available. Try searching again later.</div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
