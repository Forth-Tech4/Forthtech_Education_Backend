const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const groupRoutes = require("./routes/groupRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require('./routes/notificationRoutes');
const projectRoutes = require('./routes/projectRoutes');
const mongoose = require('mongoose');
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');
const handleSocketConnection = require('./controllers/socketHandler'); 
const fileRoutes = require('./routes/fileRoutes');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const onlineUsers = new Map();
app.set('onlineUsersMap', onlineUsers);
app.set('io', io);
io.on('connection', (socket) => {
  handleSocketConnection(io, socket, onlineUsers); 
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use('/api', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/upload', fileRoutes);

server.listen(process.env.PORT, () => {
  console.log(`🚀 Server (HTTP + Socket.IO) running on port ${process.env.PORT}`);
});
module.exports = { app, server, io, onlineUsers };
