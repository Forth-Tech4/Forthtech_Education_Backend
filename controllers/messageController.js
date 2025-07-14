const PrivateMessage = require('../models/PrivateMessage');

exports.markMessagesRead = async (req, res) => {
  const { senderId, receiverId } = req.body;

  if (!senderId || !receiverId) {
    return res.status(400).json({ error: 'Missing senderId or receiverId' });
  }

  try {
    const result = await PrivateMessage.updateMany(
      {
        senderId,
        receiverId,
        read: false
      },
      { $set: { read: true } }
    );

    res.json({ updated: result.modifiedCount });
  } catch (err) {
    console.error('Error updating read status:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
