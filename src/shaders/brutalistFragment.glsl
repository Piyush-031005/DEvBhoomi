// ============================================================
// DEVBHOOMI — High-End Cinematic Brutalist Shaders
// ============================================================

uniform float uTime;
uniform float uOpacity;
uniform vec2  uMouse;
uniform float uHover;
uniform float uScrollVelocity;
uniform int   uChapter;
uniform float uIntroProgress;

varying vec2 vUv;

// ============================================================
// MATH UTILITIES
// ============================================================

#define PI 3.14159265359

float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
}

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

// 3D Noise for raymarching
float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f*f*(3.0-2.0*f);
    
    float n = i.x + i.y*157.0 + 113.0*i.z;
    return mix(mix(mix( hash(vec2(n+  0.0, 0.0)), hash(vec2(n+  1.0, 0.0)),f.x),
                   mix( hash(vec2(n+157.0, 0.0)), hash(vec2(n+158.0, 0.0)),f.x),f.y),
               mix(mix( hash(vec2(n+113.0, 0.0)), hash(vec2(n+114.0, 0.0)),f.x),
                   mix( hash(vec2(n+270.0, 0.0)), hash(vec2(n+271.0, 0.0)),f.x),f.y),f.z);
}

// ============================================================
// CHAPTER 0 — PAHAD (Tech Monolith Mountain)
// Raymarched Wireframe / Glitch Geometry
// ============================================================

float sdBox( vec3 p, vec3 b ) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float mapCh0(vec3 p) {
    // A massive abstract mountain monolith
    p.y -= -1.0;
    
    // Glitch effect based on time
    float g = step(0.98, sin(uTime * 10.0)) * 0.2 * sin(p.y * 10.0 + uTime*50.0);
    p.x += g;
    
    float d = sdBox(p, vec3(2.0, 3.0, 2.0));
    
    // Add geometric cuts (Boolean subtraction) to make it look like a high-tech mountain
    vec3 q = p;
    q.xz *= rot(PI/4.0);
    float cut1 = sdBox(q - vec3(0, 1.0, 2.0), vec3(3.0, 4.0, 1.0));
    d = max(d, -cut1);
    
    float cut2 = sdBox(p - vec3(0, 2.5, 0), vec3(4.0, 1.0, 4.0));
    d = max(d, -cut2);
    
    return d;
}

vec3 renderCh0(vec2 uv) {
    vec3 ro = vec3(0.0, 0.0, -8.0);
    vec3 rd = normalize(vec3(uv, 1.5));
    
    // Rotate camera slowly
    ro.xz *= rot(uTime * 0.1);
    rd.xz *= rot(uTime * 0.1);
    
    // Mouse parallax
    ro.xy += (uMouse - 0.5) * 2.0;
    
    float t = 0.0;
    float d = 0.0;
    vec3 p;
    
    // Raymarch
    for(int i=0; i<64; i++) {
        p = ro + rd * t;
        d = mapCh0(p);
        if(d < 0.001 || t > 20.0) break;
        t += d;
    }
    
    vec3 col = vec3(0.02, 0.02, 0.03); // Background
    
    if(t < 20.0) {
        // Wireframe / scanline effect on the monolith
        float scanline = sin(p.y * 50.0 - uTime * 5.0) * 0.5 + 0.5;
        float edge = smoothstep(0.0, 0.05, abs(d)); // Approximation of edges
        
        vec3 baseColor = vec3(0.8, 0.1, 0.1); // Aggressive Brutalist Red
        
        // Add noise texture
        float n = noise3(p * 5.0);
        
        col = baseColor * (scanline * 0.8 + 0.2) * (n * 0.5 + 0.5);
        
        // Glow at the edges
        col += vec3(1.0, 0.2, 0.2) * (1.0 - smoothstep(0.0, 0.5, length(p.xy)));
    }
    
    // Add some floating data particles
    float particles = noise3(vec3(uv * 20.0, uTime * 0.5));
    if(particles > 0.8) col += vec3(0.5, 0.0, 0.0) * (particles - 0.8) * 5.0;
    
    return col;
}

// ============================================================
// CHAPTER 1 — MANDIR (Sacred Portals)
// Glowing abstract portal with volumetric light rays
// ============================================================

vec3 renderCh1(vec2 uv) {
    vec3 col = vec3(0.0);
    
    // Center the portal, slightly offset by mouse
    vec2 p = uv - (uMouse - 0.5) * 0.2;
    
    // Create an abstract glowing rectangle (portal)
    vec2 d = abs(p) - vec2(0.2, 0.5);
    float box = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    
    // Inner void
    float innerBox = length(max(abs(p) - vec2(0.15, 0.45), 0.0));
    
    // Portal Frame
    float frame = smoothstep(0.02, 0.0, abs(box));
    col += vec3(0.9, 0.1, 0.1) * frame * 2.0; // Red frame
    
    // Portal Glow (Volumetric light rays)
    float glow = 0.0;
    for(float i=0.0; i<10.0; i++) {
        vec2 rayUV = p;
        rayUV *= rot(sin(uTime * 0.2 + i) * 0.1); // Swaying rays
        float ray = max(0.0, 1.0 - abs(rayUV.x) * (10.0 + i * 2.0));
        ray *= max(0.0, 1.0 - rayUV.y * 2.0); // Fade upwards
        glow += ray * 0.05 * (sin(uTime * 2.0 + i) * 0.5 + 0.5);
    }
    
    col += vec3(1.0, 0.3, 0.1) * glow;
    
    // Inner portal energy
    if(innerBox <= 0.0) {
        float energy = noise3(vec3(p * 5.0, uTime));
        col = mix(col, vec3(0.8, 0.0, 0.0), energy * 0.5);
    }
    
    // Ground reflection
    if(p.y < -0.5) {
        float ref = smoothstep(-0.5, -0.8, p.y);
        col += vec3(0.8, 0.1, 0.1) * ref * 0.2 * noise3(vec3(p * 10.0, uTime));
    }
    
    return col;
}


// ============================================================
// CHAPTER 2 — SANSKRITI (Divine Presence)
// Rotating, highly complex geometric mandala of glowing energy
// ============================================================

vec3 renderCh2(vec2 uv) {
    vec2 p = uv;
    p -= (uMouse - 0.5) * 0.1;
    
    vec3 col = vec3(0.0);
    
    // Create multiple rotating layers of geometry
    for(float i=1.0; i<=4.0; i++) {
        vec2 q = p;
        q *= rot(uTime * 0.2 * (i > 2.0 ? -1.0 : 1.0) / i);
        
        // Polar coordinates
        float a = atan(q.y, q.x);
        float r = length(q);
        
        // Mandala petals / geometry
        float segments = 8.0 * i;
        float petal = cos(a * segments) * 0.1 * sin(uTime + i);
        
        float circle = abs(r - (0.2 * i) - petal);
        
        float intensity = 0.01 / max(circle, 0.001); // Glow math
        
        // Color palette: Brutalist Red and White
        vec3 layerColor = mix(vec3(1.0, 0.1, 0.1), vec3(0.9, 0.9, 0.9), mod(i, 2.0));
        
        col += layerColor * intensity * 0.5;
    }
    
    // Center bindu (energy core)
    float core = 0.02 / max(length(p), 0.001);
    col += vec3(1.0, 0.0, 0.0) * core;
    
    return col;
}


// ============================================================
// CHAPTER 3 — PRAKRITI (The Wild)
// Matrix-like digital fluid simulation / Data Rain
// ============================================================

vec3 renderCh3(vec2 uv) {
    vec3 col = vec3(0.0);
    
    // Digital rain effect
    vec2 p = uv * 5.0; // Scale up for "columns"
    
    // Create discrete columns
    float colIndex = floor(p.x);
    
    // Speed varies per column
    float speed = hash(vec2(colIndex, 1.0)) * 2.0 + 1.0;
    
    // Drop position
    float yOffset = uTime * speed;
    float drop = fract(p.y + yOffset);
    
    // Randomize drop length
    float dropLength = hash(vec2(colIndex, 2.0)) * 0.5 + 0.2;
    
    // Render drop
    float intensity = smoothstep(1.0 - dropLength, 1.0, drop);
    intensity *= step(0.1, hash(vec2(colIndex, floor(p.y + yOffset)))); // "Characters"
    
    // Mouse interaction: push drops away
    float distToMouse = length(uv - uMouse + 0.5);
    float repulsion = smoothstep(0.2, 0.0, distToMouse);
    intensity *= (1.0 - repulsion);
    
    // Color: Brutalist Red Digital Rain
    col = vec3(0.9, 0.1, 0.1) * intensity;
    
    // Add bright head to the drop
    if(drop > 0.95) col = vec3(1.0, 1.0, 1.0);
    
    // Background fluid noise representing nature
    float fluid = noise3(vec3(uv * 3.0, uTime * 0.2));
    col += vec3(0.1, 0.0, 0.0) * fluid;
    
    return col;
}

// ============================================================
// MAIN COMPOSITOR
// ============================================================
void main() {
    // Normalize UVs (-1 to 1, aspect corrected)
    vec2 p = (vUv - 0.5) * 2.0;
    p.x *= 1.777; // Assuming roughly 16:9 aspect
    
    vec3 finalColor = vec3(0.0);
    
    if (uChapter == 0) {
        finalColor = renderCh0(p);
    } else if (uChapter == 1) {
        finalColor = renderCh1(p);
    } else if (uChapter == 2) {
        finalColor = renderCh2(p);
    } else if (uChapter == 3) {
        finalColor = renderCh3(p);
    } else {
        // Hero / Intro (Solid Dark)
        finalColor = vec3(0.04, 0.04, 0.05);
    }
    
    // Add cinematic grain
    float grain = hash(vUv * uTime) * 0.05;
    finalColor += grain;
    
    // Vignette
    float vig = length(vUv - 0.5) * 2.0;
    finalColor *= smoothstep(1.5, 0.5, vig);
    
    gl_FragColor = vec4(finalColor, uOpacity);
}
