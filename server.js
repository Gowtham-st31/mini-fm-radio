const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let broadcaster;

wss.on("connection", ws => {
    ws.on("message", message => {
        const data = JSON.parse(message);

        switch(data.type) {
            case "broadcaster":
                broadcaster = ws;
                break;
            case "watcher":
                if (broadcaster) broadcaster.send(JSON.stringify({ type: "watcher", id: data.id }));
                break;
            case "offer":
            case "answer":
            case "candidate":
                const targetClient = [...wss.clients].find(c => c.id === data.target);
                if(targetClient && targetClient.readyState === WebSocket.OPEN){
                    targetClient.send(JSON.stringify(data));
                }
                break;
        }
    });

    ws.on("close", () => {
        if(ws === broadcaster) broadcaster = null;
    });
});

server.listen(3000, () => console.log("Server running on port 3000"));
