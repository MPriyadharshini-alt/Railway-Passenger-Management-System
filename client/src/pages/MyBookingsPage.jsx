import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { 
  Ticket, 
  ArrowRight, 
  Calendar, 
  IndianRupee, 
  CheckCircle2, 
  XCircle, 
  Radio, 
  AlertTriangle,
  Search
} from 'lucide-react';

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Cancellation Modal state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await api.getMyBookings();
      setBookings(data);
    } catch (err) {
      addToast(err.message || 'Failed to load bookings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelClick = (booking, e) => {
    e.stopPropagation();
    setSelectedBooking(booking);
  };

  const confirmCancel = async () => {
    if (!selectedBooking) return;
    try {
      setCancelling(true);
      await api.cancelBooking(selectedBooking.id);
      addToast(`Booking ${selectedBooking.bookingReference} cancelled successfully.`, 'success');
      setSelectedBooking(null);
      await fetchBookings();
    } catch (err) {
      addToast(err.message || 'Cancellation failed', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'CONFIRMED' && b.status !== 'CONFIRMED') return false;
    if (filter === 'CANCELLED' && b.status !== 'CANCELLED') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPnr = b.bookingReference.toLowerCase().includes(q);
      const matchTrain = (b.trainName || '').toLowerCase().includes(q) || (b.trainNumber || '').toLowerCase().includes(q);
      const matchPass = (b.passengerName || '').toLowerCase().includes(q);
      return matchPnr || matchTrain || matchPass;
    }
    return true;
  });

  return (
    <div className="page-wrapper">
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
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)' }}>My Railway Bookings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Inspect ticket status, access digital boarding passes, and manage cancellations
          </p>
        </div>

        <button
          onClick={() => navigate('/search')}
          className="btn btn-primary btn-sm"
        >
          <Search size={16} />
          <span>Book New Journey</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
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
        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            background: '#ffffff',
            padding: '0.3rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {['ALL', 'CONFIRMED', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                background: filter === tab ? 'var(--primary)' : 'transparent',
                color: filter === tab ? '#ffffff' : 'var(--text-body)',
                border: 'none',
                padding: '0.45rem 1.1rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              {tab === 'ALL' ? 'All Bookings' : tab === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}
            </button>
          ))}
        </div>

        {/* Quick Search */}
        <div style={{ position: 'relative', minWidth: '250px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          <input
            type="text"
            className="form-control"
            placeholder="Search PNR, train, name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.25rem', paddingRight: '0.75rem', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="spinner" style={{ width: 36, height: 36, marginBottom: '1rem' }} />
          <div style={{ color: 'var(--text-muted)' }}>Retrieving your booking records...</div>
        </div>
      ) : filteredBookings.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredBookings.map((b) => {
            const isConfirmed = b.status === 'CONFIRMED';
            return (
              <div
                key={b.id}
                className="glass-card interactive"
                onClick={() => navigate(`/bookings/${b.id}`)}
                style={{
                  cursor: 'pointer',
                  borderLeft: isConfirmed ? '4px solid var(--success)' : '4px solid var(--danger)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  {/* Left Column: PNR & Train */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'monospace' }}>
                        {b.bookingReference}
                      </span>
                      <span className={`badge ${isConfirmed ? 'badge-confirmed' : 'badge-cancelled'}`}>
                        {isConfirmed ? 'Confirmed' : 'Cancelled'}
                      </span>
                    </div>

                    <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-main)' }}>
                      {b.trainName} ({b.trainNumber})
                    </div>

                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Passenger: <strong style={{ color: 'var(--text-body)' }}>{b.passengerName}</strong> ({b.passengerAge}y, {b.passengerGender}) • {b.seatCount} Berth(s) • <strong style={{ color: 'var(--primary)' }}>Class {b.travelClass || 'SL'}</strong>
                    </div>
                  </div>

                  {/* Route & Times */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      background: '#f8fafc',
                      padding: '0.85rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      minWidth: '280px',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>{b.departureTime}</div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>{b.source}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{b.journeyDate}</span>
                      <ArrowRight size={16} color="var(--primary)" />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>{b.arrivalTime}</div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>{b.destination}</div>
                    </div>
                  </div>

                  {/* Actions & Fare */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                      <IndianRupee size={16} />
                      <span>{b.fare}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/train-status?trainId=${b.trainId}`);
                        }}
                        className="btn btn-secondary btn-sm"
                        title="Track Train"
                      >
                        <Radio size={14} />
                      </button>

                      {isConfirmed && (
                        <button
                          onClick={(e) => handleCancelClick(b, e)}
                          className="btn btn-danger btn-sm"
                        >
                          <span>Cancel</span>
                        </button>
                      )}

                      <button
                        onClick={() => navigate(`/bookings/${b.id}`)}
                        className="btn btn-primary btn-sm"
                      >
                        <span>View e-Ticket</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <Ticket className="empty-icon" />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>No bookings found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '420px', fontSize: '0.9rem' }}>
            {filter === 'ALL'
              ? 'You do not have any bookings yet. Search trains and reserve your seats.'
              : `You have no ${filter.toLowerCase()} reservations.`}
          </p>
          <button onClick={() => navigate('/search')} className="btn btn-primary btn-sm">
            Search Available Trains
          </button>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {selectedBooking && (
        <Modal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title="Confirm Ticket Cancellation"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--danger-border)',
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'flex-start'
              }}
            >
              <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.9rem' }}>
                Are you sure you want to cancel booking <strong>{selectedBooking.bookingReference}</strong> for{' '}
                <strong>{selectedBooking.trainName}</strong>?
                <div style={{ marginTop: '0.5rem', color: 'var(--text-body)', fontSize: '0.85rem' }}>
                  This will release {selectedBooking.seatCount} seat(s) back to the train schedule.
                  {selectedBooking.paymentStatus === 'PAID' && (
                    <>
                      <br />
                      {selectedBooking.simulatedPayment || selectedBooking.paymentProvider === 'SIMULATED'
                        ? 'This was a demo payment. No real money was charged or refund is due.'
                        : 'This application does not process refunds for historical payments.'}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="btn btn-secondary btn-sm"
                disabled={cancelling}
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                className="btn btn-danger btn-sm"
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
