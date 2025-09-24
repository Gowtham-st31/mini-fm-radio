// Natural voice quality FM radio server
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);

// WebSocket server optimized for natural voice quality
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false, // No compression for natural audio
  maxPayload: 1024 * 1024   // 1MB max for WebM chunks
});

let clients = [];
let broadcastCount = 0;
let serverStartTime = Date.now();

wss.on("connection", (ws, req) => {
  clients.push(ws);
  console.log(`🎵 New client connected (${clients.length} total)`);

  ws.on("message", (audioData) => {
    broadcastCount++;
    
    // Broadcast natural audio to all other clients
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
      console.log(`🎵 Natural voice broadcast #${broadcastCount} to ${successCount} clients`);
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

// Health check
app.get('/health', (req, res) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  res.json({
    status: 'healthy',
    clients: clients.length,
    uptime: uptime,
    broadcasts: broadcastCount,
    audioQuality: 'high',
    sampleRate: SAMPLE_RATE
  });
});

const PORT = process.env.PORT || 10000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🎵 Natural Voice FM Server running on ${HOST}:${PORT}`);
  console.log(`📻 Audio: WebM/Opus format, optimized for natural voice`);
  console.log(`🖥️ Screen Admin: http://localhost:${PORT}/screen-admin.html`);
  console.log(`🎧 User Player: http://localhost:${PORT}/user.html`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
});
