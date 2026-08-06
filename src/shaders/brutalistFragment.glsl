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
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

// ============================================================
// MAIN — Pure dark cinematic background. No images.
// ============================================================
void main() {
    vec2 uv = vUv;
    
    // Mouse ripple
    float dist = distance(uv, uMouse);
    float ripple = sin(dist * 12.0 - uTime * 2.5) * 0.02 * exp(-dist * 5.0) * uHover;
    
    // Slow organic noise warp
    float n1 = noise(uv * 2.0 + uTime * 0.05);
    float n2 = noise(uv * 4.0 - uTime * 0.07);
    
    // Deep dark base — near black with a very subtle red ember deep inside
    vec3 base = vec3(0.04, 0.01, 0.01);
    
    // Chapter-based colour variation (subtle hue shifts, all dark)
    vec3 chapterTint;
    if (uChapter == 0) chapterTint = vec3(0.15, 0.02, 0.02); // Deep crimson
    else if (uChapter == 1) chapterTint = vec3(0.08, 0.04, 0.02); // Ember orange-black
    else if (uChapter == 2) chapterTint = vec3(0.03, 0.02, 0.06); // Midnight indigo
    else chapterTint = vec3(0.06, 0.05, 0.02); // Aged gold-black
    
    // Blend noise into tint
    vec3 color = mix(base, chapterTint, n1 * 0.6 + n2 * 0.3);
    
    // Subtle "fire ember" glow from bottom center
    float emberDist = length(uv - vec2(0.5, 0.0)) * 1.4;
    float ember = smoothstep(1.0, 0.0, emberDist) * 0.08;
    color += vec3(ember * 0.9, ember * 0.15, ember * 0.05);
    
    // Mouse ripple colour pulse (red flash)
    color += vec3(0.12, 0.0, 0.0) * ripple * ripple * 20.0;
    
    // Cinematic grain
    float grain = (hash(uv + uTime * 0.01) - 0.5) * 0.025;
    color += grain;
    
    // Vignette — deep, pulls corners to near-black
    float vig = length(uv - 0.5) * 1.8;
    color *= smoothstep(1.4, 0.1, vig);
    
    gl_FragColor = vec4(color, uOpacity);
}
