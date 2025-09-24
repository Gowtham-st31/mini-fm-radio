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
  
  // Create audio buffer for smooth playback
  const bufferDuration = 0.5; // 500ms buffer
  const audioBuffer = audioContext.createBuffer(CHANNELS, SAMPLE_RATE * bufferDuration, SAMPLE_RATE);
  let playbackTime = audioContext.currentTime;
  let writeIndex = 0;
  
  status.textContent = "🎧 Connecting for crystal-clear audio...";

  ws.onopen = () => {
    status.textContent = "✅ Connected - Waiting for audio...";
  };

  ws.onmessage = (event) => {
    // Convert received PCM data to audio
    const pcmData = new Int16Array(event.data);
    
    // Create audio buffer source for this chunk
    const source = audioContext.createBufferSource();
    const buffer = audioContext.createBuffer(CHANNELS, pcmData.length / CHANNELS, SAMPLE_RATE);
    
    // Fill buffer with PCM data
    for (let channel = 0; channel < CHANNELS; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        // Convert Int16 to Float32 (-1.0 to 1.0)
        channelData[i] = pcmData[i * CHANNELS + channel] / 32768.0;
      }
    }
    
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    // Schedule playback for smooth streaming
    const bufferDuration = buffer.length / SAMPLE_RATE;
    source.start(Math.max(audioContext.currentTime, playbackTime));
    playbackTime = Math.max(audioContext.currentTime, playbackTime) + bufferDuration;
    
    status.textContent = "🎵 Crystal Clear Audio Playing";
  };

  ws.onclose = () => {
    status.textContent = "🔌 Connection lost - reconnecting...";
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
      // Request high-quality audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: SAMPLE_RATE,
          channelCount: CHANNELS,
          echoCancellation: false, // Disable for maximum quality
          noiseSuppression: false,  // Disable for pure audio
          autoGainControl: false,   // Disable for consistent levels
          googEchoCancellation: false,
          googAutoGainControl: false,
          googNoiseSuppression: false,
          googHighpassFilter: false
        } 
      });
      
      // Initialize Web Audio API for PCM extraction
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: SAMPLE_RATE
      });
      
      const source = audioContext.createMediaStreamSource(stream);
      scriptProcessor = audioContext.createScriptProcessor(BUFFER_SIZE, CHANNELS, CHANNELS);
      
      scriptProcessor.onaudioprocess = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer;
          const outputData = new Int16Array(BUFFER_SIZE * CHANNELS);
          
          // Extract raw PCM data from both channels
          for (let channel = 0; channel < CHANNELS; channel++) {
            const channelData = inputBuffer.getChannelData(channel);
            for (let i = 0; i < BUFFER_SIZE; i++) {
              // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
              const sample = Math.max(-1, Math.min(1, channelData[i]));
              outputData[i * CHANNELS + channel] = sample * 0x7FFF;
            }
          }
          
          // Send raw PCM data
          ws.send(outputData.buffer);
        }
      };
      
      // Connect audio processing chain
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      
      status.textContent = "🎤 Broadcasting Crystal Clear Audio...";
      startBtn.disabled = true;
      stopBtn.disabled = false;
      
    } catch (error) {
      console.error('Failed to start high-quality recording:', error);
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
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (ws) ws.close();
  
  status.textContent = "🛑 High-Quality Broadcast Stopped";
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
