const mongoose = require('mongoose');
require('dotenv').config();
const mongoURI = process.env.MONGO_URI || 'your-fallback-mongodb-uri-here';

const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let gfs;

conn.once('open', async () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
  console.log('✅ GridFS ready');

  await conn.db.collection('uploads.files').createIndex({ filename: 1 });
  await conn.db.collection('uploads.chunks').createIndex(
    { files_id: 1, n: 1 },
    { unique: true }
  );
  console.log('✅ GridFS collections initialized');
});

function getGFS() {
  if (!gfs) {
    throw new Error('GridFS not initialized yet!');
  }
  return gfs;
}

module.exports = { getGFS };
