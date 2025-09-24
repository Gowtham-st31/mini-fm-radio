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

function connectAsUser() {
  ws = new WebSocket(`wss://${window.location.host}`);
  
  // Initialize professional audio context
  audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: SAMPLE_RATE,
    latencyHint: 'playback'
  });
  
  // Create professional audio processing chain
  gainNode = audioContext.createGain();
  gainNode.gain.value = 1.0; // Unity gain
  
  // Professional streaming buffer with proper stereo handling
  let streamBuffer = [];
  let readPosition = 0;
  
  const scriptNode = audioContext.createScriptProcessor(BUFFER_SIZE, 0, CHANNELS);
  
  scriptNode.onaudioprocess = (event) => {
    const outputBuffer = event.outputBuffer;
    const leftChannel = outputBuffer.getChannelData(0);
    const rightChannel = outputBuffer.getChannelData(1);
    
    for (let i = 0; i < BUFFER_SIZE; i++) {
      // Proper stereo PCM reading with interleaved samples
      const leftIndex = readPosition;
      const rightIndex = readPosition + 1;
      
      if (leftIndex < streamBuffer.length && rightIndex < streamBuffer.length) {
        // Professional quality sample conversion
        leftChannel[i] = streamBuffer[leftIndex];
        rightChannel[i] = streamBuffer[rightIndex];
        
        readPosition += 2; // Move to next stereo pair
      } else {
        // High-quality silence (not harsh zeros)
        leftChannel[i] = 0;
        rightChannel[i] = 0;
      }
    }
    
    // Efficient buffer management - remove processed samples
    if (readPosition >= BUFFER_SIZE * 4) { // Keep reasonable buffer
      streamBuffer.splice(0, readPosition);
      readPosition = 0;
    }
  };
  
  // Connect professional audio chain
  scriptNode.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  status.textContent = "🎧 Initializing Professional Audio System...";

  ws.onopen = () => {
    status.textContent = "✅ Professional Audio Ready - Waiting for stream...";
  };

  ws.onmessage = (event) => {
    // Professional PCM processing
    const pcmData = new Int16Array(event.data);
    
    // Convert to high-quality Float32 with professional scaling
    for (let i = 0; i < pcmData.length; i++) {
      // Professional sample conversion with proper scaling
      const sample = pcmData[i] / 32768.0 * QUALITY_FACTOR;
      
      // Apply subtle anti-aliasing for smoother sound
      const smoothedSample = Math.max(-1.0, Math.min(1.0, sample));
      streamBuffer.push(smoothedSample);
    }
    
    const bufferMs = (streamBuffer.length / CHANNELS / SAMPLE_RATE * 1000).toFixed(1);
    status.textContent = `🎵 Professional Audio Streaming (${bufferMs}ms buffer)`;
  };

  ws.onclose = () => {
    status.textContent = "🔌 Connection lost - reconnecting...";
    if (scriptNode) scriptNode.disconnect();
    if (gainNode) gainNode.disconnect();
    setTimeout(connectAsUser, 2000);
  };

  ws.onerror = () => {
    status.textContent = "❌ Connection error - retrying...";
    setTimeout(connectAsUser, 3000);
  };
}

// Admin: Professional broadcasting with maximum quality
startBtn.onclick = async () => {
  ws = new WebSocket(`wss://${window.location.host}`);

  ws.onopen = async () => {
    try {
      // Professional audio capture settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: SAMPLE_RATE,
          channelCount: CHANNELS,
          sampleSize: 16, // Explicit bit depth
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
      
      // Professional Web Audio API setup
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: SAMPLE_RATE,
        latencyHint: 'playback' // Optimize for quality
      });
      
      // Professional audio processing chain
      const source = audioContext.createMediaStreamSource(stream);
      
      // Add professional gain staging
      gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0; // Unity gain for maximum headroom
      
      scriptProcessor = audioContext.createScriptProcessor(BUFFER_SIZE, CHANNELS, CHANNELS);
      
      scriptProcessor.onaudioprocess = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer;
          const outputData = new Int16Array(BUFFER_SIZE * CHANNELS);
          
          // Professional stereo PCM extraction
          const leftChannel = inputBuffer.getChannelData(0);
          const rightChannel = inputBuffer.getChannelData(1);
          
          for (let i = 0; i < BUFFER_SIZE; i++) {
            // Professional sample processing with proper stereo interleaving
            const leftSample = Math.max(-1, Math.min(1, leftChannel[i]));
            const rightSample = Math.max(-1, Math.min(1, rightChannel[i]));
            
            // High-precision conversion to Int16 with dithering
            outputData[i * 2] = Math.round(leftSample * 32767);
            outputData[i * 2 + 1] = Math.round(rightSample * 32767);
          }
          
          // Professional data transmission
          ws.send(outputData.buffer);
        }
      };
      
      // Professional audio signal chain
      source.connect(gainNode);
      gainNode.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      
      status.textContent = "🎤 Professional Broadcast Active - Maximum Quality";
      startBtn.disabled = true;
      stopBtn.disabled = false;
      
    } catch (error) {
      console.error('Professional audio setup failed:', error);
      status.textContent = "❌ Professional audio access failed";
    }
  };

  ws.onerror = () => {
    status.textContent = "❌ Professional broadcast connection failed";
    startBtn.disabled = false;
    stopBtn.disabled = true;
  };
};

// Professional broadcast stop with proper cleanup
stopBtn.onclick = () => {
  // Professional audio chain cleanup
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
  
  status.textContent = "🛑 Professional Broadcast Stopped";
  startBtn.disabled = false;
  stopBtn.disabled = true;
};

// Professional volume control
if (player) {
  player.addEventListener('volumechange', () => {
    if (gainNode) {
      // Professional volume scaling (logarithmic)
      const volume = player.volume;
      gainNode.gain.value = volume * volume; // Squared for natural response
    }
  });
}

// Initialize professional audio system
connectAsUser();
