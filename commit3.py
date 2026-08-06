import re

new_shader = """uniform float uTime;
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

// 2D Noise for smooth liquid displacement
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
    // 1. Maintain Aspect Ratio (Assume roughly 16:9 screen)
    vec2 uv = vUv;
    vec2 p = uv * 2.0 - 1.0;
    
    // 2. Smooth Liquid Displacement
    // Mouse distance for liquid ripple
    float dist = distance(uv, uMouse);
    float ripple = sin(dist * 10.0 - uTime * 2.0) * 0.03 * exp(-dist * 4.0) * uHover;
    
    // Scroll distortion using large-scale noise (organic flow)
    float scrollWarp = noise(uv * 3.0 + uTime * 0.2) * 0.1 * abs(uScrollVelocity);
    
    // Add a very subtle continuous breathing warp
    float breath = noise(uv * 2.0 - uTime * 0.1) * 0.01;
    
    // Total smooth displacement
    vec2 disp = vec2(ripple + scrollWarp + breath, -ripple - scrollWarp + breath);
    
    // 3. Sample Textures (NO RGB SPLIT)
    vec2 finalUV = uv + disp;
    // Clamp to avoid edge wrapping
    finalUV = clamp(finalUV, 0.001, 0.999);
    
    vec4 tex1 = texture2D(tImg1, finalUV);
    vec4 tex2 = texture2D(tImg2, finalUV);
    vec4 tex3 = texture2D(tImg3, finalUV);
    vec4 tex4 = texture2D(tImg4, finalUV);
    
    // 4. Smooth Crossfade Transition (Interpolate based on uScrollVelocity or just use hard cut since GSAP fades opacity)
    vec4 finalTex = tex1;
    if (uChapter == 1) finalTex = tex2;
    else if (uChapter == 2) finalTex = tex3;
    else if (uChapter == 3) finalTex = tex4;
    
    // 5. Premium Color Grading (Sky Blue & Gold Theme)
    // Desaturate slightly and map darks to rich blacks
    float luminance = dot(finalTex.rgb, vec3(0.299, 0.587, 0.114));
    
    // Cinematic contrast
    vec3 grade = mix(vec3(0.02, 0.03, 0.05), finalTex.rgb, smoothstep(0.0, 0.8, luminance + 0.2));
    
    // Subtle dual-tone tint: Sky Blue shadows, Gold highlights
    vec3 shadowTint = vec3(0.0, 0.75, 1.0) * 0.1; // Sky blue
    vec3 highlightTint = vec3(1.0, 0.84, 0.0) * 0.1; // Gold
    
    grade += shadowTint * (1.0 - luminance);
    grade += highlightTint * luminance;
    
    // 6. Polish
    // Add cinematic grain
    float grain = hash(uv * uTime) * 0.03;
    grade += grain;
    
    // Smooth Vignette
    float vig = length(uv - 0.5) * 1.5;
    grade *= smoothstep(1.2, 0.2, vig);
    
    gl_FragColor = vec4(grade, uOpacity);
}
"""

with open('src/shaders/brutalistFragment.glsl', 'w', encoding='utf-8') as f:
    f.write(new_shader)

print("Commit 3 Applied")
