uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uScrollVelocity;
uniform float uHover;
uniform float uOpacity;
uniform vec2 uMouse;

varying vec2 vUv;
varying float vDistortion;

// Random noise for film grain and glitch
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = vUv;
    
    // 1. Hover Liquid/Glitch Distortion
    float dist = distance(uv, uMouse);
    float hoverDistort = smoothstep(0.4, 0.0, dist) * uHover;
    uv.x += sin(uv.y * 50.0 + uTime * 10.0) * 0.02 * hoverDistort;
    
    // 2. Scroll-based RGB Shift (Chromatic Aberration)
    // The faster we scroll, the further the red/blue channels separate
    float shiftAmt = abs(uScrollVelocity) * 0.2 + (vDistortion * 0.5) + (hoverDistort * 0.05);
    
    // Glitch line effect: blocky horizontal tearing
    float glitchLine = step(0.98, sin(uv.y * 100.0 + uTime * 20.0)) * uScrollVelocity * 0.1;
    uv.x += glitchLine;
    
    vec4 cr = texture2D(tDiffuse, uv + vec2(shiftAmt, 0.0));
    vec4 cg = texture2D(tDiffuse, uv);
    vec4 cb = texture2D(tDiffuse, uv - vec2(shiftAmt, 0.0));
    
    vec4 finalColor = vec4(cr.r, cg.g, cb.b, cg.a);
    
    // 3. Brutalist Color Grading
    // High contrast, slightly desaturated, pushing towards deep reds/blacks
    float luma = dot(finalColor.rgb, vec3(0.299, 0.587, 0.114));
    
    // Brutalist poster style: crush the blacks, pop the whites
    float contrast = 1.5;
    vec3 contrasted = (finalColor.rgb - 0.5) * contrast + 0.5;
    
    // Mix in a harsh red tint based on luminosity (dark areas get red/black, bright stay bright)
    vec3 brutalRed = vec3(0.9, 0.05, 0.05);
    vec3 tinted = mix(vec3(0.0), brutalRed, luma * 1.5);
    tinted = mix(tinted, vec3(1.0), smoothstep(0.7, 1.0, luma)); // preserve bright highlights
    
    // Blend original contrasted color with brutalist tint based on scroll velocity (it gets more aggressive as you scroll fast)
    float aggro = clamp(abs(uScrollVelocity) * 5.0 + uHover, 0.0, 0.8);
    finalColor.rgb = mix(contrasted, tinted, aggro);
    
    // 4. Film Grain
    float grain = (random(uv + uTime) - 0.5) * 0.15;
    finalColor.rgb += grain;
    
    // Vignette for cinematic framing
    float vignette = 1.0 - smoothstep(0.5, 1.5, length(uv - 0.5));
    finalColor.rgb *= vignette;
    
    gl_FragColor = vec4(finalColor.rgb, finalColor.a * uOpacity);
}
