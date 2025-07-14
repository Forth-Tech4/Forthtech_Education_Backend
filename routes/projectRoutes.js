const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

router.post('/create', projectController.createProject);

router.get('/', projectController.getAllProjects);

router.get('/recent', projectController.getRecentProjects);

router.put('/update/:id', projectController.updateProject);

router.get('/:id', projectController.getProjectById);

module.exports = router;
