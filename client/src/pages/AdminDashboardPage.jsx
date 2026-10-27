import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { 
  TrainTrack, 
  Ticket, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Radio, 
  Plus, 
  Sparkles, 
  ArrowRight,
  Clock,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [stats, setStats] = useState({
    totalTrains: 0,
    totalBookings: 0,
    activeBookings: 0,
    cancelledBookings: 0,
    totalUsers: 0,
    demoPayments: 0,
    demoPaymentAmount: 0,
    realRevenue: 0
  });

  const [trains, setTrains] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Status Update Modal state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTrainId, setStatusTrainId] = useState('');
  const [statusVal, setStatusVal] = useState('On Time');
  const [currentStation, setCurrentStation] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, trainsData, bookingsData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminTrains(),
        api.getAdminBookings()
      ]);
      setStats(statsData);
      setTrains(trainsData);
      setRecentBookings(bookingsData.slice(0, 5));
      if (trainsData.length > 0 && !statusTrainId) {
        setStatusTrainId(trainsData[0].id);
        setCurrentStation(trainsData[0].currentStation || trainsData[0].source);
        setStatusVal(trainsData[0].status || 'On Time');
        setDelayMinutes(trainsData[0].delayMinutes || 0);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load admin data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenStatusModal = (train) => {
    if (train) {
      setStatusTrainId(train.id);
      setStatusVal(train.status);
      setCurrentStation(train.currentStation || train.source);
      setDelayMinutes(train.delayMinutes || 0);
    }
    setIsStatusModalOpen(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      setUpdatingStatus(true);
      const res = await api.updateTrainStatus(statusTrainId, {
        status: statusVal,
        currentStation: currentStation.trim(),
        delayMinutes: parseInt(delayMinutes, 10) || 0
      });
      addToast(res.message || 'Train status updated and passengers notified!', 'success');
      setIsStatusModalOpen(false);
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="page-wrapper">
      {/* Top Banner */}
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--warning)', fontSize: '0.875rem', fontWeight: 700 }}>
            <ShieldCheck size={16} />
            <span>CENTRAL RAILWAY OPERATIONS & MASTER DATA</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>System Administration Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Manage train schedules, seat inventories, fares, and passenger advisories
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => handleOpenStatusModal(trains[0])}
            className="btn btn-secondary btn-sm"
            disabled={trains.length === 0}
          >
            <Radio size={16} color="var(--primary)" />
            <span>Update Live Status</span>
          </button>
          <button
            onClick={() => navigate('/admin/trains')}
            className="btn btn-primary btn-sm"
          >
            <Plus size={16} />
            <span>Manage Trains Fleet</span>
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <strong>Demo payment ledger</strong>
        <span>
          {stats.demoPayments} confirmed demo tickets · ₹{stats.demoPaymentAmount.toLocaleString('en-IN')} simulated fare · Real revenue: ₹{stats.realRevenue.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Operational Metric Cards Grid */}
      <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
        {/* Total Trains */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              border: '1px solid var(--border-primary)'
            }}
          >
            <TrainTrack size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Active Fleet Trains
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.1 }}>
              {stats.totalTrains}
            </div>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-md)',
              background: '#f5f3ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              border: '1px solid #ddd6fe'
            }}
          >
            <Ticket size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Total Bookings Issued
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.1 }}>
              {stats.totalBookings}
            </div>
          </div>
        </div>

        {/* Confirmed Bookings */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-md)',
              background: 'var(--success-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--success)',
              border: '1px solid var(--success-border)'
            }}
          >
            <CheckCircle2 size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Active Confirmed
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--success)', lineHeight: 1.1 }}>
              {stats.activeBookings}
            </div>
          </div>
        </div>

        {/* Cancelled Bookings */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--danger)',
              border: '1px solid var(--danger-border)'
            }}
          >
            <XCircle size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Cancelled Bookings
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--danger)', lineHeight: 1.1 }}>
              {stats.cancelledBookings}
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Overview & Quick Status Actions */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>Fleet Operational Status</h3>
          <button onClick={() => navigate('/admin/trains')} className="btn btn-secondary btn-sm">
            Full Train Fleet Manager →
          </button>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Train #</th>
                <th>Name</th>
                <th>Route</th>
                <th>Departure / Arrival</th>
                <th>Seats (Avail/Total)</th>
                <th>Status</th>
                <th>Live Telemetry Position</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {trains.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong style={{ color: 'var(--primary)' }}>#{t.trainNumber}</strong>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--text-main)' }}>{t.trainName}</strong>
                  </td>
                  <td>
                    {t.source} → {t.destination}
                  </td>
                  <td>
                    {t.departureTime} - {t.arrivalTime}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: t.availableSeats > 15 ? 'var(--success)' : 'var(--warning)' }}>
                      {t.availableSeats}
                    </span>{' '}
                    / {t.totalSeats}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        t.status === 'On Time'
                          ? 'badge-on-time'
                          : t.status === 'Delayed'
                          ? 'badge-delayed'
                          : t.status === 'Cancelled'
                          ? 'badge-cancelled'
                          : 'badge-scheduled'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-body)', fontWeight: 600 }}>
                      {t.currentStation || t.source} {t.delayMinutes > 0 ? `(+${t.delayMinutes}m)` : ''}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleOpenStatusModal(t)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    >
                      <Radio size={12} color="var(--primary)" />
                      <span>Update Status</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Bookings Overview */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>Recent System Bookings</h3>
          <button onClick={() => navigate('/admin/bookings')} className="btn btn-secondary btn-sm">
            View All Passenger Bookings →
          </button>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Booking Ref (PNR)</th>
                <th>Passenger</th>
                <th>Train</th>
                <th>Journey Date</th>
                <th>Seats</th>
                <th>Fare</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{b.bookingReference}</strong>
                  </td>
                  <td>
                    <strong>{b.passengerName}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.userEmail}</div>
                  </td>
                  <td>
                    {b.trainName} ({b.trainNumber})
                  </td>
                  <td>{b.journeyDate}</td>
                  <td>{b.seatCount}</td>
                  <td>₹{b.fare}</td>
                  <td>
                    <span className={`badge ${b.status === 'CONFIRMED' ? 'badge-confirmed' : 'badge-cancelled'}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Live Status Modal with Passenger Notification Broadcast */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Train Running Status & Alert Passengers"
      >
        <form onSubmit={handleStatusSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="status-train-select">
              Select Train Service
            </label>
            <select
              id="status-train-select"
              className="form-control"
              value={statusTrainId}
              onChange={(e) => {
                const id = e.target.value;
                setStatusTrainId(id);
                const match = trains.find((t) => t.id === id);
                if (match) {
                  setStatusVal(match.status);
                  setCurrentStation(match.currentStation || match.source);
                  setDelayMinutes(match.delayMinutes || 0);
                }
              }}
              required
            >
              {trains.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.trainNumber} - {t.trainName} ({t.source} → {t.destination})
                </option>
              ))}
            </select>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="status-select">
                Operational Status
              </label>
              <select
                id="status-select"
                className="form-control"
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
              >
                <option value="On Time">On Time</option>
                <option value="Delayed">Delayed</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Arrived">Arrived</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="status-delay">
                Delay (Minutes)
              </label>
              <input
                id="status-delay"
                type="number"
                min="0"
                className="form-control"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="status-station">
              Current Station / Landmark Point
            </label>
            <input
              id="status-station"
              type="text"
              className="form-control"
              placeholder="e.g. Kanpur Central"
              value={currentStation}
              onChange={(e) => setCurrentStation(e.target.value)}
              required
            />
          </div>

          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
              fontSize: '0.825rem',
              color: 'var(--text-body)',
              marginBottom: '1.25rem'
            }}
          >
            📢 <strong>Instant Passenger Broadcast:</strong> Submitting this update will automatically generate a journey status alert in the notification center of every passenger holding confirmed tickets on this service.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="btn btn-secondary btn-sm"
              disabled={updatingStatus}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={updatingStatus}
            >
              {updatingStatus ? 'Updating...' : 'Publish Status Update'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
