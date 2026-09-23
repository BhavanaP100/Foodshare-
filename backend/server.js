const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/match', require('./routes/match'));
app.use('/api/volunteer', require('./routes/volunteer'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/admin', require('./routes/admin'));

// Socket.io real-time events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_room', (room) => socket.join(room));

  // Volunteer joins their personal notification room so they can be
  // notified the moment an NGO assigns them a delivery.
  socket.on('join_volunteer_room', (volunteerId) => socket.join(`volunteer_${volunteerId}`));

  // NGO joins their personal notification room so they can be notified the
  // moment a volunteer marks a delivery as "delivered" and it's awaiting
  // their review/verification — even if they're on their dashboard, not
  // the specific tracking page.
  socket.on('join_ngo_room', (ngoId) => socket.join(`ngo_${ngoId}`));

  socket.on('update_location', ({ donationId, location }) => {
    io.to(`donation_${donationId}`).emit('location_update', location);
  });

  socket.on('status_change', ({ donationId, status }) => {
    io.to(`donation_${donationId}`).emit('status_update', { status });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = { app, io };