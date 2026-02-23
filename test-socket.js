const { io } = require('socket.io-client');
const fs = require('fs');

// We need a valid token to connect.
// Since we don't have one easily, we'll just connect and see if it rejects or accepts.
// But wait, the gateway requires a token:
// let token = client.handshake.auth?.token || client.handshake.headers?.authorization;
// If no token, it disconnects. We need a token.

const token = process.argv[2];

if (!token) {
    console.log('Please provide a JWT token as an argument');
    process.exit(1);
}

const url = 'http://localhost:8082/attendance';

console.log(`Connecting to ${url}...`);

const socket = io(url, {
    auth: { token: `Bearer ${token}` },
    transports: ['websocket', 'polling']
});

socket.on('connect', () => {
    console.log('✅ Connected natively to /attendance namespace!');
    socket.emit('joinAttendanceLog');
});

socket.on('joinedAttendanceLog', (data) => {
    console.log('✅ Server acknowledged join:', data);
});

socket.on('attendanceLog', (newEntry) => {
    console.log('🔔 RECEIVED EVENT [attendanceLog]:', newEntry);
});

socket.on('connect_error', (err) => {
    console.log('❌ Connection Error:', err.message);
});

socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason);
});
