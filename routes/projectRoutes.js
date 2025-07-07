const express = require('express');
const Project = require('../models/Project.js');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/userModel.js');


// create new project
router.post('/create', async (req, res) => {
  try {
    const { creatorId, members = [] } = req.body;

    // ensure creator is in members
    const uniqueMembers = Array.from(new Set([creatorId, ...members]));

    const projectData = {
      ...req.body,
      members: uniqueMembers,
      lastActivity: new Date().toISOString(),
      lastUpdated: new Date().toDateString()
    };

    const project = await Project.create(projectData);
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to create project', error: err.message });
  }
});

// get all projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch projects', error: err.message });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const projects = await Project.find();

    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        let creator = null;
        if (mongoose.Types.ObjectId.isValid(project.creatorId)) {
          creator = await User.findById(project.creatorId).select('firstName lastName email');
        }

        return {
          ...project.toObject(),
          creator: creator ? {
            firstName: creator.firstName,
            lastName: creator.lastName,
            email: creator.email
          } : null
        };
      })
    );

    res.json(enrichedProjects);
  } catch (err) {
    console.error('Failed to fetch projects:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
