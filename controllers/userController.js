const mongoose = require('mongoose');
const User = require('../models/User');
const PrivateMessage = require('../models/PrivateMessage');
const GroupMessage = require('../models/GroupMessage');

exports.createUser = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }
  try {
    const user = await User.create({
      firstName, lastName, email, password,
      followList: [], requestList: []
    });
    console.log("🎉 New user signed up:", user.email);
    res.status(201).json(user);
  } catch (err) {
    console.error("Signup error:", err);
    res.status(400).json({ error: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('requestList.user', 'firstName lastName email profileImage')
      .populate('followList', 'firstName lastName email profileImage');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    const mappedUsers = users.map(u => ({
      _id: u._id, firstName: u.firstName, lastName: u.lastName,
      email: u.email, followList: u.followList, profileImage: u.profileImage
    }));
    res.json(mappedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getContactsWithLastMessage = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const followIds = user.followList || [];
    const contacts = await Promise.all(
      followIds.map(async (followId) => {
        const lastMsg = await PrivateMessage.findOne({
          $or: [
            { senderId: userId, receiverId: followId.toString() },
            { senderId: followId.toString(), receiverId: userId }
          ]
        }).sort({ timestamp: -1 });
        const followedUser = await User.findById(followId).lean();
        return {
          _id: followedUser?._id, firstName: followedUser?.firstName,
          lastName: followedUser?.lastName, email: followedUser?.email,
          profileImage: followedUser?.profileImage,
          lastMessage: lastMsg ? { message: lastMsg.message, timestamp: lastMsg.timestamp.getTime() } : null
        };
      })
    );
    res.json(contacts);
  } catch (err) {
    console.error('❌ Error fetching contacts:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, password, profileImage } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    if (password) user.password = password;
    if (profileImage) user.profileImage = profileImage;

    await user.save();
    res.json({ message: "Profile updated", user });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.patchRequest = async (req, res) => {
  const fromId = req.params.id;
  const { invitedUserId } = req.body;
  if (fromId === invitedUserId) return res.status(400).json({ error: "You can't invite yourself" });

  const sender = await User.findById(fromId);
  const receiver = await User.findById(invitedUserId);
  if (!sender || !receiver) return res.status(404).json({ error: "User not found" });

  const alreadyInvited = sender.requestList.some(r => r.user.toString() === invitedUserId);
  const alreadyFollowing = sender.followList.includes(invitedUserId);
  if (alreadyInvited || alreadyFollowing) return res.status(400).json({ error: "Already invited or followed" });

  sender.requestList.push({ user: invitedUserId, status: 'sent' });
  receiver.requestList.push({ user: fromId, status: 'pending' });

  await sender.save();
  await receiver.save();
  res.status(200).json({ message: "Request sent" });
};

exports.removeRequest = async (req, res) => {
  const { fromId, toId } = req.body;
  try {
    const sender = await User.findById(fromId);
    const receiver = await User.findById(toId);
    if (!sender || !receiver) return res.status(404).json({ error: 'User not found' });

    sender.requestList = sender.requestList.filter(req => req.user.toString() !== toId);
    receiver.requestList = receiver.requestList.filter(req => req.user.toString() !== fromId);
    await sender.save();
    await receiver.save();

    res.status(200).json({ message: 'Request removed' });
  } catch (err) {
    console.error("Remove request error:", err);
    res.status(500).json({ error: 'Server error removing request' });
  }
};

exports.acceptRequest = async (req, res) => {
  const { fromId, toId } = req.body;
  console.log(fromId,toId)
  const io = req.app.get('io');
  const onlineUsers = req.app.get('onlineUsersMap');

  if (!mongoose.Types.ObjectId.isValid(fromId) || !mongoose.Types.ObjectId.isValid(toId)) {
    return res.status(400).json({ error: 'Invalid user IDs' });
  }

  try {
    const sender = await User.findById(fromId);
    const receiver = await User.findById(toId);
    if (!sender || !receiver) return res.status(404).json({ error: 'User not found' });

    sender.requestList = sender.requestList.filter(req => req.user.toString() !== toId);
    receiver.requestList = receiver.requestList.filter(req => req.user.toString() !== fromId);

    if (!receiver.followList.includes(fromId)) receiver.followList.push(fromId);
    if (!sender.followList.includes(toId)) sender.followList.push(toId);

    await sender.save();
    await receiver.save();

    const senderSocketId = onlineUsers.get(fromId);
    const receiverSocketId = onlineUsers.get(toId);
    const messageForSender = {
      fromId: toId, toId: fromId, type: "system",
      message: `You are now connected with ${receiver.firstName} ${receiver.lastName}`,
      timestamp: new Date().toISOString()
    };
    const messageForReceiver = {
      fromId: fromId, toId: toId, type: "system",
      message: `You are now connected with ${sender.firstName} ${sender.lastName}`,
      timestamp: new Date().toISOString()
    };

    if (senderSocketId) io.to(senderSocketId).emit("system-message", messageForSender);
    if (receiverSocketId) io.to(receiverSocketId).emit("system-message", messageForReceiver);

    res.status(200).json({ message: 'Request accepted' });
  } catch (err) {
    console.error("Accept request error:", err);
    res.status(500).json({ error: 'Server error accepting request' });
  }
};

exports.deleteMultipleMessages = async (req, res) => {
  const { ids, userId, forEveryone } = req.body;
  const io = req.app.get("io");
  try {
    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));
    const userIdStr = userId.toString();

    if (forEveryone) {
      await PrivateMessage.deleteMany({ _id: { $in: objectIds } });
      const groupMessages = await GroupMessage.find({ _id: { $in: objectIds } });
      await GroupMessage.deleteMany({ _id: { $in: objectIds } });
      const groupIds = [...new Set(groupMessages.map(msg => msg.groupId?.toString()))];
      for (const groupId of groupIds) io.to(groupId).emit("delete-messages", { ids: objectIds });
    } else {
      await PrivateMessage.updateMany({ _id: { $in: objectIds } }, { $pull: { visibleTo: userIdStr } });
      await GroupMessage.updateMany({ _id: { $in: objectIds } }, { $pull: { visibleTo: userIdStr } });

      const toDelete = await GroupMessage.find({ _id: { $in: objectIds }, visibleTo: { $eq: [] } });
      const toDeleteIds = toDelete.map(msg => msg._id);
      if (toDeleteIds.length > 0) {
        await GroupMessage.deleteMany({ _id: { $in: toDeleteIds } });
        io.emit("delete-messages", { ids: toDeleteIds });
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete messages" });
  }
};

exports.getSentPendingRequests = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId).populate('requestList.user', 'firstName lastName email profileImage');
    if (!user) return res.status(404).json({ error: "User not found" });
    const sentPending = user.requestList.filter(req => req.status === 'sent').map(req => ({
      _id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      profileImage: req.user.profileImage
    }));
    res.json(sentPending);
  } catch (err) {
    console.error("❌ Error fetching sent pending requests:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
