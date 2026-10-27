import React from 'react';
import { CheckCircle2, Clock, MapPin, Radio, AlertCircle } from 'lucide-react';

export default function LiveStatusTimeline({ trainStatus }) {
  if (!trainStatus) return null;

  const {
    trainNumber,
    trainName,
    source,
    destination,
    departureTime,
    arrivalTime,
    status,
    currentStation,
    delayMinutes,
    routeStations = [],
    lastUpdated
  } = trainStatus;

  const normalizedCurrent = (currentStation || '').toLowerCase();
  let currentIndex = routeStations.findIndex((s) => s.toLowerCase() === normalizedCurrent);
  if (currentIndex === -1) {
    if (status === 'Arrived') {
      currentIndex = routeStations.length - 1;
    } else if (status === 'Scheduled') {
      currentIndex = 0;
    } else {
      currentIndex = Math.floor(routeStations.length / 2);
    }
  }

  const isDelayed = delayMinutes > 0;

  return (
    <div className="glass-card" style={{ padding: '2rem' }}>
      {/* Top Banner Status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '1.75rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="badge badge-info" style={{ fontSize: '0.8rem' }}>#{trainNumber}</span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{trainName}</h2>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.35rem', fontWeight: 500 }}>
            {source} → {destination}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className={`status-dot ${isDelayed ? 'warning' : 'active'}`} />
            <span
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: isDelayed ? 'var(--warning)' : 'var(--success)'
              }}
            >
              {status} {isDelayed ? `(+${delayMinutes} mins)` : ''}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Telemetry synced: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Current Position Snapshot Box */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Current Station Position
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MapPin size={18} />
            <span>{currentStation || source}</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Origin Departure
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
            {departureTime}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Expected Arrival
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
            {arrivalTime}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Schedule Adherence
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isDelayed ? 'var(--warning)' : 'var(--success)', marginTop: '0.25rem' }}>
            {isDelayed ? `${delayMinutes}m Delayed` : 'Running On Schedule'}
          </div>
        </div>
      </div>

      {/* Visual Journey Progress Timeline */}
      <div>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Radio size={18} color="var(--primary)" />
          <span>Real-Time Route Telemetry Tracker</span>
        </h4>

        <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
          {/* Vertical Track Line */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              bottom: '12px',
              left: '23px',
              width: 3,
              background: '#cbd5e1',
              zIndex: 1
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {routeStations.map((station, idx) => {
              const isPassed = idx < currentIndex;
              const isCurrent = idx === currentIndex;

              let dotColor = '#94a3b8';
              let dotBg = '#ffffff';
              if (isPassed) {
                dotColor = 'var(--success)';
                dotBg = '#ecfdf5';
              } else if (isCurrent) {
                dotColor = isDelayed ? 'var(--warning)' : 'var(--primary)';
                dotBg = isDelayed ? '#fffbeb' : '#eff6ff';
              }

              return (
                <div
                  key={station}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    position: 'relative',
                    zIndex: 2
                  }}
                >
                  {/* Timeline Node Dot */}
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: dotBg,
                      border: `2px solid ${dotColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isCurrent ? '0 0 10px rgba(37, 99, 235, 0.4)' : 'none'
                    }}
                  >
                    {isPassed && <CheckCircle2 size={14} color="var(--success)" />}
                    {isCurrent && <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />}
                  </div>

                  {/* Station Information */}
                  <div
                    style={{
                      flex: 1,
                      background: isCurrent ? '#eff6ff' : 'transparent',
                      padding: isCurrent ? '0.75rem 1.25rem' : '0.2rem 0',
                      borderRadius: 'var(--radius-md)',
                      border: isCurrent ? '1px solid #bfdbfe' : '1px solid transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span
                        style={{
                          fontWeight: isCurrent ? 800 : isPassed ? 600 : 500,
                          color: isCurrent ? '#1e40af' : isPassed ? 'var(--text-body)' : 'var(--text-muted)',
                          fontSize: isCurrent ? '1.1rem' : '0.975rem'
                        }}
                      >
                        {station}
                      </span>
                      {isCurrent && (
                        <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                          Current Telemetry Position
                        </span>
                      )}
                      {idx === 0 && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>(Origin)</span>
                      )}
                      {idx === routeStations.length - 1 && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>(Terminus)</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
