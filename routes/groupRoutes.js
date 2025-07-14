const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

router.get('/', groupController.getGroups);
router.post('/create', groupController.createGroup);
router.get('/user/:userId/sent-join-requests', groupController.getSentJoinRequests);
router.post('/cancel-join-request', groupController.cancelJoinRequest);

router.post('/:groupId/add-members', groupController.addMembers);
router.post('/:groupId/reject-request', groupController.rejectRequest);
router.post('/:groupId/accept-request', groupController.acceptRequest);
router.post('/:groupId/join', groupController.joinGroup);
router.post('/leave-group', groupController.leaveGroup);

module.exports = router;
