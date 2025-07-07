const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  difficulty: String,
  contributors: { type: Number, default: 1 },
  progress: { type: Number, default: 0 },
  openIssues: { type: Number, default: 0 },
  stars: { type: Number, default: 0 },
  forks: { type: Number, default: 0 },
  lastUpdated: { type: String, default: () => new Date().toISOString() },
  githubUrl: String,
  creatorId: { type: String, required: true },
  members: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
