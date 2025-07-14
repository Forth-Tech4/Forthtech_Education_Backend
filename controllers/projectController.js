const Project = require('../models/Project.js');
const User = require('../models/User.js');
const mongoose = require('mongoose');

exports.createProject = async (req, res) => {
  try {
    const { creatorId, members = [] } = req.body;

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
};

exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch projects', error: err.message });
  }
};

exports.getRecentProjects = async (req, res) => {
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
};

exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    let members = req.body.members || [];
    if (req.body.creatorId && !members.includes(req.body.creatorId)) {
      members.push(req.body.creatorId);
    }
    members = Array.from(new Set(members));

    const updateData = {
      ...req.body,
      members,
      lastActivity: new Date().toISOString(),
      lastUpdated: new Date().toDateString()
    };

    const updatedProject = await Project.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(updatedProject);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ message: 'Failed to update project', error: err.message });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch project', error: err.message });
  }
};
