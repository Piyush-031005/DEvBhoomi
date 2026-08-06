uniform float uTime;
uniform float uOpacity;
uniform vec2  uMouse;
uniform float uHover;
uniform float uScrollVelocity;
uniform int   uChapter;
uniform float uIntroProgress;

uniform sampler2D tImg1;
uniform sampler2D tImg2;
uniform sampler2D tImg3;
uniform sampler2D tImg4;

varying vec2 vUv;

// ============================================================
// MATH UTILITIES
// ============================================================
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// 2D Noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float res = mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
    return res;
}

// ============================================================
// MAIN COMPOSITOR
// ============================================================
void main() {
    vec2 uv = vUv;
    
    // 1. Calculate Distortion (Liquid / RGB Split) based on Scroll & Hover
    // Mouse distance for liquid ripple
    float dist = distance(uv, uMouse);
    float ripple = sin(dist * 20.0 - uTime * 5.0) * 0.02 * exp(-dist * 5.0) * uHover;
    
    // Scroll distortion using noise
    float n = noise(uv * 10.0 + uTime * 0.5) * 0.05 * abs(uScrollVelocity);
    
    // Total displacement
    vec2 disp = vec2(ripple + n, ripple - n);
    
    // RGB Split amount
    float split = 0.02 * uHover + 0.05 * abs(uScrollVelocity);
    
    // 2. Sample Textures with Displacement
    vec4 tex1, tex2, tex3, tex4;
    
    // Red Channel (Offset -split)
    float r1 = texture2D(tImg1, uv + disp - vec2(split, 0.0)).r;
    float r2 = texture2D(tImg2, uv + disp - vec2(split, 0.0)).r;
    float r3 = texture2D(tImg3, uv + disp - vec2(split, 0.0)).r;
    float r4 = texture2D(tImg4, uv + disp - vec2(split, 0.0)).r;
    
    // Green Channel (Center)
    float g1 = texture2D(tImg1, uv + disp).g;
    float g2 = texture2D(tImg2, uv + disp).g;
    float g3 = texture2D(tImg3, uv + disp).g;
    float g4 = texture2D(tImg4, uv + disp).g;
    
    // Blue Channel (Offset +split)
    float b1 = texture2D(tImg1, uv + disp + vec2(split, 0.0)).b;
    float b2 = texture2D(tImg2, uv + disp + vec2(split, 0.0)).b;
    float b3 = texture2D(tImg3, uv + disp + vec2(split, 0.0)).b;
    float b4 = texture2D(tImg4, uv + disp + vec2(split, 0.0)).b;
    
    tex1 = vec4(r1, g1, b1, 1.0);
    tex2 = vec4(r2, g2, b2, 1.0);
    tex3 = vec4(r3, g3, b3, 1.0);
    tex4 = vec4(r4, g4, b4, 1.0);
    
    // 3. Select Chapter
    vec4 finalTex = tex1;
    if (uChapter == 1) finalTex = tex2;
    else if (uChapter == 2) finalTex = tex3;
    else if (uChapter == 3) finalTex = tex4;
    
    // 4. Color Grading (High Contrast Brutalist Cyan/Red Filter)
    // Convert to grayscale for contrast map
    float gray = dot(finalTex.rgb, vec3(0.299, 0.587, 0.114));
    
    // Map darks to deep red/black, highlights to cyan/white
    vec3 grade1 = mix(vec3(0.05, 0.0, 0.05), vec3(0.9, 0.1, 0.1), smoothstep(0.0, 0.4, gray));
    vec3 grade2 = mix(grade1, vec3(0.0, 1.0, 1.0), smoothstep(0.4, 0.8, gray)); // Cyan highlights
    vec3 grade3 = mix(grade2, vec3(1.0), smoothstep(0.8, 1.0, gray));
    
    // Blend original with stylized grade
    vec3 finalColor = mix(finalTex.rgb, grade3, 0.5 + uHover * 0.3);
    
    // Add cinematic grain
    float grain = hash(uv * uTime) * 0.05;
    finalColor += grain;
    
    // Vignette
    float vig = length(uv - 0.5) * 2.0;
    finalColor *= smoothstep(1.5, 0.5, vig);
    
    // Fade to black if intro not ready or opacity is low
    gl_FragColor = vec4(finalColor, uOpacity);
}
