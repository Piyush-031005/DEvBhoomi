uniform float uTime;
uniform float uOpacity;
uniform vec3 uWind;

attribute float aSize;
attribute float aOffset;
attribute float aSpeed;

varying float vAlpha;

void main() {
    vec3 pos = position;

    // Drift upward slowly, but also push using the ecosystem wind vector
    float t = mod(uTime * aSpeed + aOffset, 1.0);
    pos.y += (t * 28.0) - 14.0 + (uWind.y * uTime * 2.0);
    pos.x += sin(uTime * 0.4 + aOffset * 6.28) * 2.5 + (uWind.x * uTime * 2.0);
    pos.z += (uWind.z * uTime * 2.0);

    // Fade in at bottom, fade out at top
    vAlpha = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.75, 1.0, t));

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Perspective-correct size
    gl_PointSize = (aSize * 60.0) / -mvPos.z;
}
