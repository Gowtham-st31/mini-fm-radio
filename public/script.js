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
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);
  
  // Render-optimized audio context
  audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: SAMPLE_RATE,
    latencyHint: 'playback'
  });
  
  // Adaptive buffering for Render network variations
  let audioQueue = [];
  let targetBufferSize = 24000; // 0.5 seconds at 48kHz stereo
  let minBufferSize = 12000;    // 0.25 seconds minimum
  let maxBufferSize = 96000;    // 2 seconds maximum
  let isPlaying = false;
  let bufferUnderruns = 0;
  
  const scriptNode = audioContext.createScriptProcessor(BUFFER_SIZE, 0, CHANNELS);
  
  scriptNode.onaudioprocess = (event) => {
    const outputBuffer = event.outputBuffer;
    const leftChannel = outputBuffer.getChannelData(0);
    const rightChannel = outputBuffer.getChannelData(1);
    
    // Adaptive buffer management for Render
    for (let i = 0; i < BUFFER_SIZE; i++) {
      if (audioQueue.length >= 2) {
        leftChannel[i] = audioQueue.shift();
        rightChannel[i] = audioQueue.shift();
        isPlaying = true;
      } else {
        leftChannel[i] = 0;
        rightChannel[i] = 0;
        if (isPlaying) {
          bufferUnderruns++;
          isPlaying = false;
        }
      }
    }
    
    // Adaptive buffer size based on network conditions
    if (bufferUnderruns > 0 && bufferUnderruns % 5 === 0) {
      targetBufferSize = Math.min(targetBufferSize + 12000, maxBufferSize);
      console.log(`📊 Network issues detected. Increased buffer to ${(targetBufferSize/48000).toFixed(2)}s`);
    }
    
    // Aggressive buffer cleanup to prevent excessive delay on Render
    if (audioQueue.length > maxBufferSize) {
      const removeCount = audioQueue.length - targetBufferSize;
      audioQueue.splice(0, removeCount);
      console.log(`⚡ Buffer cleanup: removed ${removeCount} samples`);
    }
  };
  
  // Connect audio chain
  gainNode = audioContext.createGain();
  gainNode.gain.value = 1.0;
  scriptNode.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  status.textContent = "🎧 Connecting to Render server...";

  ws.onopen = () => {
    status.textContent = "✅ Connected to Render - Adaptive Buffering";
    bufferUnderruns = 0; // Reset counter on new connection
  };

  ws.onmessage = (event) => {
    const pcmData = new Int16Array(event.data);
    
    // Add samples to adaptive buffer
    for (let i = 0; i < pcmData.length; i++) {
      const sample = pcmData[i] / 32768.0;
      audioQueue.push(sample);
    }
    
    // Only start playback when we have sufficient buffer for Render
    const shouldPlay = audioQueue.length >= (isPlaying ? minBufferSize : targetBufferSize);
    
    const bufferSeconds = (audioQueue.length / CHANNELS / SAMPLE_RATE).toFixed(2);
    const bufferHealth = audioQueue.length >= targetBufferSize ? '🟢' : '🟡';
    status.textContent = `🎵 Render Stream ${bufferHealth} (${bufferSeconds}s buffer, ${bufferUnderruns} drops)`;
  };

  ws.onclose = (event) => {
    status.textContent = "🔌 Render connection lost - reconnecting...";
    console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
    // Exponential backoff for Render reconnection
    const backoffTime = Math.min(1000 * Math.pow(2, Math.min(bufferUnderruns / 10, 5)), 30000);
    setTimeout(connectAsUser, backoffTime);
  };

  ws.onerror = (error) => {
    status.textContent = "❌ Render connection error - retrying...";
    console.error('WebSocket error:', error);
  };
}

// Render-optimized broadcasting
startBtn.onclick = async () => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);

  ws.onopen = async () => {
    try {
      // Render-optimized audio capture
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: SAMPLE_RATE,
          channelCount: CHANNELS,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: SAMPLE_RATE
      });
      
      const source = audioContext.createMediaStreamSource(stream);
      gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0;
      
      scriptProcessor = audioContext.createScriptProcessor(BUFFER_SIZE, CHANNELS, CHANNELS);
      
      let sendCount = 0;
      let sendErrors = 0;
      
      scriptProcessor.onaudioprocess = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer;
          const outputData = new Int16Array(BUFFER_SIZE * CHANNELS);
          
          // Render-optimized stereo processing
          for (let channel = 0; channel < CHANNELS; channel++) {
            const channelData = inputBuffer.getChannelData(channel);
            for (let i = 0; i < BUFFER_SIZE; i++) {
              const sample = Math.max(-1, Math.min(1, channelData[i]));
              outputData[i * CHANNELS + channel] = Math.round(sample * 32767);
            }
          }
          
          try {
            ws.send(outputData.buffer);
            sendCount++;
            
            if (sendCount % 100 === 0) {
              console.log(`📡 Sent ${sendCount} audio chunks to Render (${sendErrors} errors)`);
            }
          } catch (error) {
            sendErrors++;
            console.error('Send error:', error);
          }
        }
      };
      
      // Connect audio chain
      source.connect(gainNode);
      gainNode.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      
      status.textContent = "🎤 Broadcasting to Render";
      startBtn.disabled = true;
      stopBtn.disabled = false;
      
    } catch (error) {
      console.error('Audio setup failed:', error);
      status.textContent = "❌ Microphone access failed";
    }
  };

  ws.onerror = () => {
    status.textContent = "❌ Render connection failed";
    startBtn.disabled = false;
    stopBtn.disabled = true;
  };

  ws.onclose = () => {
    status.textContent = "🔌 Render connection closed";
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

// Start the Render-optimized audio system
connectAsUser();

// Check Render health for admin page
document.addEventListener('DOMContentLoaded', () => {
  async function checkRenderHealth() {
    try {
      const response = await fetch('/health');
      const data = await response.json();
      const healthSpan = document.getElementById('render-health');
      if (healthSpan) {
        healthSpan.textContent = `✅ UP (${data.clients} clients, ${data.uptime}s)`;
        healthSpan.style.color = 'green';
      }
    } catch (error) {
      const healthSpan = document.getElementById('render-health');
      if (healthSpan) {
        healthSpan.textContent = '❌ DOWN';
        healthSpan.style.color = 'red';
      }
    }
  }

  // Check health every 30 seconds if on admin page
  if (document.getElementById('render-health')) {
    checkRenderHealth();
    setInterval(checkRenderHealth, 30000);
  }
});
