const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const status = document.getElementById("status");
const player = document.getElementById("player");

let ws;
let audioContext;
let scriptProcessor;
let gainNode;

// Natural voice audio parameters
const SAMPLE_RATE = 44100;
const CHANNELS = 2;
const BUFFER_SIZE = 2048;

function connectAsUser() {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);
  ws.binaryType = 'blob'; // For WebM audio data
  
  ws.onmessage = (event) => {
    try {
      // Play WebM audio directly for natural voice quality
      const audioBlob = new Blob([event.data], { type: 'audio/webm;codecs=opus' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create temporary audio element for playback
      const tempAudio = new Audio(audioUrl);
      
      // Apply global volume if available
      if (typeof globalVolume !== 'undefined') {
        tempAudio.volume = globalVolume;
      } else {
        tempAudio.volume = player ? player.volume || 1.0 : 1.0;
      }
      
      tempAudio.play().then(() => {
        status.textContent = "🎵 Natural voice streaming";
      }).catch(e => {
        console.log('Autoplay prevented, user interaction needed');
        status.textContent = "🔊 Click 'Enable Audio' button to start";
      });
      
      // Cleanup after playing
      tempAudio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
      });
      
    } catch (error) {
      console.error('Natural audio playback error:', error);
      status.textContent = "❌ Audio error - check connection";
    }
  };

  ws.onopen = () => {
    status.textContent = "🎵 Connected - listening for natural voice";
  };

  ws.onclose = (event) => {
    status.textContent = "🔌 Connection lost - reconnecting...";
    console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
    setTimeout(connectAsUser, 2000); // Reconnect after 2 seconds
  };

  ws.onerror = (error) => {
    status.textContent = "❌ Connection error - retrying...";
    console.error('WebSocket error:', error);
  };
}

// Natural broadcasting with MediaRecorder
startBtn.onclick = async () => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);

  ws.onopen = async () => {
    try {
      // Natural audio capture
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: SAMPLE_RATE,
          channelCount: CHANNELS,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      // Use MediaRecorder for natural voice quality
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000 // High quality
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };
      
      // Start recording with short chunks for real-time
      mediaRecorder.start(100); // 100ms chunks
      
      status.textContent = "🎤 Natural voice broadcasting";
      startBtn.disabled = true;
      stopBtn.disabled = false;
      
      // Store for cleanup
      stopBtn.onclick = () => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
        if (ws.readyState === WebSocket.OPEN) ws.close();
        
        status.textContent = "🛑 Broadcasting stopped";
        startBtn.disabled = false;
        stopBtn.disabled = true;
      };
      
    } catch (error) {
      console.error('Audio setup failed:', error);
      status.textContent = "❌ Microphone access failed";
    }
  };

  ws.onerror = () => {
    status.textContent = "❌ Connection failed";
    startBtn.disabled = false;
    stopBtn.disabled = true;
  };
};

// Simple volume control
if (player) {
  player.addEventListener('volumechange', () => {
    // Volume is handled per audio element
  });
}

// Start the natural voice system
connectAsUser();

// Health monitoring
document.addEventListener('DOMContentLoaded', () => {
  async function checkHealth() {
    try {
      const response = await fetch('/health');
      const data = await response.json();
      const healthSpan = document.getElementById('render-health');
      if (healthSpan) {
        healthSpan.textContent = `✅ UP (${data.clients} clients)`;
        healthSpan.style.color = '#2ecc71';
      }
    } catch (error) {
      const healthSpan = document.getElementById('render-health');
      if (healthSpan) {
        healthSpan.textContent = '❌ DOWN';
        healthSpan.style.color = '#e74c3c';
      }
    }
  }

  if (document.getElementById('render-health')) {
    checkHealth();
    setInterval(checkHealth, 30000);
  }
});
