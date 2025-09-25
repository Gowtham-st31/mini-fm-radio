// FM radio server supporting multiple audio formats
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);

// WebSocket server for audio streaming
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false, // No compression for audio
  maxPayload: 1024 * 1024   // 1MB max for audio chunks
});

let clients = [];
let broadcastCount = 0;
let serverStartTime = Date.now();

wss.on("connection", (ws, req) => {
  clients.push(ws);
  console.log(`🎵 New client connected (${clients.length} total)`);
  console.log(`📍 Client from: ${req.socket.remoteAddress}:${req.socket.remotePort}`);

  ws.on("message", (data) => {
    // Handle heartbeat ping messages
    if (data.toString() === 'ping') {
      try {
        ws.send('pong');
        console.log('💗 Heartbeat ping/pong exchanged');
      } catch (error) {
        console.error('❌ Heartbeat response error:', error.message);
      }
      return;
    }
    
    // Handle audio data (binary)
    const audioData = data;
    broadcastCount++;
    
    // Broadcast audio to all other clients
    let successCount = 0;
    clients = clients.filter(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        try {
          client.send(audioData);
          successCount++;
          return true;
        } catch (error) {
          console.error('❌ Broadcast error:', error.message);
          return false;
        }
      }
      return client === ws || client.readyState === WebSocket.OPEN;
    });
    
    if (broadcastCount % 100 === 0) {
      console.log(`🎵 Audio broadcast #${broadcastCount} to ${successCount} clients`);
    }
  });

  ws.on("close", () => {
    clients = clients.filter(client => client !== ws);
    console.log(`👋 Client disconnected (${clients.length} remaining)`);
  });

  ws.on("error", (error) => {
    console.error('❌ WebSocket error:', error.message);
    clients = clients.filter(client => client !== ws);
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Root redirect to user page
app.get('/', (req, res) => {
  res.redirect('/user.html');
});

// Health check
app.get('/health', (req, res) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  res.json({
    status: 'healthy',
    clients: clients.length,
    uptime: uptime,
    broadcasts: broadcastCount,
    audioFormat: 'PCM/Raw'
  });
});

const PORT = process.env.PORT || 10000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🎵 FM Radio Server running on ${HOST}:${PORT}`);
  console.log(`📻 Audio: PCM format for low-latency streaming`);
  console.log(`🖥️ Admin: http://localhost:${PORT}/admin.html`);
  console.log(`🎧 User: http://localhost:${PORT}/user.html`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
});
