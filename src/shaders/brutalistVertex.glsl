uniform float uTime;
uniform vec2 uMouse;
uniform float uScrollVelocity;
uniform float uHover; // 0 to 1

varying vec2 vUv;
varying float vDistortion;

void main() {
    vUv = uv;
    
    vec3 pos = position;
    
    // Calculate distance from mouse to vertex for liquid distortion
    float dist = distance(uv, uMouse);
    
    // Liquid ripple effect near the mouse
    float ripple = sin(dist * 20.0 - uTime * 5.0) * 0.05 * uHover * smoothstep(0.5, 0.0, dist);
    
    // Vertical stretching based on scroll velocity (simulating speed/glitch)
    pos.y += pos.y * uScrollVelocity * 0.5;
    
    // Z-displacement (bulge) towards the camera at mouse position
    pos.z += smoothstep(0.4, 0.0, dist) * 2.0 * uHover;
    
    vDistortion = ripple + (uScrollVelocity * 0.1);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
