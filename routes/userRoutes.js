const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/', userController.createUser);
router.get('/:id', userController.getUserById);
router.get('/', userController.getAllUsers);
router.get('/:userId/contacts-with-last-message', userController.getContactsWithLastMessage);
router.put('/update/:id', userController.updateProfile);
router.patch('/:id/request', userController.patchRequest);
router.post('/remove-request', userController.removeRequest);
router.post('/accept-request', userController.acceptRequest);
router.post('/delete-multiple', userController.deleteMultipleMessages);
router.get('/:userId/sent-pending-requests', userController.getSentPendingRequests);
router.delete('/:id', userController.deleteUser);

module.exports = router;
