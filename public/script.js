const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const status = document.getElementById("status");
const player = document.getElementById("player");

let ws;
let audioContext;
let scriptProcessor;
let gainNode;

// Professional audio parameters
const SAMPLE_RATE = 48000;
const CHANNELS = 2;
const BUFFER_SIZE = 2048; // Smaller buffer for lower latency
const QUALITY_FACTOR = 1.0; // Maximum quality multiplier

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const status = document.getElementById("status");
const player = document.getElementById("player");

let ws;
let audioContext;
let scriptProcessor;
let gainNode;
let audioWorkletNode;

// Pristine audio parameters
const SAMPLE_RATE = 48000;
const CHANNELS = 2;
const BUFFER_SIZE = 2048;

// Legacy fallback for browsers without AudioWorklet support
function initLegacyAudio() {
  // Professional streaming buffer with proper stereo handling
  let streamBuffer = [];
  let readPosition = 0;
  
  const scriptNode = audioContext.createScriptProcessor(BUFFER_SIZE, 0, CHANNELS);
  
  scriptNode.onaudioprocess = (event) => {
    const outputBuffer = event.outputBuffer;
    const leftChannel = outputBuffer.getChannelData(0);
    const rightChannel = outputBuffer.getChannelData(1);
    
    for (let i = 0; i < BUFFER_SIZE; i++) {
      const leftIndex = readPosition;
      const rightIndex = readPosition + 1;
      
      if (leftIndex < streamBuffer.length && rightIndex < streamBuffer.length) {
        leftChannel[i] = streamBuffer[leftIndex];
        rightChannel[i] = streamBuffer[rightIndex];
        readPosition += 2;
      } else {
        leftChannel[i] = 0;
        rightChannel[i] = 0;
      }
    }
    
    if (readPosition >= BUFFER_SIZE * 4) {
      streamBuffer.splice(0, readPosition);
      readPosition = 0;
    }
  };
  
  scriptNode.connect(gainNode);
  
  // Handle legacy PCM data
  ws.onmessage = (event) => {
    const pcmData = new Int16Array(event.data);
    for (let i = 0; i < pcmData.length; i++) {
      const sample = pcmData[i] / 32768.0;
      streamBuffer.push(Math.max(-1.0, Math.min(1.0, sample)));
    }
    const bufferMs = (streamBuffer.length / CHANNELS / SAMPLE_RATE * 1000).toFixed(1);
    status.textContent = `🎵 Legacy Audio Streaming (${bufferMs}ms buffer)`;
  };
}

async function connectAsUser() {
  ws = new WebSocket(`wss://${window.location.host}`);
  
  try {
    // Initialize pristine audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: SAMPLE_RATE,
      latencyHint: 'playback'
    });
    
    // Load AudioWorklet for pristine processing
    await audioContext.audioWorklet.addModule('./audio-processor.js');
    
    // Create pristine audio worklet node
    audioWorkletNode = new AudioWorkletNode(audioContext, 'pristine-audio-processor');
    
    // Professional gain control
    gainNode = audioContext.createGain();
    gainNode.gain.value = 1.0;
    
    // Connect pristine audio chain
    audioWorkletNode.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Handle status updates from AudioWorklet
    audioWorkletNode.port.onmessage = (event) => {
      const { type, bufferMs, playing } = event.data;
      if (type === 'status') {
        const playingIndicator = playing ? '🎵' : '⏳';
        status.textContent = `${playingIndicator} Pristine Audio (${bufferMs}ms buffer)`;
      }
    };
    
    status.textContent = "🎧 Pristine Audio System Initialized...";
    
  } catch (error) {
    console.warn('AudioWorklet not supported, falling back to legacy mode');
    // Fallback to legacy implementation if AudioWorklet not supported
    gainNode = audioContext.createGain();
    gainNode.gain.value = 1.0;
    gainNode.connect(audioContext.destination);
    initLegacyAudio();
    return;
  }

  ws.onopen = () => {
    status.textContent = "✅ Pristine Audio Ready - Ultra High Quality";
  };

  ws.onmessage = (event) => {
    // Send PCM data to AudioWorklet for pristine processing
    if (audioWorkletNode) {
      audioWorkletNode.port.postMessage({
        type: 'pcm-data',
        data: event.data
      });
    }
  };

  ws.onclose = () => {
    status.textContent = "🔌 Connection lost - reconnecting...";
    if (audioWorkletNode) {
      audioWorkletNode.port.postMessage({ type: 'clear-buffer' });
    }
    setTimeout(connectAsUser, 2000);
  };

  ws.onerror = () => {
    status.textContent = "❌ Connection error - retrying...";
    setTimeout(connectAsUser, 3000);
  };
}

// Admin: Pristine broadcasting with maximum quality
startBtn.onclick = async () => {
  ws = new WebSocket(`wss://${window.location.host}`);

  ws.onopen = async () => {
    try {
      // Pristine audio capture settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: SAMPLE_RATE,
          channelCount: CHANNELS,
          sampleSize: 16,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          googEchoCancellation: false,
          googAutoGainControl: false,
          googNoiseSuppression: false,
          googHighpassFilter: false,
          googTypingNoiseDetection: false,
          googAudioMirroring: false
        } 
      });
      
      // Pristine Web Audio API setup
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: SAMPLE_RATE,
        latencyHint: 'playback'
      });
      
      // Pristine audio processing chain
      const source = audioContext.createMediaStreamSource(stream);
      
      // Add pristine gain staging
      gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0;
      
      scriptProcessor = audioContext.createScriptProcessor(BUFFER_SIZE, CHANNELS, CHANNELS);
      
      scriptProcessor.onaudioprocess = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer;
          const outputData = new Int16Array(BUFFER_SIZE * CHANNELS);
          
          // Pristine stereo PCM extraction
          const leftChannel = inputBuffer.getChannelData(0);
          const rightChannel = inputBuffer.getChannelData(1);
          
          for (let i = 0; i < BUFFER_SIZE; i++) {
            // Pristine sample processing with perfect stereo interleaving
            const leftSample = Math.max(-1, Math.min(1, leftChannel[i]));
            const rightSample = Math.max(-1, Math.min(1, rightChannel[i]));
            
            // Ultra-high precision conversion to Int16
            outputData[i * 2] = Math.round(leftSample * 32767);
            outputData[i * 2 + 1] = Math.round(rightSample * 32767);
          }
          
          // Pristine data transmission
          ws.send(outputData.buffer);
        }
      };
      
      // Pristine audio signal chain
      source.connect(gainNode);
      gainNode.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      
      status.textContent = "🎤 Pristine Broadcast Active - Ultra Quality";
      startBtn.disabled = true;
      stopBtn.disabled = false;
      
    } catch (error) {
      console.error('Pristine audio setup failed:', error);
      status.textContent = "❌ Pristine audio access failed";
    }
  };

  ws.onerror = () => {
    status.textContent = "❌ Pristine broadcast connection failed";
    startBtn.disabled = false;
    stopBtn.disabled = true;
  };
};

// Pristine broadcast stop with proper cleanup
stopBtn.onclick = () => {
  // Pristine audio chain cleanup
  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }
  if (audioWorkletNode) {
    audioWorkletNode.disconnect();
    audioWorkletNode = null;
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
  
  status.textContent = "🛑 Pristine Broadcast Stopped";
  startBtn.disabled = false;
  stopBtn.disabled = true;
};

// Pristine volume control
if (player) {
  player.addEventListener('volumechange', () => {
    if (gainNode) {
      // Pristine volume scaling (logarithmic)
      const volume = player.volume;
      gainNode.gain.value = volume * volume;
    }
  });
}

// Initialize pristine audio system
connectAsUser();
