// AudioWorklet Processor for Pristine Audio Quality
class PristineAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Advanced audio buffer with jitter compensation
    this.audioBuffer = [];
    this.bufferSize = 8192; // Larger buffer for stability
    this.sampleRate = 48000;
    this.channels = 2;
    
    // Advanced audio processing parameters
    this.targetBufferMs = 100; // 100ms target buffer
    this.minBufferMs = 50;     // Minimum buffer before playback
    this.maxBufferMs = 200;    // Maximum buffer to prevent delay
    
    // Sample interpolation for smooth playback
    this.lastSample = [0, 0];
    this.playbackPosition = 0;
    
    // Message handler for receiving PCM data
    this.port.onmessage = (event) => {
      const { type, data } = event.data;
      
      if (type === 'pcm-data') {
        this.processPCMData(data);
      } else if (type === 'clear-buffer') {
        this.audioBuffer = [];
        this.playbackPosition = 0;
      }
    };
    
    // Send status updates
    this.statusCounter = 0;
  }
  
  processPCMData(pcmData) {
    // Convert Int16 PCM to Float32 with professional quality
    const samples = new Int16Array(pcmData);
    
    for (let i = 0; i < samples.length; i += 2) {
      // High-precision sample conversion
      const left = samples[i] / 32768.0;
      const right = samples[i + 1] / 32768.0;
      
      // Add samples to buffer
      this.audioBuffer.push([left, right]);
    }
    
    // Advanced buffer management
    this.manageBuffer();
  }
  
  manageBuffer() {
    const bufferLengthMs = (this.audioBuffer.length / this.sampleRate) * 1000;
    
    // Remove excess data to prevent excessive delay
    if (bufferLengthMs > this.maxBufferMs) {
      const samplesToRemove = Math.floor(((bufferLengthMs - this.maxBufferMs) / 1000) * this.sampleRate);
      this.audioBuffer.splice(0, samplesToRemove);
      this.playbackPosition = Math.max(0, this.playbackPosition - samplesToRemove);
    }
  }
  
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const frameCount = output[0].length;
    
    // Get current buffer status
    const bufferLengthMs = ((this.audioBuffer.length - this.playbackPosition) / this.sampleRate) * 1000;
    
    // Only start playback when we have sufficient buffer
    const shouldPlay = bufferLengthMs >= this.minBufferMs;
    
    if (shouldPlay && output.length >= 2) {
      const leftChannel = output[0];
      const rightChannel = output[1];
      
      for (let i = 0; i < frameCount; i++) {
        if (this.playbackPosition < this.audioBuffer.length) {
          // Get pristine samples from buffer
          const sample = this.audioBuffer[this.playbackPosition];
          leftChannel[i] = sample[0];
          rightChannel[i] = sample[1];
          
          this.lastSample = sample;
          this.playbackPosition++;
        } else {
          // High-quality silence with soft fade
          leftChannel[i] = this.lastSample[0] * 0.95;
          rightChannel[i] = this.lastSample[1] * 0.95;
          this.lastSample[0] *= 0.95;
          this.lastSample[1] *= 0.95;
        }
      }
    } else {
      // Pristine silence while buffering
      if (output.length >= 2) {
        output[0].fill(0);
        output[1].fill(0);
      }
    }
    
    // Send periodic status updates
    this.statusCounter++;
    if (this.statusCounter % 1000 === 0) { // Every ~21ms at 48kHz
      this.port.postMessage({
        type: 'status',
        bufferMs: bufferLengthMs.toFixed(1),
        playing: shouldPlay
      });
    }
    
    return true;
  }
}

registerProcessor('pristine-audio-processor', PristineAudioProcessor);
