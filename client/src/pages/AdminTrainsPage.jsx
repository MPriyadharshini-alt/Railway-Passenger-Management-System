import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { 
  TrainTrack, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Radio, 
  CheckCircle2, 
  AlertTriangle,
  XCircle,
  IndianRupee,
  Armchair
} from 'lucide-react';

export default function AdminTrainsPage() {
  const { addToast } = useToast();

  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTrain, setSelectedTrain] = useState(null);

  // Form State
  const initialForm = {
    trainNumber: '',
    trainName: '',
    source: '',
    destination: '',
    departureTime: '08:00',
    arrivalTime: '12:00',
    journeyDate: new Date().toISOString().split('T')[0],
    totalSeats: 100,
    availableSeats: 100,
    fare: 500,
    status: 'Scheduled',
    currentStation: '',
    delayMinutes: 0
  };

  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTrains = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminTrains();
      setTrains(data);
    } catch (err) {
      addToast(err.message || 'Failed to load trains fleet.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrains();
  }, []);

  const handleOpenAdd = () => {
    setFormData(initialForm);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (train) => {
    setSelectedTrain(train);
    setFormData({
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      source: train.source,
      destination: train.destination,
      departureTime: train.departureTime,
      arrivalTime: train.arrivalTime,
      journeyDate: train.journeyDate,
      totalSeats: train.totalSeats,
      availableSeats: train.availableSeats,
      fare: train.fare,
      status: train.status,
      currentStation: train.currentStation || train.source,
      delayMinutes: train.delayMinutes || 0
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (train) => {
    setSelectedTrain(train);
    setIsDeleteModalOpen(true);
  };

  const handleFormSubmit = async (e, isEdit = false) => {
    e.preventDefault();
    setFormError('');

    if (formData.source.trim().toLowerCase() === formData.destination.trim().toLowerCase()) {
      setFormError('Source and destination stations cannot be identical.');
      return;
    }

    if (parseInt(formData.totalSeats, 10) <= 0) {
      setFormError('Total seats must be greater than 0.');
      return;
    }

    if (parseInt(formData.availableSeats, 10) > parseInt(formData.totalSeats, 10)) {
      setFormError('Available seats cannot exceed total seats.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit) {
        await api.updateAdminTrain(selectedTrain.id, formData);
        addToast(`Train ${formData.trainNumber} updated successfully.`, 'success');
        setIsEditModalOpen(false);
      } else {
        await api.createAdminTrain(formData);
        addToast(`Train ${formData.trainNumber} added to active fleet!`, 'success');
        setIsAddModalOpen(false);
      }
      await fetchTrains();
    } catch (err) {
      setFormError(err.message || 'Operation failed.');
      addToast(err.message || 'Failed to save train', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTrain) return;
    try {
      setSubmitting(true);
      await api.deleteAdminTrain(selectedTrain.id);
      addToast(`Train ${selectedTrain.trainNumber} removed from service.`, 'success');
      setIsDeleteModalOpen(false);
      await fetchTrains();
    } catch (err) {
      addToast(err.message || 'Delete operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTrains = trains.filter((t) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      t.trainNumber.toLowerCase().includes(q) ||
      t.trainName.toLowerCase().includes(q) ||
      t.source.toLowerCase().includes(q) ||
      t.destination.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    );
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
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>Train Fleet & Timetable Manager</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Maintain schedules, pricing, seat allotments, and railway routes across the network
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Add New Train</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dim)'
            }}
          />
          <input
            type="text"
            className="form-control"
            placeholder="Search trains by number, name, station, or status..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="spinner" style={{ width: 36, height: 36, marginBottom: '1rem' }} />
          <div style={{ color: 'var(--text-muted)' }}>Loading fleet records...</div>
        </div>
      ) : filteredTrains.length > 0 ? (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Train #</th>
                <th>Name</th>
                <th>Origin → Destination</th>
                <th>Departure / Arrival</th>
                <th>Date</th>
                <th>Seats (Avail/Total)</th>
                <th>Fare</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrains.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong style={{ color: 'var(--primary)' }}>{t.trainNumber}</strong>
                  </td>
                  <td>
                    <strong>{t.trainName}</strong>
                  </td>
                  <td>
                    {t.source} → {t.destination}
                  </td>
                  <td>
                    {t.departureTime} - {t.arrivalTime}
                  </td>
                  <td>{t.journeyDate}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: t.availableSeats > 10 ? 'var(--success)' : 'var(--warning)' }}>
                      {t.availableSeats}
                    </span>{' '}
                    / {t.totalSeats}
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>₹{t.fare}</span>
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
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.35rem 0.6rem' }}
                        title="Edit Train"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(t)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.35rem 0.6rem' }}
                        title="Remove Train"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <TrainTrack className="empty-icon" />
          <h3>No train records found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Click "Add New Train" to insert a new railway service.</p>
        </div>
      )}

      {/* Add / Edit Train Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={isEditModalOpen ? `Edit Train #${formData.trainNumber}` : 'Add New Railway Train'}
        maxWidth="680px"
      >
        {formError && (
          <div
            style={{
              background: 'var(--danger-bg)',
              color: '#f87171',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              marginBottom: '1rem',
              fontSize: '0.85rem'
            }}
          >
            {formError}
          </div>
        )}

        <form onSubmit={(e) => handleFormSubmit(e, isEditModalOpen)}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Train Number <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. TR1011"
                value={formData.trainNumber}
                onChange={(e) => setFormData({ ...formData, trainNumber: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Train Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Garib Rath Express"
                value={formData.trainName}
                onChange={(e) => setFormData({ ...formData, trainName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Origin Station <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Station A"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Destination Station <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Station B"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Departure Time</label>
              <input
                type="text"
                className="form-control"
                placeholder="08:00"
                value={formData.departureTime}
                onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Arrival Time</label>
              <input
                type="text"
                className="form-control"
                placeholder="12:30"
                value={formData.arrivalTime}
                onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                value={formData.journeyDate}
                onChange={(e) => setFormData({ ...formData, journeyDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Total Seats</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={formData.totalSeats}
                onChange={(e) => setFormData({ ...formData, totalSeats: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Available Seats</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={formData.availableSeats}
                onChange={(e) => setFormData({ ...formData, availableSeats: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ticket Fare (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                value={formData.fare}
                onChange={(e) => setFormData({ ...formData, fare: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Scheduled">Scheduled</option>
                <option value="On Time">On Time</option>
                <option value="Delayed">Delayed</option>
                <option value="Arrived">Arrived</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Current Station / Landmark</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Origin or Junction"
                value={formData.currentStation}
                onChange={(e) => setFormData({ ...formData, currentStation: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}
              className="btn btn-secondary btn-sm"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? 'Saving...' : isEditModalOpen ? 'Save Changes' : 'Create Train'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {selectedTrain && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Delete Train Record"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                background: 'var(--danger-bg)',
                color: '#f87171',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start'
              }}
            >
              <AlertTriangle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                Are you sure you want to permanently delete train{' '}
                <strong>
                  {selectedTrain.trainNumber} ({selectedTrain.trainName})
                </strong>
                ?
                <div style={{ marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  If passengers hold active bookings on this train, deletion will be blocked by system integrity rules.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="btn btn-secondary btn-sm"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="btn btn-danger btn-sm"
                disabled={submitting}
              >
                {submitting ? 'Deleting...' : 'Yes, Delete Record'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
