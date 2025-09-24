const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let clients = [];

wss.on("connection", (ws) => {
  clients.push(ws);
  console.log("✅ New user connected");

  ws.on("message", (message) => {
    console.log(`📡 Received message from client, size: ${message.length} bytes`);
    
    // Broadcast admin audio chunks to all users
    let broadcastCount = 0;
    clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
        broadcastCount++;
      }
    });
    
    console.log(`📢 Broadcasted to ${broadcastCount} clients`);
  });

  ws.on("close", () => {
    clients = clients.filter((c) => c !== ws);
    console.log("❌ User disconnected");
  });
});

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 10000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`✅ Server running on ${HOST}:${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🌐 Admin panel: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/admin.html`);
  console.log(`🎧 User interface: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/radio-player.html`);
});
