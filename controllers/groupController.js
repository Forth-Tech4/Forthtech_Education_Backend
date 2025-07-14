const mongoose = require('mongoose');
const Group = require('../models/Group');
const Notification = require('../models/Notification');
const User = require('../models/User');

exports.getGroups = async (req, res) => {
  const { userId } = req.query;
  try {
    let query = {};
    if (userId) {
      query = {
        $or: [{ creator: userId }, { members: userId }]
      };
    }

    const groups = await Group.find(query)
      .populate('members', 'firstName lastName email profileImage')
      .populate('creator', 'firstName lastName email profileImage')
      .populate('joinRequests', 'firstName lastName email profileImage');

    res.json(groups);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
};

exports.createGroup = async (req, res) => {
  try {
    const {
      name, description, category, creatorId,
      members, progress, nextMeeting, activeDiscussions, isPrivate
    } = req.body;

    const avatars = members.map(() => 'https://github.com/shadcn.png');

 
    const newGroup = await Group.create({
      name, description, category,
      creator: new mongoose.Types.ObjectId(creatorId),
      members: members.map(id => new mongoose.Types.ObjectId(id)),
      progress, nextMeeting, activeDiscussions,
      memberAvatars: avatars, isPrivate
    });


    const visibleTo = members.filter(id => id !== creatorId);
    const creator = await User.findById(creatorId);
    const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'Someone';
    const now = new Date();

    await Notification.create({
      title: 'New Group Created',
      description: `${creatorName} created the group "${name}". You've been added.`,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      server: 'Group System',
      visibleTo,
      isReadBy: []
    });

    res.status(201).json(newGroup);
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getSentJoinRequests = async (req, res) => {
  try {
    const groups = await Group.find({
      joinRequests: req.params.userId,
      members: { $ne: req.params.userId }
    })
    .select('name category isPrivate creator')
    .populate('creator', 'firstName lastName');

    res.json(groups);
  } catch (err) {
    console.error('Error fetching sent join requests:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.cancelJoinRequest = async (req, res) => {
  try {
    await Group.findByIdAndUpdate(req.body.groupId, {
      $pull: { joinRequests: req.body.userId }
    });
    res.json({ message: "Join request cancelled" });
  } catch (err) {
    console.error("Error cancelling join request:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.addMembers = async (req, res) => {
  const { userIds } = req.body;
  const groupId = req.params.groupId;

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const existingMemberIds = group.members.filter(Boolean).map(id => id.toString());
    const cleanUserIds = (userIds || []).filter(uid => uid);
    const newUserIds = cleanUserIds.filter(uid => !existingMemberIds.includes(uid));
    const newObjectIds = newUserIds.map(id => new mongoose.Types.ObjectId(id));

    group.members.push(...newObjectIds);
    group.memberAvatars.push(...newUserIds.map(() => 'https://github.com/shadcn.png'));

    await group.save();

    const newUsers = await User.find({ _id: { $in: newUserIds } });
    const newNames = newUsers.map(u => `${u.firstName} ${u.lastName}`).join(', ') || 'Some members';
    const now = new Date();

    if (newUserIds.length > 0) {
      await Notification.create({
        title: 'Added to Group',
        description: `${newNames} have joined your group "${group.name}"`,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        server: 'Group System',
        visibleTo: newUserIds,
        isReadBy: []
      });

      const notifyOthers = [group.creator.toString(), ...existingMemberIds].filter(uid => !newUserIds.includes(uid));
      if (notifyOthers.length > 0) {
        await Notification.create({
          title: 'New Members Added',
          description: `${newNames} have joined your group "${group.name}"`,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          server: 'Group System',
          visibleTo: notifyOthers,
          isReadBy: []
        });
      }
    }

    res.status(200).json({ message: 'Members added successfully' });
  } catch (err) {
    console.error('Error adding members:', err);
    res.status(500).json({ message: 'Failed to add members' });
  }
};

exports.rejectRequest = async (req, res) => {
  const { userId } = req.body;
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    group.joinRequests = group.joinRequests.filter(id => id.toString() !== userId);
    await group.save();
    res.status(200).json({ message: 'Request rejected successfully' });
  } catch (err) {
    console.error('Error rejecting request:', err);
    res.status(500).json({ message: 'Failed to reject request' });
  }
};

exports.acceptRequest = async (req, res) => {
  const { userId } = req.body;
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.members.includes(userId)) {
      group.members.push(userId);
      group.memberAvatars.push('https://github.com/shadcn.png');
      group.joinRequests = group.joinRequests.filter(id => id.toString() !== userId);
      await group.save();
    }

    const now = new Date();
    const newMember = await User.findById(userId);
    const newMemberName = newMember ? `${newMember.firstName} ${newMember.lastName}` : 'Someone';
    const notifyUsers = [group.creator.toString(), ...group.members.map(m => m.toString())].filter(uid => uid !== userId);

    if (notifyUsers.length > 0) {
      await Notification.create({
        title: 'New Member Joined',
        description: `${newMemberName} has joined your group "${group.name}"`,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        server: 'Group System',
        visibleTo: notifyUsers,
        isReadBy: []
      });
    }

    await Notification.create({
      title: 'Request Accepted',
      description: `Your request to join the group "${group.name}" was accepted.`,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      server: 'Group System',
      visibleTo: [userId],
      isReadBy: []
    });
const updatedGroup = await Group.findById(req.params.groupId)
  .populate('members', 'firstName lastName email profileImage')
  .populate('creator', 'firstName lastName email profileImage')
  .populate('joinRequests', 'firstName lastName email profileImage');

    res.status(200).json({ message: 'User added and request accepted', group: updatedGroup  });
  } catch (err) {
    console.error('Error accepting request:', err);
    res.status(500).json({ message: 'Failed to accept request' });
  }
};

exports.joinGroup = async (req, res) => {
  const { userId } = req.body;
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.members.includes(userId)) {
      return res.status(400).json({ message: 'Already a member.' });
    }

    if (group.isPrivate) {
      if (group.joinRequests.includes(userId)) {
        return res.status(400).json({ message: 'Join request already sent.' });
      }
      group.joinRequests.push(userId);
      await group.save();

      const newMember = await User.findById(userId);
      await Notification.create({
        title: 'New Join Request',
        description: `${newMember.firstName} ${newMember.lastName} wants to join "${group.name}"`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0],
        server: 'Group System',
        visibleTo: [group.creator.toString()],
        isReadBy: []
      });

      return res.status(200).json({ message: 'Join request sent.' });
    } else {
      group.members.push(userId);
      group.memberAvatars.push('https://github.com/shadcn.png');
      await group.save();

      const newMember = await User.findById(userId); // ✅ added here
      await Notification.create({
        title: 'New Member Joined',
        description: `${newMember.firstName} ${newMember.lastName} joined "${group.name}"`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0],
        server: 'Group System',
        visibleTo: [group.creator.toString(), ...group.members],
        isReadBy: []
      });

const updatedGroup = await Group.findById(req.params.groupId)
  .populate('members', 'firstName lastName email profileImage')
  .populate('creator', 'firstName lastName email profileImage')
  .populate('joinRequests', 'firstName lastName email profileImage');

      return res.status(200).json({ message: 'Joined public group.', group: updatedGroup });
    }
  } catch (err) {
    console.error('Error joining group:', err);
    res.status(500).json({ message: 'Failed to join group' });
  }
};


exports.leaveGroup = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.creator.toString() === userId) {
      return res.status(400).json({ message: 'Creator cannot leave.' });
    }
    group.members = group.members.filter(m => m.toString() !== userId);
    await group.save();

    const user = await User.findById(userId);
    await Notification.create({
      title: 'Member Left',
      description: `${user.firstName} ${user.lastName} left "${group.name}"`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      server: 'Group System',
      visibleTo: [group.creator.toString(), ...group.members],
      isReadBy: []
    });

    res.status(200).json({ message: 'Left group', group });
  } catch (err) {
    console.error('Error leaving group:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
