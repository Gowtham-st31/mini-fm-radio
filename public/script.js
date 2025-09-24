const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const status = document.getElementById("status");
const player = document.getElementById("player");

let ws;
let mediaRecorder;
let mediaSource;
let sourceBuffer;

function connectAsUser() {
  ws = new WebSocket(`wss://${window.location.host}`);
  
  // Initialize MediaSource for smooth streaming
  mediaSource = new MediaSource();
  player.src = URL.createObjectURL(mediaSource);
  
  mediaSource.addEventListener('sourceopen', () => {
    sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs=opus');
    sourceBuffer.mode = 'sequence';
    
    // Handle buffer updates
    sourceBuffer.addEventListener('updateend', () => {
      // Keep buffer size manageable (last 10 seconds)
      if (sourceBuffer.buffered.length > 0) {
        const buffered = sourceBuffer.buffered;
        const currentTime = player.currentTime;
        
        if (buffered.end(buffered.length - 1) - currentTime > 10) {
          const removeEnd = currentTime - 5;
          if (removeEnd > 0) {
            sourceBuffer.remove(0, removeEnd);
          }
        }
      }
    });
    
    status.textContent = "🎧 Ready for live audio...";
  });

  ws.onmessage = (event) => {
    if (sourceBuffer && !sourceBuffer.updating && mediaSource.readyState === 'open') {
      event.data.arrayBuffer().then(buffer => {
        try {
          sourceBuffer.appendBuffer(buffer);
          
          // Auto-play when we have enough buffer
          if (player.paused && sourceBuffer.buffered.length > 0 && 
              sourceBuffer.buffered.end(0) > 0.5) {
            player.currentTime = sourceBuffer.buffered.start(0);
            player.play().then(() => {
              status.textContent = "✅ Live Audio Playing";
            }).catch(e => {
              console.log("Autoplay prevented, click play button");
              status.textContent = "▶️ Click Play for Live Audio";
            });
          }
        } catch (e) {
          console.warn('Buffer append failed:', e);
        }
      });
    }
  };

  ws.onclose = () => {
    status.textContent = "🔌 Connection lost - reconnecting...";
    setTimeout(connectAsUser, 2000);
  };
}

// Admin: start broadcasting mic
startBtn.onclick = async () => {
  ws = new WebSocket(`wss://${window.location.host}`);

  ws.onopen = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 48000,
          channelCount: 2,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      mediaRecorder = new MediaRecorder(stream, { 
        mimeType: "audio/webm; codecs=opus",
        audioBitsPerSecond: 128000
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };

      // Send data more frequently for smoother streaming
      mediaRecorder.start(100);
      status.textContent = "🎤 Broadcasting Live...";
      startBtn.disabled = true;
      stopBtn.disabled = false;
    } catch (error) {
      console.error('Failed to start recording:', error);
      status.textContent = "❌ Microphone access failed";
    }
  };

  ws.onerror = () => {
    status.textContent = "❌ Connection failed";
    startBtn.disabled = false;
    stopBtn.disabled = true;
  };
};

// Admin: stop broadcasting
stopBtn.onclick = () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
  if (ws) ws.close();
  status.textContent = "🛑 Mic Off";
  startBtn.disabled = false;
  stopBtn.disabled = true;
};

// Add play button handler for manual control
player.addEventListener('play', () => {
  if (status.textContent.includes("Click Play")) {
    status.textContent = "✅ Live Audio Playing";
  }
});

player.addEventListener('pause', () => {
  status.textContent = "⏸️ Audio Paused (Click Play)";
});

// By default, connect as listener
connectAsUser();
