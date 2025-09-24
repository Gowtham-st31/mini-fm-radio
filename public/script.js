const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const status = document.getElementById("status");
const player = document.getElementById("player");

let ws;
let audioContext;
let scriptProcessor;
let gainNode;

// Simple, reliable audio parameters
const SAMPLE_RATE = 48000;
const CHANNELS = 2;
const BUFFER_SIZE = 4096;

function connectAsUser() {
  ws = new WebSocket(`wss://${window.location.host}`);
  
  // Simple, reliable audio context
  audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: SAMPLE_RATE,
    latencyHint: 'playback'
  });
  
  // Simple audio processing - no complex buffering
  let audioQueue = [];
  let isPlaying = false;
  
  const scriptNode = audioContext.createScriptProcessor(BUFFER_SIZE, 0, CHANNELS);
  
  scriptNode.onaudioprocess = (event) => {
    const outputBuffer = event.outputBuffer;
    const leftChannel = outputBuffer.getChannelData(0);
    const rightChannel = outputBuffer.getChannelData(1);
    
    // Simple stereo playback
    for (let i = 0; i < BUFFER_SIZE; i++) {
      if (audioQueue.length >= 2) {
        leftChannel[i] = audioQueue.shift();
        rightChannel[i] = audioQueue.shift();
        isPlaying = true;
      } else {
        leftChannel[i] = 0;
        rightChannel[i] = 0;
        if (isPlaying) isPlaying = false;
      }
    }
    
    // Simple buffer management - keep it small
    if (audioQueue.length > 96000) { // ~1 second max
      audioQueue.splice(0, 48000); // Remove 0.5 seconds
    }
  };
  
  // Connect simple audio chain
  gainNode = audioContext.createGain();
  gainNode.gain.value = 1.0;
  scriptNode.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  status.textContent = "🎧 Simple Audio Ready...";

  ws.onopen = () => {
    status.textContent = "✅ Connected - Clear Audio";
  };

  ws.onmessage = (event) => {
    // Simple PCM processing
    const pcmData = new Int16Array(event.data);
    
    // Add samples directly to queue - simple and reliable
    for (let i = 0; i < pcmData.length; i++) {
      const sample = pcmData[i] / 32768.0;
      audioQueue.push(sample);
    }
    
    const queueSeconds = (audioQueue.length / CHANNELS / SAMPLE_RATE).toFixed(2);
    status.textContent = `🎵 Clear Audio Playing (${queueSeconds}s buffer)`;
  };

  ws.onclose = () => {
    status.textContent = "🔌 Reconnecting...";
    setTimeout(connectAsUser, 2000);
  };

  ws.onerror = () => {
    status.textContent = "❌ Connection error - retrying...";
    setTimeout(connectAsUser, 3000);
  };
}

// Simple, clear broadcasting
startBtn.onclick = async () => {
  ws = new WebSocket(`wss://${window.location.host}`);

  ws.onopen = async () => {
    try {
      // Simple, clear audio capture
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: SAMPLE_RATE,
          channelCount: CHANNELS,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      // Simple audio processing
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: SAMPLE_RATE
      });
      
      const source = audioContext.createMediaStreamSource(stream);
      gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0;
      
      scriptProcessor = audioContext.createScriptProcessor(BUFFER_SIZE, CHANNELS, CHANNELS);
      
      scriptProcessor.onaudioprocess = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer;
          const outputData = new Int16Array(BUFFER_SIZE * CHANNELS);
          
          // Simple, clean stereo processing
          for (let channel = 0; channel < CHANNELS; channel++) {
            const channelData = inputBuffer.getChannelData(channel);
            for (let i = 0; i < BUFFER_SIZE; i++) {
              // Simple, clean conversion
              const sample = Math.max(-1, Math.min(1, channelData[i]));
              outputData[i * CHANNELS + channel] = Math.round(sample * 32767);
            }
          }
          
          ws.send(outputData.buffer);
        }
      };
      
      // Simple audio chain
      source.connect(gainNode);
      gainNode.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      
      status.textContent = "🎤 Clear Broadcasting";
      startBtn.disabled = true;
      stopBtn.disabled = false;
      
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

// Stop broadcasting
stopBtn.onclick = () => {
  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().then(() => {
      audioContext = null;
    });
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  
  status.textContent = "🛑 Broadcasting Stopped";
  startBtn.disabled = false;
  stopBtn.disabled = true;
};

// Simple volume control
if (player) {
  player.addEventListener('volumechange', () => {
    if (gainNode) {
      gainNode.gain.value = player.volume;
    }
  });
}

// Start the simple, clear audio system
connectAsUser();
