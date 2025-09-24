// High-quality FM radio server for Render hosting
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false // Disable compression for better audio quality
});

// High-quality audio constants
const SAMPLE_RATE = 44100; // CD quality
const CHANNELS = 2;
const BYTES_PER_SAMPLE = 2;

// Client management
const clients = new Map();

// Render-optimized WebSocket server
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false, // Disable compression for lower latency
  maxPayload: 64 * 1024,    // 64KB max message size
  clientTracking: true
});

let clients = new Map(); // Use Map for better client management
let broadcastStats = { sent: 0, received: 0, errors: 0 };

// Heartbeat interval for Render connection stability
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

wss.on("connection", (ws, req) => {
  const clientId = Date.now() + Math.random();
  const clientInfo = {
    ws: ws,
    alive: true,
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    connected: new Date()
  };
  
  clients.set(clientId, clientInfo);
  console.log(`✅ Client ${clientId} connected from ${clientInfo.ip}`);

  // Render connection stability - heartbeat
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on("message", (message) => {
    broadcastStats.received++;
    console.log(`📡 Audio chunk received: ${message.length} bytes (Total: ${broadcastStats.received})`);
    
    // Optimized broadcast for Render
    let successCount = 0;
    let errorCount = 0;
    
    clients.forEach((client, id) => {
      if (id !== clientId && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(message);
          successCount++;
        } catch (error) {
          console.error(`❌ Broadcast error to client ${id}:`, error.message);
          errorCount++;
          broadcastStats.errors++;
          
          // Remove failed client
          clients.delete(id);
        }
      }
    });
    
    broadcastStats.sent += successCount;
    
    if (broadcastStats.received % 100 === 0) { // Log every 100 chunks
      console.log(`� Stats - Received: ${broadcastStats.received}, Sent: ${broadcastStats.sent}, Errors: ${broadcastStats.errors}`);
      console.log(`👥 Active clients: ${clients.size}`);
    }
  });

  ws.on("close", () => {
    clients.delete(clientId);
    console.log(`❌ Client ${clientId} disconnected. Active clients: ${clients.size}`);
  });

  ws.on("error", (error) => {
    console.error(`💥 WebSocket error for client ${clientId}:`, error.message);
    clients.delete(clientId);
  });
});

// Render connection stability - heartbeat system
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log('💀 Terminating inactive connection');
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

// Render-optimized static file serving
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: '1d',           // Cache static files for better performance
  etag: false,           // Disable etag for simpler responses
  lastModified: false    // Disable last-modified for simpler responses
}));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    clients: clients.size,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    stats: broadcastStats
  });
});

const PORT = process.env.PORT || 10000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`✅ Render-optimized server running on ${HOST}:${PORT}`);
  console.log(`📡 WebSocket server ready with heartbeat monitoring`);
  console.log(`🌐 Admin panel: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/admin.html`);
  console.log(`🎧 User interface: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/`);
  console.log(`💚 Health check: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/health`);
});
