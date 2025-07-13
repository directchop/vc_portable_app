import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve the GUI files
app.use(express.static(path.join(__dirname, 'gui-web')));

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('voice', (data) => {
    // Broadcast the voice data to all other clients
    socket.broadcast.emit('voice', data);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
