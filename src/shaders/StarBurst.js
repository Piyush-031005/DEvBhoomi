import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uDensity;
  uniform float uStarCount;
  uniform vec3 uColor;
  uniform float uCenterX;
  uniform float uCenterY;
  uniform float uStarSize;
  uniform float uBrightness;
  uniform float uOpacity;
  uniform float uFlowerIntensity;
  uniform float uTwinkleSpeed;
  uniform float uWobbleAmount;
  uniform float uInnerLayerIntensity;
  uniform float uOuterLayerIntensity;
  uniform float uFadeHeight;

  varying vec2 vUv;

  #define PI 3.14159265359

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    f = f * f * (3.0 - 2.0 * f);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(
      mix(a, b, f.x),
      mix(c, d, f.x),
      f.y
    );
  }

  void main() {
    vec2 uv = vUv;
    vec2 center = vec2(uCenterX, uCenterY);
    vec2 p = uv - center;
    p.x *= 1.6;

    float radius = length(p);
    float angle = atan(p.y, p.x);

    float time = uTime * uSpeed;
    float radialMovement = fract(radius * uDensity - time * 0.22);
    float streakMask = smoothstep(1.0, 0.0, radialMovement);

    float angularPosition = angle / (2.0 * PI) + 0.5;
    float starIndex = floor(angularPosition * uStarCount);
    float starRandom = hash21(vec2(starIndex, 7.21));

    float wobble = sin(time * (1.0 + starRandom * uTwinkleSpeed * 5.0) + starRandom * 50.0);
    float angularWidth = 0.0015 + starRandom * 0.004;
    float angularDistance = abs(fract(angularPosition - wobble * 0.0005 * uWobbleAmount) - 0.5);
    float starMask = smoothstep(angularWidth, 0.0, angularDistance);

    float radialNoise = noise(vec2(starIndex * 0.17, radialMovement * 7.0));
    float particleMask = smoothstep(0.15, 0.8, radialNoise);

    float inner = exp(-radius * 7.0) * uInnerLayerIntensity;
    float outer = exp(-radius * 1.8) * uOuterLayerIntensity;

    float streak = streakMask * starMask * particleMask * (0.5 + radius * 2.0);
    streak *= mix(uInnerLayerIntensity, uOuterLayerIntensity, radius);

    float flowerAngle = sin(angle * 8.0 + time * 0.5);
    float flower = exp(-radius * 18.0) * (0.5 + 0.5 * flowerAngle) * uFlowerIntensity;

    float twinkle = 0.65 + 0.35 * sin(time * uTwinkleSpeed * 8.0 + starRandom * 30.0);

    float intensity = streak * twinkle + inner + flower;
    intensity *= 0.5 + uStarSize * 2.0;
    intensity *= uBrightness;

    float verticalFade = smoothstep(0.0, 1.0, pow(1.0 - abs(uv.y - 0.5) * 2.0, uFadeHeight));
    intensity *= verticalFade;
    intensity *= smoothstep(1.2, 0.05, radius);

    vec3 finalColor = uColor * intensity;
    gl_FragColor = vec4(finalColor, intensity * uOpacity);
  }
`;

export function initStarBurst(scene) {
    const geometry = new THREE.PlaneGeometry(100, 100);
    
    // StarBurst config based on user's App snippet
    const uniforms = {
        uTime: { value: 0 },
        uSpeed: { value: 1.1 },
        uDensity: { value: 1.0 },
        uStarCount: { value: 150 },
        uColor: { value: new THREE.Color('#3bffff') },
        uCenterX: { value: 0.5 },
        uCenterY: { value: 1.0 }, // Emitting from top of screen!
        uStarSize: { value: 0.6 },
        uBrightness: { value: 0.8 },
        uOpacity: { value: 0.9 },
        uFlowerIntensity: { value: 0.6 },
        uTwinkleSpeed: { value: 0.3 },
        uWobbleAmount: { value: 1.0 },
        uInnerLayerIntensity: { value: 1.6 },
        uOuterLayerIntensity: { value: 1.3 },
        uFadeHeight: { value: 2.4 }
    };

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        depthWrite: false,
        transparent: true,
        blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(geometry, material);
    
    // Position far back as a background in the HERO section
    mesh.position.set(0, 0, -25);
    scene.add(mesh);

    return { mesh, uniforms };
}
