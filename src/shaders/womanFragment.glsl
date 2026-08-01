uniform sampler2D uTexture;
varying vec2 vUv;
varying float vProgress;

void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    
    // Add golden glow as it explodes
    vec3 goldColor = vec3(0.81, 0.71, 0.23);
    
    // Mix original color with glowing gold based on progress
    vec3 finalColor = mix(texColor.rgb, goldColor, vProgress * 0.8);
    
    // Make particles fade out at the very end
    float alpha = mix(1.0, 0.0, clamp((vProgress - 0.5) * 2.0, 0.0, 1.0));
    alpha *= texColor.a; // respect original image alpha
    
    // Add circular particle shape
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    gl_FragColor = vec4(finalColor, alpha);
}
