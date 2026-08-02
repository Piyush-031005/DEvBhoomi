uniform float uOpacity;
varying vec3  vColor;
varying float vAlpha;
varying float vType;
varying float vT;

void main(){
  vec2 uv   = gl_PointCoord - vec2(0.5);
  float dist = length(uv);

  float alpha = 0.0;

  if (vType < 0.5) {
    // ── MAIN FLOW LINE: Demon Slayer stroke ──────────────────────────
    // Ultra-thin bright core + wide soft glow halo
    // This is the water/flame breathing signature look

    // Bright core: very tight hot-white centre
    float core  = 1.0 - smoothstep(0.0, 0.12, dist);
    // Inner glow: medium ring
    float glow1 = (1.0 - smoothstep(0.05, 0.35, dist)) * 0.6;
    // Outer aura: wide soft halo
    float glow2 = (1.0 - smoothstep(0.1,  0.5,  dist)) * 0.25;

    alpha = core + glow1 + glow2;

    // Boost color towards pure white at core (Demon Slayer tips are white-hot)
    // We do this by multiplying: the fragment color contribution is handled
    // by additive blending on the renderer side.
    alpha = clamp(alpha, 0.0, 1.0);

  } else if (vType < 1.5) {
    // ── FLOWER PETAL (illustrated outline style) ───────────────────
    // Like the purple flowers in the reference — thin outline, not filled
    float angle  = atan(uv.y, uv.x);
    float petals = cos(angle * 6.0) * 0.17 + 0.28;

    // Outline ring at the petal edge
    float outer  = 1.0 - smoothstep(petals - 0.04, petals + 0.02, dist);
    float inner  = smoothstep(petals - 0.14, petals - 0.05, dist);
    float petal  = outer * inner;   // Only the ring, not the fill

    // Glowing core dot
    float core   = (1.0 - smoothstep(0.0, 0.08, dist)) * 0.9;

    alpha = clamp(petal * 1.8 + core, 0.0, 1.0);

  } else {
    // ── STAR / SPARKLE (fish scales / sparkle accents) ─────────────
    // 4-point cross sparkle — the "star" accents seen throughout
    float h    = abs(uv.x);
    float v    = abs(uv.y);

    // Two perpendicular blades
    float blade1 = (1.0 - smoothstep(0.0, 0.08, v)) * (1.0 - smoothstep(0.0, 0.5, h));
    float blade2 = (1.0 - smoothstep(0.0, 0.08, h)) * (1.0 - smoothstep(0.0, 0.5, v));
    float star   = blade1 + blade2;

    // Bright centre
    float core   = (1.0 - smoothstep(0.0, 0.07, dist)) * 1.2;

    alpha = clamp(star + core, 0.0, 1.0);
  }

  if (alpha < 0.01) discard;

  // Additive blending is set on the material.
  // Multiply colour by a boost so the thin lines accumulate brightly.
  float boost = (vType < 0.5) ? 1.8 : 1.3;
  gl_FragColor = vec4(vColor * boost, alpha * vAlpha * uOpacity);
}
