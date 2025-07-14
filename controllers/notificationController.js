const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

exports.createNotification = async (req, res) => {
  try {
    const { title, description, date, time, server, visibleTo } = req.body;

    const notif = await Notification.create({
      title,
      description,
      date,
      time,
      server,
      visibleTo,
      isReadBy: []
    });

    res.status(201).json(notif);
  } catch (err) {
    res.status(500).json({ message: 'Error creating notification', err });
  }
};

exports.clearUserNotifications = async (req, res) => {
  const userIdParam = req.params.userId;

  if (!ObjectId.isValid(userIdParam)) {
    return res.status(400).json({ message: 'Invalid userId format' });
  }

  const userId = new ObjectId(userIdParam);

  try {
    const notifs = await Notification.find({ visibleTo: userId });

    for (const notif of notifs) {
      notif.visibleTo = notif.visibleTo.filter(u => u.toString() !== userId.toString());
      notif.isReadBy = notif.isReadBy.filter(u => u.toString() !== userId.toString());

      if (notif.visibleTo.length === 0) {
        await Notification.findByIdAndDelete(notif._id);
      } else {
        await notif.save();
      }
    }

    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear notifications', error: err.message });
  }
};

exports.getUserNotifications = async (req, res) => {
  try {
    const notifs = await Notification.find({
      visibleTo: req.params.userId
    }).sort({ createdAt: -1 });

    res.json(notifs);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching notifications', err });
  }
};

exports.deleteNotificationForUser = async (req, res) => {
  const { id, userId } = req.params;

  try {
    const notif = await Notification.findById(id);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    notif.visibleTo = notif.visibleTo.filter(u => u.toString() !== userId);
    notif.isReadBy = notif.isReadBy.filter(u => u.toString() !== userId);

    if (notif.visibleTo.length === 0) {
      await Notification.findByIdAndDelete(id);
    } else {
      await notif.save();
    }

    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete notification', err });
  }
};

exports.markAllAsRead = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await Notification.updateMany(
      {
        visibleTo: userId,
        isReadBy: { $ne: userId }
      },
      {
        $addToSet: { isReadBy: userId }
      }
    );
    res.json({ message: 'Marked all as read', updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark notifications as read', err });
  }
};
