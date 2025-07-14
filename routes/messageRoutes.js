const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.patch('/messages/read', messageController.markMessagesRead);

module.exports = router;
