const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const status = document.getElementById("status");
const player = document.getElementById("player");

let ws;
let mediaRecorder;

function connectAsUser() {
  ws = new WebSocket(`wss://${window.location.host}`);
  const audioChunks = [];

  ws.onmessage = (event) => {
    audioChunks.push(event.data);
    const blob = new Blob(audioChunks, { type: "audio/webm; codecs=opus" });
    player.src = URL.createObjectURL(blob);
    status.textContent = "✅ Live Audio Playing";
  };
}

// Admin: start broadcasting mic
startBtn.onclick = async () => {
  ws = new WebSocket(`wss://${window.location.host}`);

  ws.onopen = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm; codecs=opus" });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(e.data);
      }
    };

    mediaRecorder.start(200);
    status.textContent = "🎤 Broadcasting Live...";
    startBtn.disabled = true;
    stopBtn.disabled = false;
  };
};

// Admin: stop broadcasting
stopBtn.onclick = () => {
  mediaRecorder.stop();
  ws.close();
  status.textContent = "🛑 Mic Off";
  startBtn.disabled = false;
  stopBtn.disabled = true;
};

// By default, connect as listener
connectAsUser();
