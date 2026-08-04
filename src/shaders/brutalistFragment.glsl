uniform sampler2D tDiffuse;
uniform sampler2D tNext;
uniform float uMixT;          // 0=tDiffuse, 1=tNext
uniform float uTime;
uniform float uScrollVelocity;
uniform float uHover;
uniform float uOpacity;
uniform vec2 uMouse;

varying vec2 vUv;
varying float vDistortion;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = vUv;

    // --- 1. Hover liquid warp ---
    float dist = distance(uv, uMouse);
    float hoverDistort = smoothstep(0.45, 0.0, dist) * uHover;
    uv.x += sin(uv.y * 48.0 + uTime * 8.0) * 0.018 * hoverDistort;

    // --- 2. Scroll RGB shift ---
    float shiftAmt = abs(uScrollVelocity) * 0.18
                   + vDistortion * 0.45
                   + hoverDistort * 0.04;

    // Glitch horizontal tear lines (appear only on fast scroll)
    float glitchMask = step(0.985, sin(uv.y * 120.0 + uTime * 22.0));
    uv.x += glitchMask * uScrollVelocity * 0.08;

    // RGB sample
    vec4 cr = texture2D(tDiffuse, uv + vec2(shiftAmt, 0.0));
    vec4 cg = texture2D(tDiffuse, uv);
    vec4 cb = texture2D(tDiffuse, uv - vec2(shiftAmt, 0.0));
    vec4 colorA = vec4(cr.r, cg.g, cb.b, cg.a);

    // Also sample tNext with the same shifts for a cross-fade
    vec4 nrA = texture2D(tNext, uv + vec2(shiftAmt, 0.0));
    vec4 ngA = texture2D(tNext, uv);
    vec4 nbA = texture2D(tNext, uv - vec2(shiftAmt, 0.0));
    vec4 colorB = vec4(nrA.r, ngA.g, nbA.b, ngA.a);

    // Blend between current and next chapter
    vec4 finalColor = mix(colorA, colorB, uMixT);

    // --- 3. Brutalist color grading ---
    float luma = dot(finalColor.rgb, vec3(0.299, 0.587, 0.114));

    // Harsh contrast crush
    vec3 contrasted = (finalColor.rgb - 0.5) * 1.6 + 0.5;
    contrasted = clamp(contrasted, 0.0, 1.0);

    // Red/black poster tint activated by interaction
    vec3 brutalRed = vec3(0.92, 0.1, 0.05);
    vec3 tinted = mix(vec3(0.0), brutalRed, luma * 1.4);
    tinted = mix(tinted, vec3(1.0), smoothstep(0.68, 1.0, luma));

    float aggro = clamp(abs(uScrollVelocity) * 4.0 + uHover * 0.6, 0.0, 0.75);
    finalColor.rgb = mix(contrasted, tinted, aggro);

    // --- 4. Film grain ---
    float grain = (random(uv + fract(uTime * 0.1)) - 0.5) * 0.12;
    finalColor.rgb += grain;

    // --- 5. Vignette ---
    float vig = 1.0 - smoothstep(0.45, 1.4, length(uv - 0.5) * 1.3);
    finalColor.rgb *= vig;

    gl_FragColor = vec4(finalColor.rgb, finalColor.a * uOpacity);
}
