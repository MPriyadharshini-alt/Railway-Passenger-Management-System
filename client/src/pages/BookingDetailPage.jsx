import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { 
  CheckCircle2, 
  XCircle, 
  Radio, 
  Printer, 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  Train, 
  ShieldAlert, 
  IndianRupee
} from 'lucide-react';

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancellation Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.getBookingById(id)
      .then((data) => {
        if (isMounted) setBooking(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Unable to retrieve booking.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [id]);

  const handleCancelBooking = async () => {
    try {
      setCancelling(true);
      const cancellation = await api.cancelBooking(id);
      const updatedBooking = await api.getBookingById(id);
      setBooking(updatedBooking);
      setIsCancelModalOpen(false);
      addToast(cancellation.message || 'Booking successfully cancelled.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to cancel booking', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div className="spinner" style={{ width: 36, height: 36, marginBottom: '1rem' }} />
        <div style={{ color: 'var(--text-muted)' }}>Retrieving digital boarding pass...</div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="page-wrapper">
        <div className="empty-state">
          <XCircle className="empty-icon" color="var(--danger)" />
          <h3 style={{ color: 'var(--text-main)' }}>Booking Not Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>{error || 'Unable to load booking details.'}</p>
          <button onClick={() => navigate('/bookings')} className="btn btn-primary btn-sm">
            View My Bookings
          </button>
        </div>
      </div>
    );
  }

  const isCancelled = booking.status === 'CANCELLED';

  return (
    <div className="page-wrapper" style={{ maxWidth: '860px' }}>
      {/* Top Controls */}
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
        <button
          onClick={() => navigate('/bookings')}
          className="btn btn-secondary btn-sm"
        >
          <ArrowLeft size={16} />
          <span>My Bookings</span>
        </button>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => navigate(`/train-status?trainId=${booking.trainId}`)}
            className="btn btn-secondary btn-sm"
          >
            <Radio size={16} color="var(--primary)" />
            <span>View Train Status</span>
          </button>

          <button
            onClick={handlePrint}
            className="btn btn-secondary btn-sm"
            title="Print or Save PDF"
          >
            <Printer size={16} />
            <span>Print e-Ticket</span>
          </button>
        </div>
      </div>

      {/* Main Digital Boarding Pass Ticket */}
      <div
        className="glass-card"
        style={{
          padding: '2.5rem',
          border: isCancelled ? '2px solid var(--danger-border)' : '2px solid var(--border-primary)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
          backgroundColor: '#ffffff'
        }}
        id="printable-ticket"
      >
        {/* Watermark Status for Cancelled */}
        {isCancelled && (
          <div
            style={{
              position: 'absolute',
              top: '45%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-25deg)',
              fontSize: '4.5rem',
              fontWeight: 900,
              color: 'rgba(220, 38, 38, 0.12)',
              pointerEvents: 'none',
              letterSpacing: '0.15em',
              userSelect: 'none'
            }}
          >
            CANCELLED
          </div>
        )}

        {/* Ticket Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingBottom: '1.5rem',
            borderBottom: '2px dashed var(--border-strong)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                }}
              >
                <Train size={20} color="#fff" />
              </div>
              <div>
                <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                  RailPass Digital e-Ticket
                </span>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                  National Passenger System • Electronic Reservation Slip
                </div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PNR REFERENCE</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
              {booking.bookingReference}
            </div>
            <div>
              {isCancelled ? (
                <span className="badge badge-cancelled">Reservation Cancelled</span>
              ) : (
                <span className="badge badge-confirmed">Confirmed Reservation</span>
              )}
            </div>
          </div>
        </div>

        {/* Journey Details Line */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '1.5rem',
            alignItems: 'center',
            padding: '2rem 0',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)' }}>
              {booking.departureTime}
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-body)', marginTop: '0.2rem' }}>
              {booking.source}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Boarding Terminal</div>
          </div>

          <div style={{ textAlign: 'center', minWidth: '160px' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)' }}>
              {booking.trainName}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Train #{booking.trainNumber}
            </div>
            <div style={{ margin: '0.6rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ height: 2, background: 'var(--border-strong)', width: '60px' }} />
              <Train size={18} color="var(--primary)" style={{ margin: '0 8px' }} />
              <div style={{ height: 2, background: 'var(--border-strong)', width: '60px' }} />
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--accent-gold)', fontWeight: 700 }}>
              {booking.journeyDate}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)' }}>
              {booking.arrivalTime}
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-body)', marginTop: '0.2rem' }}>
              {booking.destination}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Destination Terminal</div>
          </div>
        </div>

        {/* Passenger Info Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1.25rem',
            padding: '1.75rem 0',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PRIMARY PASSENGER</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
              {booking.passengerName}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>AGE & GENDER</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
              {booking.passengerAge} yrs • {booking.passengerGender}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>TRAVEL CLASS</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
              {booking.travelClass ? `${booking.travelClass}` : 'SL'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>RESERVED BERTHS</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
              {booking.seatCount} Seat(s) Confirmed
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>TICKET FARE</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center' }}>
              <IndianRupee size={17} />
              <span>{booking.fare}</span>
            </div>
          </div>
        </div>

        <div style={{ borderBottom: '1px solid var(--border-subtle)', padding: '1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <strong>Method:</strong> {({
            UPI_GPAY: 'UPI / Google Pay',
            DEBIT_CARD: 'Debit Card',
            CREDIT_CARD: 'Credit Card'
          })[booking.paymentMethod] || booking.paymentMethod || 'Legacy booking'}{' '}
          <span style={{ margin: '0 0.5rem' }}>·</span>
          <strong>Reference:</strong> {booking.paymentReference || 'Not available'}{' '}
          <span style={{ margin: '0 0.5rem' }}>·</span>
          <strong>Status:</strong> {booking.paymentStatus || 'Historical payment status unavailable'}
          <div style={{ marginTop: '0.35rem', fontSize: '0.75rem' }}>
            {booking.simulatedPayment || booking.paymentProvider === 'SIMULATED'
              ? 'Demo payment only. No real money is charged.'
              : 'Historical payment record. This application does not process payments or refunds.'}
          </div>
        </div>

        {/* Booking reference and booking metadata */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem',
            paddingTop: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              minWidth: 100,
              minHeight: 68,
              background: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem'
            }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>PNR</span>
              <strong style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>{booking.bookingReference}</strong>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-body)', fontWeight: 600 }}>
                Booking Timestamp: {new Date(booking.createdAt).toLocaleString()}
              </div>
              {booking.cancelledAt && (
                <div style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 700, marginTop: '0.15rem' }}>
                  Cancelled at: {new Date(booking.cancelledAt).toLocaleString()}
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Keep this booking reference and carry a valid government photo ID for travel.
              </div>
            </div>
          </div>

          {/* Cancellation Trigger Button */}
          {!isCancelled && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="btn btn-danger btn-sm"
            >
              <span>Cancel Reservation</span>
            </button>
          )}
        </div>
      </div>

      {/* Cancellation Confirmation Dialog (Section 9.10) */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
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
            <ShieldAlert size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.9rem' }}>
              Are you sure you want to cancel booking <strong>{booking.bookingReference}</strong> for{' '}
              <strong>{booking.passengerName}</strong>?
              <div style={{ marginTop: '0.5rem', color: 'var(--text-body)', fontSize: '0.85rem' }}>
                • {booking.seatCount} reserved seat(s) will be returned immediately to the available quota.
                <br />
                • {booking.simulatedPayment || booking.paymentProvider === 'SIMULATED'
                  ? 'This was a demo payment; no real money was charged or refund is due.'
                  : 'This application does not process refunds for historical payments.'}
                <br />
                • A cancellation notification receipt will be added to your account.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="btn btn-secondary btn-sm"
              disabled={cancelling}
            >
              Keep My Ticket
            </button>
            <button
              type="button"
              onClick={handleCancelBooking}
              className="btn btn-danger btn-sm"
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <span className="spinner" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <span>Yes, Cancel Booking</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
