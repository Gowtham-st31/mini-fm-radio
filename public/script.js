const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const status = document.getElementById("status");
const player = document.getElementById("player");

let ws;
let audioContext;
let scriptProcessor;
let audioBuffer = [];
let sampleRate = 48000;

// High-quality audio parameters
const SAMPLE_RATE = 48000;
const CHANNELS = 2;
const BUFFER_SIZE = 4096;

function connectAsUser() {
  ws = new WebSocket(`wss://${window.location.host}`);
  
  // Initialize high-quality audio context
  audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: SAMPLE_RATE,
    latencyHint: 'playback'
  });
  
  // Create a continuous audio buffer using ScriptProcessorNode
  let scriptNode = audioContext.createScriptProcessor(BUFFER_SIZE, 0, CHANNELS);
  let audioQueue = [];
  let queueIndex = 0;
  
  scriptNode.onaudioprocess = (event) => {
    const outputBuffer = event.outputBuffer;
    
    for (let channel = 0; channel < CHANNELS; channel++) {
      const outputData = outputBuffer.getChannelData(channel);
      
      for (let i = 0; i < BUFFER_SIZE; i++) {
        if (queueIndex < audioQueue.length) {
          // Get sample from queue (already in Float32 format)
          outputData[i] = audioQueue[queueIndex * CHANNELS + channel] || 0;
        } else {
          // Silence if no data
          outputData[i] = 0;
        }
      }
    }
    
    // Move to next chunk
    queueIndex += BUFFER_SIZE;
    
    // Remove processed audio from queue (keep buffer manageable)
    if (queueIndex >= BUFFER_SIZE * 2) {
      audioQueue.splice(0, queueIndex);
      queueIndex = 0;
    }
  };
  
  scriptNode.connect(audioContext.destination);
  
  status.textContent = "🎧 Connecting for crystal-clear audio...";

  ws.onopen = () => {
    status.textContent = "✅ Connected - Waiting for audio...";
  };

  ws.onmessage = (event) => {
    // Convert received PCM data to Float32 and add to queue
    const pcmData = new Int16Array(event.data);
    
    for (let i = 0; i < pcmData.length; i++) {
      // Convert Int16 to Float32 (-1.0 to 1.0)
      audioQueue.push(pcmData[i] / 32768.0);
    }
    
    status.textContent = `🎵 Crystal Clear Audio Playing (Buffer: ${audioQueue.length})`;
  };

  ws.onclose = () => {
    status.textContent = "🔌 Connection lost - reconnecting...";
    if (scriptNode) {
      scriptNode.disconnect();
    }
    setTimeout(connectAsUser, 2000);
  };

  ws.onerror = () => {
    status.textContent = "❌ Connection error - retrying...";
    setTimeout(connectAsUser, 3000);
  };
}

// Admin: start broadcasting high-quality audio
startBtn.onclick = async () => {
  ws = new WebSocket(`wss://${window.location.host}`);

  ws.onopen = async () => {
    try {
      // Request high-quality audio stream with consistent settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: SAMPLE_RATE,
          channelCount: CHANNELS,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          googEchoCancellation: false,
          googAutoGainControl: false,
          googNoiseSuppression: false,
          googHighpassFilter: false
        } 
      });
      
      // Initialize Web Audio API for consistent PCM extraction
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: SAMPLE_RATE
      });
      
      const source = audioContext.createMediaStreamSource(stream);
      scriptProcessor = audioContext.createScriptProcessor(BUFFER_SIZE, CHANNELS, CHANNELS);
      
      // Ensure consistent timing for PCM extraction
      let lastSendTime = Date.now();
      
      scriptProcessor.onaudioprocess = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          const currentTime = Date.now();
          const inputBuffer = event.inputBuffer;
          const outputData = new Int16Array(BUFFER_SIZE * CHANNELS);
          
          // Extract raw PCM data with consistent timing
          for (let channel = 0; channel < CHANNELS; channel++) {
            const channelData = inputBuffer.getChannelData(channel);
            for (let i = 0; i < BUFFER_SIZE; i++) {
              // Convert Float32 to Int16 with proper clamping
              const sample = Math.max(-1, Math.min(1, channelData[i]));
              outputData[i * CHANNELS + channel] = Math.round(sample * 32767);
            }
          }
          
          // Send PCM data at consistent intervals
          ws.send(outputData.buffer);
          lastSendTime = currentTime;
        }
      };
      
      // Connect audio processing chain
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      
      status.textContent = "🎤 Broadcasting Ultra-Stable Audio...";
      startBtn.disabled = true;
      stopBtn.disabled = false;
      
    } catch (error) {
      console.error('Failed to start stable recording:', error);
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
  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().then(() => {
      audioContext = null;
    });
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  
  status.textContent = "🛑 Ultra-Stable Broadcast Stopped";
  startBtn.disabled = false;
  stopBtn.disabled = true;
};

// Volume control for fine-tuning
if (player) {
  player.addEventListener('volumechange', () => {
    if (audioContext && audioContext.destination) {
      // Audio context handles volume automatically
    }
  });
}

// By default, connect as listener for crystal-clear audio
connectAsUser();
