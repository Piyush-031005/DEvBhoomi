import * as THREE from 'three';

/**
 * The Ecosystem Engine
 * "Everything reacts to everything."
 * This singleton manages global variables like Wind, Time, and broadcasts events 
 * (like a bell ringing) to all active systems (particles, trees, animals).
 */
class EcosystemEngine {
  constructor() {
    // Global Event Bus
    this.listeners = {};
    
    // Global Variables
    this.time = 0;
    
    // Wind is a 3D vector. It slowly shifts over time.
    this.wind = new THREE.Vector3(0.5, 0, 0.2);
    this.targetWind = new THREE.Vector3(0.5, 0, 0.2);
    
    // The "Pulse" of the earth (used for the breathing mountain effect)
    this.earthPulse = 0; 
    
    // Invisible Gods: Track time since last ambient event to prevent spam
    this.lastAmbientTime = 0;
  }

  // Event System
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  // Update loop (called every frame in main.js)
  update(deltaTime) {
    this.time += deltaTime;

    // Slowly shift current wind towards target wind for smooth transitions
    this.wind.lerp(this.targetWind, 0.01);
    
    // Calculate Earth Pulse (Very slow sine wave, 40s period)
    // 2 * PI / 40 = 0.157
    this.earthPulse = Math.sin(this.time * 0.157);
    
    // ============================================================
    // INVISIBLE GODS (Ambient Events)
    // ============================================================
    // Occasionally (roughly every 8-15 seconds), trigger a random ambient event
    if (this.time - this.lastAmbientTime > 8.0) {
        if (Math.random() < 0.005) { // Low probability per frame once the cooldown passes
            this.lastAmbientTime = this.time;
            
            const eventTypes = ['windBurst', 'spiritPass', 'bellEcho'];
            const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            
            if (randomEvent === 'windBurst') {
                // A sudden harsh wind
                this.disturbWind(new THREE.Vector3(
                    (Math.random() - 0.5) * 4.0,
                    (Math.random() - 0.5) * 2.0,
                    (Math.random() - 0.5) * 4.0
                ));
            }
            
            // Broadcast so other systems (like SoundEngine or UI) can react
            this.emit('invisibleGod', { type: randomEvent, time: this.time });
        }
    }
  }

  // Cause a sudden disturbance in the ecosystem
  disturbWind(forceVector) {
    // Add sudden force, then it will naturally settle back to normal wind
    this.targetWind.add(forceVector);
    
    // Automatically calm the wind down after 5 seconds
    setTimeout(() => {
      this.targetWind.set(0.5, 0, 0.2); // Return to default breeze
    }, 5000);
  }
}

// Export a single instance to be shared across the entire app
export const Ecosystem = new EcosystemEngine();
