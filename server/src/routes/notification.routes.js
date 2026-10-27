const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');

// GET /api/notifications - Get user notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.json({
      notifications,
      unreadCount
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ message: 'Server error retrieving notifications.' });
  }
});

// PATCH /api/notifications/read-all - Mark all user notifications as read
// NOTE: Must be defined BEFORE /:id route to avoid parameter conflict
router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { $set: { isRead: true } });
    return res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Error marking all read:', err);
    return res.status(500).json({ message: 'Server error updating notifications.' });
  }
});

// PATCH /api/notifications/:id/read - Mark one notification as read
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    // Ownership enforcement
    if (notification.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to modify this notification.' });
    }

    notification.isRead = true;
    await notification.save();

    return res.json({ message: 'Notification marked as read.', id: req.params.id });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    console.error('Error updating notification:', err);
    return res.status(500).json({ message: 'Server error updating notification.' });
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    // Ownership enforcement
    if (notification.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to delete this notification.' });
    }

    await notification.deleteOne();
    return res.json({ message: 'Notification deleted.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    console.error('Error deleting notification:', err);
    return res.status(500).json({ message: 'Server error deleting notification.' });
  }
});

module.exports = router;
