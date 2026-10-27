import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  TRAVEL_CLASSES, 
  getAvailableClassesForTrain, 
  getFareForClass 
} from '../utils/pricing';
import { 
  User, 
  Calendar, 
  Armchair, 
  ShieldCheck, 
  AlertCircle,
  ArrowRight,
  Sparkles,
  ArrowLeft,
  Layers,
  Check,
  CreditCard,
  Smartphone,
  CircleCheck,
  CircleX
} from 'lucide-react';

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const trainId = searchParams.get('trainId');

  const [train, setTrain] = useState(null);
  const [loadingTrain, setLoadingTrain] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [passengerName, setPassengerName] = useState(user?.name || '');
  const [passengerAge, setPassengerAge] = useState('');
  const [passengerGender, setPassengerGender] = useState('');
  const [travelClass, setTravelClass] = useState('3A');
  const [seatCount, setSeatCount] = useState(1);
  const [journeyDate, setJourneyDate] = useState('');
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [simulatedCheckoutOpen, setSimulatedCheckoutOpen] = useState(false);
  const [simulatedProcessing, setSimulatedProcessing] = useState(false);
  const [simulatedResult, setSimulatedResult] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI_GPAY');

  useEffect(() => {
    let active = true;
    api.getPaymentConfig()
      .then((config) => { if (active) setPaymentConfig(config); })
      .catch(() => {
        if (active) {
          setPaymentConfig({ enabled: false, mode: 'unavailable', message: 'Demo payment configuration could not be loaded.' });
          setError('Unable to load payment options. Please reload before continuing.');
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!trainId) {
      navigate('/search');
      return;
    }

    api.getTrainById(trainId)
      .then((data) => {
        setTrain(data);
        setJourneyDate(data.journeyDate);
        const avail = getAvailableClassesForTrain(data);
        if (avail && avail.length > 0) {
          setTravelClass(avail[0]);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load train details.');
      })
      .finally(() => setLoadingTrain(false));
  }, [trainId, navigate]);

  const handleSeatChange = (delta) => {
    const nextVal = seatCount + delta;
    if (nextVal >= 1 && (!train || nextVal <= train.availableSeats)) {
      setSeatCount(nextVal);
    }
  };

  const classFare = train ? getFareForClass(train, travelClass) : 0;
  const totalFare = Number((classFare * seatCount).toFixed(2));
  const isCheckoutPending = pendingCheckout?.status === 'PENDING';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!passengerName.trim()) {
      setError('Passenger name is required.');
      return;
    }

    const age = Number(passengerAge);
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      setError('Please enter a valid age between 1 and 120.');
      return;
    }

    if (!passengerGender) {
      setError('Passenger gender is required.');
      return;
    }

    if (seatCount < 1) {
      setError('Seat count must be at least 1.');
      return;
    }

    if (train && seatCount > train.availableSeats) {
      setError(`Cannot book ${seatCount} seats. Only ${train.availableSeats} available.`);
      return;
    }

    try {
      setSubmitting(true);
      if (pendingCheckout?.order.provider === 'SIMULATED' && pendingCheckout.status === 'PENDING') {
        setSimulatedCheckoutOpen(true);
        return;
      }
      const bookingData = {
        trainId: train.trainId || train.id,
        journeyDate,
        passengerName: passengerName.trim(),
        passengerAge: age,
        passengerGender,
        travelClass,
        seatCount
      };
      const requestId = window.crypto.randomUUID();
      const order = await api.createPaymentOrder(bookingData, requestId);
      setPendingCheckout({ bookingData, requestId, order, status: 'PENDING' });
      setSimulatedResult(null);
      setSimulatedCheckoutOpen(true);
    } catch (err) {
      setError(err.message || 'Unable to reserve seats for checkout.');
      addToast(err.message || 'Checkout could not be started.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulatedAction = async (action) => {
    if (!pendingCheckout || simulatedProcessing) return;
    try {
      setSimulatedProcessing(true);
      setError('');
      if (action === 'approve') {
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
      const result = await api.simulatePayment(pendingCheckout.order.paymentId, action, paymentMethod);
      setSimulatedResult(result);
      setPendingCheckout((current) => current
        ? { ...current, status: result.status }
        : current);
      if (result.status === 'PAID' && result.booking) {
        addToast(`Demo payment recorded. PNR: ${result.booking.bookingReference}`, 'success');
        navigate(`/bookings/${result.booking.id}`);
      } else {
        addToast(result.message, result.status === 'FAILED' ? 'error' : 'info');
      }
    } catch (err) {
      setError(err.message || 'Unable to complete the simulated checkout.');
    } finally {
      setSimulatedProcessing(false);
    }
  };

  const resetCheckout = () => {
    setPendingCheckout(null);
    setSimulatedResult(null);
    setSimulatedCheckoutOpen(false);
    setError('');
  };

  if (loadingTrain) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div className="spinner" style={{ width: 36, height: 36, marginBottom: '1rem' }} />
        <div style={{ color: 'var(--text-muted)' }}>Loading train itinerary & fare matrix...</div>
      </div>
    );
  }

  if (!train) {
    return (
      <div className="page-wrapper">
        <div className="empty-state">
          <AlertCircle className="empty-icon" color="var(--danger)" />
          <h3 style={{ color: 'var(--text-main)' }}>Train Service Not Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>The requested railway service could not be located.</p>
          <button onClick={() => navigate('/search')} className="btn btn-primary btn-sm">
            Back to Train Search
          </button>
        </div>
      </div>
    );
  }

  const isSoldOut = train.availableSeats <= 0;
  const paymentMethods = [
    { id: 'UPI_GPAY', label: 'UPI / Google Pay', Icon: Smartphone },
    { id: 'DEBIT_CARD', label: 'Debit Card', Icon: CreditCard },
    { id: 'CREDIT_CARD', label: 'Credit Card', Icon: CreditCard }
  ];

  if (simulatedCheckoutOpen && pendingCheckout) {
    const checkoutAmount = (pendingCheckout.order.amount / 100).toFixed(2);
    const methodLabel = paymentMethods.find(({ id }) => id === paymentMethod)?.label;
    const completed = simulatedResult && simulatedResult.status !== 'PENDING';

    return (
      <div className="page-wrapper" style={{ maxWidth: '900px' }}>
        <button
          type="button"
          onClick={() => completed ? resetCheckout() : setSimulatedCheckoutOpen(false)}
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: '1.25rem' }}
          disabled={simulatedProcessing}
        >
          <ArrowLeft size={16} />
          <span>{completed ? 'Start another booking' : 'Back to passenger details'}</span>
        </button>

        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {completed ? 'Payment result' : 'Review and pay'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Confirm your journey details and choose a demo payment method.
          </p>
        </div>

        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '1.25rem', alignItems: 'start' }}>
          <section className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Journey and passenger</h2>
            {[
              ['Train', `${train.trainName} (${train.trainNumber})`],
              ['Route and schedule', `${train.source} ${train.departureTime} to ${train.destination} ${train.arrivalTime}`],
              ['Journey date', pendingCheckout.bookingData.journeyDate],
              ['Passenger', `${pendingCheckout.bookingData.passengerName}, age ${pendingCheckout.bookingData.passengerAge}, ${pendingCheckout.bookingData.passengerGender}`],
              ['Selected seats', `${pendingCheckout.bookingData.seatCount} seat(s)`],
              ['Travel class', TRAVEL_CLASSES[pendingCheckout.bookingData.travelClass]?.fullName || pendingCheckout.bookingData.travelClass],
              ['Fare', `₹${classFare} × ${pendingCheckout.bookingData.seatCount} seat(s)`],
              ['Total amount', `₹${checkoutAmount}`]
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.65rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <strong style={{ color: 'var(--text-main)', textAlign: 'right' }}>{value}</strong>
              </div>
            ))}
            <div role="note" style={{ marginTop: '1rem', padding: '0.8rem', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1e40af', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              <strong>Demo payment only. No real money is charged.</strong>
              <div>No card, UPI, or banking credentials are requested or stored.</div>
            </div>
          </section>

          <section className="glass-card" style={{ padding: '1.5rem' }}>
            {completed ? (
              <div role="status" style={{ textAlign: 'center', padding: '1rem 0' }}>
                {simulatedResult.status === 'FAILED'
                  ? <CircleX size={38} color="var(--danger)" />
                  : <CircleCheck size={38} color="var(--success)" />}
                <h2 style={{ margin: '0.75rem 0', color: 'var(--text-main)' }}>
                  {simulatedResult.status === 'CANCELLED' ? 'Payment cancelled' : simulatedResult.status === 'EXPIRED' ? 'Seat hold expired' : 'Payment not completed'}
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>{simulatedResult.message}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Any held seats have been released. No ticket was issued.</p>
                <button type="button" className="btn btn-primary" onClick={resetCheckout} style={{ marginTop: '0.5rem' }}>
                  Start another booking
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Choose payment method</h2>
                <div style={{ display: 'grid', gap: '0.65rem' }}>
                  {paymentMethods.map(({ id, label, Icon }) => {
                    const selected = paymentMethod === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        disabled={simulatedProcessing}
                        onClick={() => setPaymentMethod(id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          border: `1px solid ${selected ? 'var(--primary)' : 'var(--border-strong)'}`,
                          borderRadius: 'var(--radius-md)',
                          background: selected ? 'var(--primary-subtle)' : '#fff',
                          color: selected ? 'var(--primary)' : 'var(--text-main)',
                          padding: '0.9rem',
                          fontWeight: 700,
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <Icon size={20} />
                        <span>{label}</span>
                        {selected && <Check size={17} style={{ marginLeft: 'auto' }} />}
                      </button>
                    );
                  })}
                </div>
                {error && <div role="alert" style={{ marginTop: '0.85rem', color: 'var(--danger)' }}>{error}</div>}
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginTop: '1.1rem' }}
                  disabled={simulatedProcessing || !paymentConfig}
                  onClick={() => handleSimulatedAction('approve')}
                >
                  {simulatedProcessing ? 'Processing demo payment...' : `Pay & Confirm Ticket · ₹${checkoutAmount}`}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '0.65rem' }}
                  disabled={simulatedProcessing}
                  onClick={() => handleSimulatedAction('cancel')}
                >
                  Cancel payment
                </button>
                <div style={{ marginTop: '0.85rem', fontSize: '0.78rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {methodLabel} is for demonstration only. Booking confirmation is recorded by the server.
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: '1040px' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Search Results</span>
        </button>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Confirm Passenger & Seat Reservation
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
          Enter passenger details, review the fare, and complete secure payment to confirm seats
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '1.75rem' }} className="grid-responsive">
        {/* Left Column: Passenger Form */}
        <div>
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} color="var(--primary)" />
              <span>Primary Passenger Information</span>
            </h3>

            {error && (
              <div
                style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--danger-border)',
                  marginBottom: '1.25rem',
                  fontSize: '0.875rem'
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="pass-name">
                  <span>Passenger Full Name</span>
                  <span className="required">*</span>
                </label>
                <input
                  id="pass-name"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Priyadharshini M"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  disabled={isCheckoutPending}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="pass-age">
                    <span>Age</span>
                    <span className="required">*</span>
                  </label>
                  <input
                    id="pass-age"
                    type="number"
                    min="1"
                    max="120"
                    className="form-control"
                    value={passengerAge}
                    onChange={(e) => setPassengerAge(e.target.value)}
                    disabled={isCheckoutPending}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="pass-gender">
                    <span>Gender</span>
                    <span className="required">*</span>
                  </label>
                  <select
                    id="pass-gender"
                    className="form-control"
                    value={passengerGender}
                    onChange={(e) => setPassengerGender(e.target.value)}
                    disabled={isCheckoutPending}
                    required
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Travel Class Selector with Exact User Pricing Ranges */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={15} color="var(--primary)" />
                    <span>Select Travel Class & Berth Tier</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Official Fare Regulated
                  </span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                  {Object.entries(TRAVEL_CLASSES).map(([code, cls]) => {
                    const isSelected = travelClass === code;
                    const fare = getFareForClass(train, code);
                    return (
                      <button
                        key={code}
                        type="button"
                        disabled={isCheckoutPending}
                        onClick={() => setTravelClass(code)}
                        style={{
                          background: isSelected ? 'var(--primary-subtle)' : '#ffffff',
                          border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-strong)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.75rem 0.65rem',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.2rem',
                          transition: 'all var(--transition-fast)',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                            {cls.name}
                          </span>
                          {isSelected && <Check size={14} color="var(--primary)" />}
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                          ₹{fare}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: isSelected ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700 }}>
                          Range: {cls.rangeLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seat Count Selector */}
              <div className="form-group">
                <label className="form-label">
                  <Armchair size={15} color="var(--primary)" />
                  <span>Number of Seats to Reserve</span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: '#f8fafc',
                    padding: '0.75rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    width: 'fit-content'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSeatChange(-1)}
                    disabled={seatCount <= 1 || isCheckoutPending}
                    className="btn btn-secondary btn-sm"
                    style={{ width: 34, height: 34, padding: 0, borderRadius: '50%', fontWeight: 700 }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, minWidth: '32px', textAlign: 'center', color: 'var(--text-main)' }}>
                    {seatCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSeatChange(1)}
                    disabled={seatCount >= train.availableSeats || isCheckoutPending}
                    className="btn btn-secondary btn-sm"
                    style={{ width: 34, height: 34, padding: 0, borderRadius: '50%', fontWeight: 700 }}
                  >
                    +
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontWeight: 600 }}>
                    ({train.availableSeats} seats remaining)
                  </span>
                </div>
              </div>

              {/* Journey Date Confirmation */}
              <div className="form-group">
                <label className="form-label" htmlFor="pass-date">
                  <Calendar size={15} color="var(--accent-gold)" />
                  <span>Date of Journey</span>
                </label>
                <input
                  id="pass-date"
                  type="date"
                  className="form-control"
                  value={journeyDate}
                  onChange={(e) => setJourneyDate(e.target.value)}
                  disabled={isCheckoutPending}
                  required
                />
              </div>

              <div style={{ marginTop: '1.75rem' }}>
                <button
                  type="submit"
                  disabled={submitting || isSoldOut || !paymentConfig || paymentConfig.mode !== 'simulated' || (pendingCheckout?.status && pendingCheckout.status !== 'PENDING')}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                >
                  {submitting ? (
                    <>
                      <span className="spinner" />
                      <span>Confirming Reservation...</span>
                    </>
                  ) : isSoldOut ? (
                    <span>Train Sold Out</span>
                  ) : (
                    <>
                      <span>Review fare & continue · ₹{totalFare}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.75rem', fontWeight: 500 }}>
                  Continue to review your journey and choose a demo payment method.
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Fare Breakdown & Journey Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Train Details Box */}
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span className="badge badge-info">#{train.trainNumber}</span>
              <span className="badge badge-available">{train.availableSeats} Seats Available</span>
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>{train.trainName}</h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: '0.75rem',
                alignItems: 'center',
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                margin: '1.25rem 0',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{train.departureTime}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-body)', fontWeight: 600 }}>{train.source}</div>
              </div>
              <ArrowRight size={16} color="var(--primary)" />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{train.arrivalTime}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-body)', fontWeight: 600 }}>{train.destination}</div>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
              <ShieldCheck size={16} color="var(--success)" />
              <span>In-app journey notifications included; SMS delivery is not configured.</span>
            </div>
          </div>

          {/* Fare Estimation Card */}
          <div className="glass-card" style={{ padding: '1.75rem', border: '1px solid #bfdbfe' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={16} color="var(--primary)" />
              <span>Fare Breakdown & Dynamic Estimation</span>
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Selected Travel Class</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                  {TRAVEL_CLASSES[travelClass]?.fullName || travelClass}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Class Official Range</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.8rem' }}>
                  {TRAVEL_CLASSES[travelClass]?.rangeLabel}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Berth Fare</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>₹{classFare}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Reserved Berth Count</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>× {seatCount}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Service & Platform Charges</span>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>FREE (₹0)</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '2px dashed var(--border-subtle)',
                  paddingTop: '0.85rem',
                  fontSize: '1.3rem',
                  fontWeight: 900,
                  color: 'var(--text-main)'
                }}
              >
                <span>Total Payable</span>
                <span style={{ color: 'var(--primary)' }}>₹{totalFare}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
