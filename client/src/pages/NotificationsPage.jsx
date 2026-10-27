import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Ticket, 
  Radio, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      addToast(err.message || 'Failed to load notifications.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      addToast(err.message || 'Error updating notification', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
      setUnreadCount(0);
      addToast('All notifications marked as read.', 'success');
    } catch (err) {
      addToast(err.message || 'Error marking all read', 'error');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      addToast('Notification dismissed.', 'info');
    } catch (err) {
      addToast(err.message || 'Error deleting notification', 'error');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
        return <Ticket size={18} color="var(--success)" />;
      case 'BOOKING_CANCELLED':
        return <AlertTriangle size={18} color="var(--danger)" />;
      case 'TRAIN_STATUS':
        return <Radio size={18} color="var(--primary)" />;
      default:
        return <Info size={18} color="var(--accent-gold)" />;
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '860px' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)' }}>Journey Notifications</h1>
            {unreadCount > 0 && (
              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                {unreadCount} New
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Real-time updates regarding your reservations, platform alerts, and train telemetry
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn btn-secondary btn-sm"
          >
            <CheckCheck size={16} />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="spinner" style={{ width: 36, height: 36, marginBottom: '1rem' }} />
          <div style={{ color: 'var(--text-muted)' }}>Loading notifications...</div>
        </div>
      ) : notifications.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {notifications.map((n) => {
            const isUnread = !n.isRead;
            return (
              <div
                key={n.id}
                className="glass-card interactive"
                onClick={(e) => {
                  if (isUnread) handleMarkAsRead(n.id, e);
                  if (n.bookingId) navigate(`/bookings/${n.bookingId}`);
                }}
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1.25rem',
                  background: isUnread ? '#eff6ff' : '#ffffff',
                  borderLeft: isUnread ? '4px solid var(--primary)' : '1px solid var(--border-subtle)',
                  cursor: n.bookingId ? 'pointer' : 'default'
                }}
              >
                {/* Type Icon */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {getIcon(n.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <h4
                      style={{
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: isUnread ? '#1e40af' : 'var(--text-main)'
                      }}
                    >
                      {n.title}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: isUnread ? '#1e293b' : 'var(--text-body)',
                      marginTop: '0.35rem',
                      lineHeight: 1.45
                    }}
                  >
                    {n.message}
                  </p>

                  {n.bookingId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary)', fontSize: '0.825rem', fontWeight: 700, marginTop: '0.5rem' }}>
                      <span>View Related e-Ticket</span>
                      <ArrowRight size={13} />
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {isUnread && (
                    <button
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="btn btn-secondary btn-sm"
                      title="Mark as read"
                      style={{ padding: '0.35rem 0.55rem' }}
                    >
                      <CheckCheck size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(n.id, e)}
                    className="btn btn-secondary btn-sm"
                    title="Dismiss"
                    style={{ padding: '0.35rem 0.55rem', color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <Bell className="empty-icon" />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>No notifications available</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '420px', fontSize: '0.9rem' }}>
            You will receive instant alerts here whenever tickets are confirmed, cancelled, or when train running status updates.
          </p>
        </div>
      )}
    </div>
  );
}
