// Stable AudioWorklet Processor with Conservative Buffering
class StableAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Conservative buffer management
    this.audioBuffer = [];
    this.sampleRate = 48000;
    this.channels = 2;
    
    // Conservative buffering parameters - prevent overflow
    this.targetBufferSamples = 2400; // 50ms at 48kHz
    this.maxBufferSamples = 4800;    // 100ms maximum
    this.minBufferSamples = 1200;    // 25ms minimum
    
    // Playback state
    this.playbackPosition = 0;
    this.isPlaying = false;
    
    // Message handler
    this.port.onmessage = (event) => {
      const { type, data } = event.data;
      
      if (type === 'pcm-data') {
        this.addPCMData(data);
      } else if (type === 'clear-buffer') {
        this.audioBuffer = [];
        this.playbackPosition = 0;
        this.isPlaying = false;
      }
    };
    
    // Status reporting
    this.statusCounter = 0;
  }
  
  addPCMData(pcmData) {
    const samples = new Int16Array(pcmData);
    
    // Prevent buffer overflow - drop data if buffer too large
    const availableSpace = this.maxBufferSamples - this.audioBuffer.length;
    if (availableSpace <= 0) {
      // Buffer overflow protection - remove oldest samples
      this.audioBuffer.splice(0, samples.length);
      this.playbackPosition = Math.max(0, this.playbackPosition - samples.length);
    }
    
    // Add new samples
    for (let i = 0; i < samples.length; i += 2) {
      if (i + 1 < samples.length) {
        const left = samples[i] / 32768.0;
        const right = samples[i + 1] / 32768.0;
        this.audioBuffer.push([left, right]);
      }
    }
    
    // Start playback when we have enough samples
    if (!this.isPlaying && this.audioBuffer.length >= this.minBufferSamples) {
      this.isPlaying = true;
    }
  }
  
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const frameCount = output[0].length;
    
    if (this.isPlaying && output.length >= 2) {
      const leftChannel = output[0];
      const rightChannel = output[1];
      
      for (let i = 0; i < frameCount; i++) {
        if (this.playbackPosition < this.audioBuffer.length) {
          const sample = this.audioBuffer[this.playbackPosition];
          leftChannel[i] = sample[0];
          rightChannel[i] = sample[1];
          this.playbackPosition++;
        } else {
          // No more data - output silence and stop playing
          leftChannel[i] = 0;
          rightChannel[i] = 0;
          this.isPlaying = false;
        }
      }
      
      // Clean up processed samples periodically
      if (this.playbackPosition >= this.targetBufferSamples) {
        this.audioBuffer.splice(0, this.playbackPosition);
        this.playbackPosition = 0;
      }
    } else {
      // Output silence when not playing
      if (output.length >= 2) {
        output[0].fill(0);
        output[1].fill(0);
      }
    }
    
    // Send status updates
    this.statusCounter++;
    if (this.statusCounter % 2400 === 0) { // Every 50ms
      const bufferMs = ((this.audioBuffer.length - this.playbackPosition) / this.sampleRate * 1000).toFixed(1);
      this.port.postMessage({
        type: 'status',
        bufferMs: bufferMs,
        playing: this.isPlaying
      });
    }
    
    return true;
  }
}

registerProcessor('stable-audio-processor', StableAudioProcessor);
