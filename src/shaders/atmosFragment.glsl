uniform float uOpacity;
varying float vAlpha;

void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv);

    // Soft radial gradient — large, diffuse mist particle
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    // Square the falloff for an even softer, more mist-like look
    alpha = alpha * alpha;

    if (alpha < 0.005) discard;

    // Warm white-grey mist color — authentic Himalayan atmosphere
    vec3 mistColor = vec3(0.88, 0.86, 0.84);

    gl_FragColor = vec4(mistColor, alpha * vAlpha * uOpacity * 0.35);
}
