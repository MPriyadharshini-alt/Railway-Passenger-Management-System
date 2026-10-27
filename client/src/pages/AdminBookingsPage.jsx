import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Users, 
  Search, 
  Ticket, 
  ArrowRight, 
  IndianRupee,
  CheckCircle2,
  XCircle,
  Filter
} from 'lucide-react';

export default function AdminBookingsPage() {
  const { addToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cancellingId, setCancellingId] = useState(null);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminBookings();
      setBookings(data);
    } catch (err) {
      addToast(err.message || 'Failed to load bookings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCancelBooking = async (booking) => {
    if (!window.confirm(`Cancel booking ${booking.bookingReference} and return its seats?`)) return;
    try {
      setCancellingId(booking.id);
      const result = await api.cancelBooking(booking.id);
      addToast(result.message || `Booking ${booking.bookingReference} cancelled.`, 'success');
      await loadBookings();
    } catch (err) {
      addToast(err.message || 'Failed to cancel booking.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.bookingReference.toLowerCase().includes(q) ||
        b.passengerName.toLowerCase().includes(q) ||
        (b.userEmail || '').toLowerCase().includes(q) ||
        b.trainName.toLowerCase().includes(q) ||
        b.trainNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>Passenger Bookings Master Ledger</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Overview of all reservations, ticket allocations, and cancellations across the railway system
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dim)'
            }}
          />
          <input
            type="text"
            className="form-control"
            placeholder="Search by PNR, passenger, email, or train..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={15} color="var(--text-dim)" />
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed Only</option>
            <option value="CANCELLED">Cancelled Only</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="spinner" style={{ width: 36, height: 36, marginBottom: '1rem' }} />
          <div style={{ color: 'var(--text-muted)' }}>Retrieving system ledger...</div>
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Booking Ref (PNR)</th>
                <th>Passenger</th>
                <th>Account Email</th>
                <th>Train Service</th>
                <th>Route</th>
                <th>Journey Date</th>
                <th>Class</th>
                <th>Seats</th>
                <th>Total Fare</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>
                      {b.bookingReference}
                    </strong>
                  </td>
                  <td>
                    <strong>{b.passengerName}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {b.passengerAge}y • {b.passengerGender}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{b.userEmail}</span>
                  </td>
                  <td>
                    <strong>{b.trainName}</strong> ({b.trainNumber})
                  </td>
                  <td>
                    {b.source} → {b.destination}
                  </td>
                  <td>{b.journeyDate}</td>
                  <td>
                    <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>{b.travelClass || 'SL'}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700 }}>{b.seatCount}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>₹{b.fare}</span>
                  </td>
                  <td>
                    <span>{({
                      UPI_GPAY: 'UPI / Google Pay',
                      DEBIT_CARD: 'Debit Card',
                      CREDIT_CARD: 'Credit Card'
                    })[b.paymentMethod] || b.paymentMethod || 'Legacy'}</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {b.simulatedPayment || b.paymentProvider === 'SIMULATED'
                        ? 'Demo payment · no money charged'
                        : b.paymentStatus || 'Legacy payment record'}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        b.status === 'CONFIRMED' ? 'badge-confirmed' : 'badge-cancelled'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td>
                    {b.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={cancellingId === b.id}
                        onClick={() => handleCancelBooking(b)}
                      >
                        {cancellingId === b.id ? 'Cancelling…' : 'Cancel booking'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <Ticket className="empty-icon" />
          <h3>No bookings match your filter</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search criteria or filter status.</p>
        </div>
      )}
    </div>
  );
}
