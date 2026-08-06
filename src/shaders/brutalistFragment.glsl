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
// MAIN COMPOSITOR
// ============================================================
void main() {
    vec2 uv = vUv;
    
    // Smooth Liquid Displacement (Kept simple and clean)
    float dist = distance(uv, uMouse);
    float ripple = sin(dist * 10.0 - uTime * 2.0) * 0.02 * exp(-dist * 4.0) * uHover;
    float scrollWarp = noise(uv * 3.0 + uTime * 0.2) * 0.05 * abs(uScrollVelocity);
    
    vec2 disp = vec2(ripple + scrollWarp, -ripple - scrollWarp);
    vec2 finalUV = uv + disp;
    finalUV = clamp(finalUV, 0.001, 0.999);
    
    // Sample Textures
    vec4 tex1 = texture2D(tImg1, finalUV);
    vec4 tex2 = texture2D(tImg2, finalUV);
    vec4 tex3 = texture2D(tImg3, finalUV);
    vec4 tex4 = texture2D(tImg4, finalUV);
    
    vec4 finalTex = tex1;
    if (uChapter == 1) finalTex = tex2;
    else if (uChapter == 2) finalTex = tex3;
    else if (uChapter == 3) finalTex = tex4;
    
    // Clean Display (No extreme color destroying grades)
    vec3 color = finalTex.rgb;
    
    // Very subtle dark red tint in the shadows to match the Brutalist theme,
    // but preserving the original image's highlights and colors.
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 shadowTint = vec3(0.2, 0.0, 0.0) * (1.0 - luminance) * 0.5; 
    color += shadowTint;
    
    // Cinematic grain
    float grain = hash(uv * uTime) * 0.03;
    color += grain;
    
    // Smooth Vignette to blend into the red/black background
    float vig = length(uv - 0.5) * 1.5;
    color *= smoothstep(1.3, 0.3, vig);
    
    gl_FragColor = vec4(color, uOpacity);
}
