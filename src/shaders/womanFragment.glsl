uniform float uOpacity;
varying vec3 vColor;
varying float vAge;
varying float vAlpha;
varying float vType;

void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv);
    float alpha = 0.0;

    if (vType < 0.5) {
        // --- RIBBON: thin luminous thread ---
        float lineAlpha = 1.0 - smoothstep(0.0, 0.12, abs(uv.y));
        lineAlpha *= (1.0 - smoothstep(0.1, 0.5, abs(uv.x)));
        alpha = lineAlpha * 1.4; // boost for additive glow
    } else if (vType < 1.5) {
        // --- FLOWER: 6-petal anime bloom ---
        float angle = atan(uv.y, uv.x);
        float petal = cos(angle * 6.0) * 0.18 + 0.32;
        alpha = 1.0 - smoothstep(petal - 0.04, petal + 0.06, dist);
        // Bright glowing core
        alpha += (1.0 - smoothstep(0.0, 0.12, dist)) * 0.7;
    } else {
        // --- STAR: 4-point sparkle ---
        float a = atan(uv.y, uv.x);
        float starShape = cos(a * 4.0) * 0.2 + 0.25;
        alpha = 1.0 - smoothstep(starShape - 0.03, starShape + 0.05, dist);
        // Core bright dot
        alpha += (1.0 - smoothstep(0.0, 0.08, dist)) * 0.9;
    }

    if (alpha < 0.01) discard;

    // Bloom glow: scale up rgb with additive blending for anime glowing look
    gl_FragColor = vec4(vColor * 1.3, alpha * vAlpha * uOpacity);
}
