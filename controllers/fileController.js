const multer = require('multer');
const mongoose = require('mongoose');
const { getGFS } = require('../config/gridfs');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadFile = (req, res) => {
  try {
    const gfs = getGFS();

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const uploadStream = gfs.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', () => {
      const fileUrl = `${req.protocol}://${req.get('host')}/api/upload/${uploadStream.id}`;
      res.json({
        fileUrl,
        fileType: req.file.mimetype,
      });
    });

    uploadStream.on('error', (err) => {
      console.error('GridFS upload error:', err);
      res.status(500).json({ error: 'Upload failed' });
    });
  } catch (err) {
    console.error('GridFS not ready:', err.message);
    res.status(500).json({ error: 'File system not initialized yet. Try again later.' });
  }
};

const downloadFile = (req, res) => {
  try {
    const gfs = getGFS();
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const downloadStream = gfs.openDownloadStream(fileId);

    downloadStream.on('file', (file) => {
      res.set({
        'Content-Type': file.contentType,
        'Content-Disposition': `inline; filename="${file.filename}"`
      });
    });

    downloadStream.on('data', (chunk) => res.write(chunk));
    downloadStream.on('error', () => res.status(404).json({ error: 'File not found' }));
    downloadStream.on('end', () => res.end());
  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { upload, uploadFile, downloadFile };
