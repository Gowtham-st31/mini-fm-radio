const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const status = document.getElementById("status");
const player = document.getElementById("player");

let ws;
let audioContext;
let scriptProcessor;
let gainNode;
let audioWorkletNode;

// Stable audio parameters
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
    // Initialize stable audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: SAMPLE_RATE,
      latencyHint: 'playback'
    });
    
    // Load stable AudioWorklet processor
    await audioContext.audioWorklet.addModule('./audio-processor.js');
    
    // Create stable audio worklet node
    audioWorkletNode = new AudioWorkletNode(audioContext, 'stable-audio-processor');
    
    // Simple gain control
    gainNode = audioContext.createGain();
    gainNode.gain.value = 1.0;
    
    // Connect stable audio chain
    audioWorkletNode.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Handle status updates
    audioWorkletNode.port.onmessage = (event) => {
      const { type, bufferMs, playing } = event.data;
      if (type === 'status') {
        const indicator = playing ? '🎵' : '⏳';
        status.textContent = `${indicator} Stable Audio (${bufferMs}ms)`;
      }
    };
    
    status.textContent = "🎧 Stable Audio System Ready...";
    
  } catch (error) {
    console.warn('AudioWorklet not supported, using legacy mode');
    // Fallback to simple ScriptProcessor
    gainNode = audioContext.createGain();
    gainNode.gain.value = 1.0;
    gainNode.connect(audioContext.destination);
    initLegacyAudio();
    return;
  }

  ws.onopen = () => {
    status.textContent = "✅ Connected - Stable Quality Audio";
  };

  ws.onmessage = (event) => {
    // Send data to stable processor
    if (audioWorkletNode) {
      audioWorkletNode.port.postMessage({
        type: 'pcm-data',
        data: event.data
      });
    }
  };

  ws.onclose = () => {
    status.textContent = "🔌 Reconnecting...";
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

// Stable broadcasting
startBtn.onclick = async () => {
  ws = new WebSocket(`wss://${window.location.host}`);

  ws.onopen = async () => {
    try {
      // Conservative audio settings for stability
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: SAMPLE_RATE,
          channelCount: CHANNELS,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      // Stable audio processing
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: SAMPLE_RATE
      });
      
      const source = audioContext.createMediaStreamSource(stream);
      gainNode = audioContext.createGain();
      gainNode.gain.value = 0.8; // Conservative gain to prevent clipping
      
      scriptProcessor = audioContext.createScriptProcessor(BUFFER_SIZE, CHANNELS, CHANNELS);
      
      scriptProcessor.onaudioprocess = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer;
          const outputData = new Int16Array(BUFFER_SIZE * CHANNELS);
          
          // Simple stable stereo processing
          const leftChannel = inputBuffer.getChannelData(0);
          const rightChannel = inputBuffer.getChannelData(1);
          
          for (let i = 0; i < BUFFER_SIZE; i++) {
            // Conservative sample processing
            const left = Math.max(-0.95, Math.min(0.95, leftChannel[i]));
            const right = Math.max(-0.95, Math.min(0.95, rightChannel[i]));
            
            // Stable conversion
            outputData[i * 2] = Math.round(left * 32000);     // Conservative range
            outputData[i * 2 + 1] = Math.round(right * 32000);
          }
          
          ws.send(outputData.buffer);
        }
      };
      
      // Simple audio chain
      source.connect(gainNode);
      gainNode.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      
      status.textContent = "🎤 Stable Broadcast Active";
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
  
  status.textContent = "🛑 Broadcast Stopped";
  startBtn.disabled = false;
  stopBtn.disabled = true;
};

// Volume control
if (player) {
  player.addEventListener('volumechange', () => {
    if (gainNode) {
      gainNode.gain.value = player.volume;
    }
  });
}

// Initialize stable audio system
connectAsUser();
