import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Train, 
  Clock, 
  ArrowRight, 
  Armchair, 
  IndianRupee, 
  Radio, 
  CheckCircle2, 
  AlertTriangle,
  Layers
} from 'lucide-react';
import { getAvailableClassesForTrain, getFareForClass } from '../utils/pricing';

export default function TrainCard({ train, onSelectForBooking }) {
  const navigate = useNavigate();
  const availClasses = getAvailableClassesForTrain(train);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'On Time':
        return <span className="badge badge-on-time"><CheckCircle2 size={12} /> On Time</span>;
      case 'Delayed':
        return <span className="badge badge-delayed"><AlertTriangle size={12} /> Delayed</span>;
      case 'Cancelled':
        return <span className="badge badge-cancelled">Cancelled</span>;
      case 'Arrived':
        return <span className="badge badge-arrived">Arrived</span>;
      default:
        return <span className="badge badge-scheduled">Scheduled</span>;
    }
  };

  const getAvailabilityClass = (seats) => {
    if (seats <= 0) return 'badge-cancelled';
    if (seats <= 20) return 'badge-delayed';
    return 'badge-available';
  };

  return (
    <div className="glass-card interactive" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Bar: Train Name, Number & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                color: 'var(--primary)',
                background: 'var(--primary-subtle)',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border-primary)'
              }}
            >
              #{train.trainNumber}
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {train.trainName}
            </h3>
          </div>
          <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Operating Date: <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{train.journeyDate}</span>
          </div>
        </div>
        <div>
          {getStatusBadge(train.status)}
        </div>
      </div>

      {/* Station Schedule & Timeline Graphic */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '1rem',
          background: '#f8fafc',
          padding: '1.2rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        {/* Source */}
        <div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {train.departureTime}
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-body)', marginTop: '0.1rem' }}>
            {train.source}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Origin Station</div>
        </div>

        {/* Travel Line */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '130px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.35rem', fontWeight: 600 }}>
            <Clock size={12} />
            <span>Express Service</span>
          </div>
          <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
            <div style={{ height: 2, background: 'var(--border-strong)', width: '100%' }} />
            <Train
              size={18}
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'var(--primary)',
                background: '#f8fafc',
                padding: '1px'
              }}
            />
          </div>
          {train.delayMinutes > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.35rem', fontWeight: 700 }}>
              +{train.delayMinutes} min delay
            </div>
          )}
        </div>

        {/* Destination */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {train.arrivalTime}
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-body)', marginTop: '0.1rem' }}>
            {train.destination}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Destination Station</div>
        </div>
      </div>

      {/* Bottom Bar: Seats, Fare & Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--border-subtle)'
        }}
      >
        {/* Availability & Fare */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Seat Availability</div>
            <div className={`badge ${getAvailabilityClass(train.availableSeats)}`} style={{ marginTop: '0.25rem' }}>
              <Armchair size={13} />
              <span>{train.availableSeats > 0 ? `${train.availableSeats} Available` : 'Sold Out'}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Classes & Regulated Fares</div>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              {availClasses.map((code) => (
                <span
                  key={code}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '6px',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span style={{ color: 'var(--primary)' }}>{code}:</span>
                  <span>₹{getFareForClass(train, code)}</span>
                </span>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Starting From</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
              <IndianRupee size={17} />
              <span>{getFareForClass(train, availClasses[0])}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => navigate(`/train-status?trainId=${train.trainId || train.id}`)}
            className="btn btn-secondary btn-sm"
            title="View simulated train status"
          >
            <Radio size={14} />
            <span>Live Status</span>
          </button>

          <button
            onClick={() => {
              if (onSelectForBooking) {
                onSelectForBooking(train);
              } else {
                navigate(`/booking?trainId=${train.trainId || train.id}`);
              }
            }}
            disabled={train.availableSeats <= 0 || train.status === 'Cancelled'}
            className="btn btn-primary btn-sm"
          >
            <span>{train.availableSeats <= 0 ? 'Waitlist' : 'Book Ticket'}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
