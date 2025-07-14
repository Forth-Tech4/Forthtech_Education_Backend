const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.post('/create', notificationController.createNotification);

router.delete('/user/:userId', notificationController.clearUserNotifications);

router.get('/:userId', notificationController.getUserNotifications);

router.delete('/:id/:userId', notificationController.deleteNotificationForUser);

router.patch('/mark-read/:userId', notificationController.markAllAsRead);

module.exports = router;
