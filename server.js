const WebSocket = require('ws');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

let clients = [];

wss.on('connection', (ws) => {
  console.log("✅ Client connected");

  clients.push(ws);

  ws.on('message', (data) => {
    // Broadcast to all except sender
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });

  ws.on('close', () => {
    console.log("❌ Client disconnected");
    clients = clients.filter(c => c !== ws);
  });

  ws.send("Connected to server");
});

console.log(`🌐 WebSocket server running on ws://localhost:${PORT}`);
