uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;
varying float vType;
varying float vLife;

void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv);
    float alpha = 0.0;

    if (vType < 0.5) {
        // Soft cinematic smoke/silk flow
        // Very soft radial gradient, not a sharp line
        alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        alpha *= 0.35; // Keep it subtle and transparent
    } else if (vType < 1.5) {
        // Anime Flower motif - softer outline
        float angle = atan(uv.y, uv.x);
        float petals = cos(angle * 6.0) * 0.15 + 0.3;
        
        // Soft outer ring
        float ring = (1.0 - smoothstep(petals - 0.05, petals + 0.05, dist)) * smoothstep(petals - 0.15, petals - 0.05, dist);
        
        // Soft core
        float core = 1.0 - smoothstep(0.0, 0.2, dist);
        
        alpha = (ring + core * 0.5) * 0.6;
    } else {
        // Elegant soft stars
        float h = abs(uv.x);
        float v = abs(uv.y);
        
        float star = (1.0 - smoothstep(0.0, 0.1, v)) * (1.0 - smoothstep(0.0, 0.4, h));
        star += (1.0 - smoothstep(0.0, 0.1, h)) * (1.0 - smoothstep(0.0, 0.4, v));
        
        float core = 1.0 - smoothstep(0.0, 0.15, dist);
        alpha = (star + core) * 0.8;
    }

    if (alpha < 0.01) discard;

    // Elegant cinematic multiplier instead of a huge neon boost
    float boost = 1.2; 
    
    // We apply uOpacity from GSAP and vAlpha from the particle lifecycle
    gl_FragColor = vec4(vColor * boost, alpha * vAlpha * uOpacity);
}
