uniform float uTime;
uniform float uOpacity;

attribute float aSize;
attribute float aOffset;
attribute float aSpeed;

varying float vAlpha;

void main() {
    vec3 pos = position;

    // Drift upward slowly with slight horizontal sway
    float t = mod(uTime * aSpeed + aOffset, 1.0);
    pos.y += (t * 28.0) - 14.0;
    pos.x += sin(uTime * 0.4 + aOffset * 6.28) * 2.5;

    // Fade in at bottom, fade out at top
    vAlpha = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.75, 1.0, t));

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Perspective-correct size
    gl_PointSize = (aSize * 60.0) / -mvPos.z;
}
