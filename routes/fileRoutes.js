const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

router.post('/', fileController.upload.single('file'), fileController.uploadFile);
router.get('/:id', fileController.downloadFile);

module.exports = router;
