import * as THREE from 'three';
import { Ecosystem } from './Ecosystem.js';

/**
 * The Sound Engine (Phase 2: Micro-Interactions)
 * Procedural audio generation using the Web Audio API to create haunting,
 * ethereal sounds (bells, wind, spirits) without needing external audio files.
 */
class SoundEngineSystem {
  constructor() {
    this.audioContext = null;
    this.isInitialized = false;
    
    // We need to wait for a user interaction to start the AudioContext
    document.addEventListener('click', () => this.init(), { once: true });
    
    // Listen for Ecosystem Events
    Ecosystem.on('invisibleGod', (event) => {
      if (event.type === 'bellEcho') {
        this.playProceduralBell(440, 2.0); // A4
      } else if (event.type === 'spiritPass') {
        this.playWindHowl();
      }
    });
  }

  init() {
    if (this.isInitialized) return;
    
    // Create audio context
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContext();
    this.isInitialized = true;
    
    // Create a master convolver for a massive, echoing "Himalayan Valley" reverb
    this.reverbNode = this.audioContext.createConvolver();
    this.reverbNode.buffer = this.createImpulseResponse(4.0, 4.0); // 4 sec decay
    
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.5; // Master volume
    
    // Route: Synths -> Reverb -> Master -> Destination
    this.reverbNode.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);
  }

  // Generates a synthetic impulse response for massive reverb
  createImpulseResponse(duration, decay) {
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    
    for (let i = 0; i < length; i++) {
      const n = i === 0 ? 1 : Math.random() * 2 - 1;
      left[i] = (n * Math.pow(1 - i / length, decay)) * (Math.random() > 0.5 ? 1 : -1);
      right[i] = (n * Math.pow(1 - i / length, decay)) * (Math.random() > 0.5 ? 1 : -1);
    }
    return impulse;
  }

  playProceduralBell(frequency = 440, duration = 3.0) {
    if (!this.isInitialized) return;
    
    const t = this.audioContext.currentTime;
    
    // Complex bell sound made of multiple oscillators (FM Synthesis style)
    const fundamental = this.audioContext.createOscillator();
    const partial1 = this.audioContext.createOscillator();
    const partial2 = this.audioContext.createOscillator();
    
    fundamental.type = 'sine';
    partial1.type = 'sine';
    partial2.type = 'triangle'; // Adds metallic edge
    
    fundamental.frequency.value = frequency;
    partial1.frequency.value = frequency * 2.76; // Typical bell inharmonic partial
    partial2.frequency.value = frequency * 5.4;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.8, t + 0.02); // Sharp attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration); // Long decay
    
    fundamental.connect(gainNode);
    partial1.connect(gainNode);
    partial2.connect(gainNode);
    gainNode.connect(this.reverbNode); // Send to big reverb
    
    fundamental.start(t);
    partial1.start(t);
    partial2.start(t);
    
    fundamental.stop(t + duration);
    partial1.stop(t + duration);
    partial2.stop(t + duration);
  }
  
  playWindHowl() {
    if (!this.isInitialized) return;
    
    const t = this.audioContext.currentTime;
    const duration = 5.0;
    
    // Create white noise with a buffer
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;
    
    // Filter the noise to sound like wind howling
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.0;
    
    // Sweep the frequency to simulate howling
    filter.frequency.setValueAtTime(150, t);
    filter.frequency.exponentialRampToValueAtTime(800, t + duration/2);
    filter.frequency.exponentialRampToValueAtTime(150, t + duration);
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.3, t + duration/3);
    gainNode.gain.linearRampToValueAtTime(0, t + duration);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.reverbNode);
    
    noise.start(t);
  }
}

export const SoundEngine = new SoundEngineSystem();
