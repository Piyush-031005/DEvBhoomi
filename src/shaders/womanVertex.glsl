uniform float uTime;
uniform float uEvolution;
attribute float aOffset;
attribute float aRandom;
attribute float aType; // 0=ribbon, 1=flower, 2=star

varying vec3 vColor;
varying float vAge;
varying float vAlpha;
varying float vType;

// Simplex 3D Noise
vec4 permute4(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
float taylorInvSqrt1(float r){return 1.79284291400159 - 0.85373472095314 * r;}
vec4 taylorInvSqrt4(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0*C.xxx;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = permute4(permute4(permute4(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt4(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
    // Per-particle lifetime
    float speed = mix(0.08, 0.18, aRandom);
    float age = fract((uTime * speed) + aOffset);
    vAge = age;
    vType = aType;

    vec3 pos = position;

    // --- CORE MOTION: Rise from bottom, sweep to upper-left like in the reference ---
    float t = age;

    // Primary upward flow
    pos.y += t * 18.0;

    // Sweep leftward for the main flow
    pos.x += t * mix(-4.0, -9.0, aRandom);

    // Curl noise adds organic fluid swirling motion
    float freq = 0.18;
    float n1 = snoise(vec3(pos.x * freq, pos.y * freq, uTime * 0.08 + aOffset * 0.1));
    float n2 = snoise(vec3(pos.y * freq + 5.7, pos.x * freq, uTime * 0.06));
    float n3 = snoise(vec3(pos.x * freq + 11.3, pos.y * freq + 3.1, uTime * 0.1));

    pos.x += n1 * t * 5.0;
    pos.y += n2 * t * 3.0;
    pos.z += n3 * t * 2.0;

    // Ribbon type: add extra sinusoidal wiggle
    if (aType < 0.5) {
        float wave = sin(t * 15.0 + aOffset * 6.28) * 1.8 * t;
        pos.x += wave;
    }

    // Keep everything behind the woman's face (push away from center)
    float faceR = 2.0;
    float d = length(pos.xy);
    if (d < faceR) {
        pos.xy += normalize(pos.xy) * (faceR - d) * 1.5;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // --- PARTICLE SIZE ---
    float baseSize = 18.0;
    if (aType < 0.5) baseSize = 7.0;   // Ribbon line — thin
    if (aType > 1.5) baseSize = 28.0;   // Star — bigger
    // Flowers
    if (aType > 0.5 && aType < 1.5) baseSize = 22.0;

    // Grow in, shrink out
    float sizeAge = sin(t * 3.14159);
    gl_PointSize = (baseSize * sizeAge) / -mvPosition.z;

    // --- COLOR PALETTE: anime blue/cyan/magenta/white inspired by reference image ---
    vec3 cBlue    = vec3(0.15, 0.55, 1.0);    // glowing blue
    vec3 cCyan    = vec3(0.0, 0.85, 1.0);     // electric cyan  
    vec3 cPurple  = vec3(0.55, 0.1, 0.9);     // deep violet
    vec3 cMagenta = vec3(0.95, 0.25, 0.75);   // hot pink
    vec3 cWhite   = vec3(0.9, 0.95, 1.0);     // cool white

    vec3 particleColor;
    if (aRandom < 0.3)       particleColor = mix(cCyan, cBlue, aRandom / 0.3);
    else if (aRandom < 0.55) particleColor = mix(cBlue, cPurple, (aRandom - 0.3) / 0.25);
    else if (aRandom < 0.8)  particleColor = mix(cPurple, cMagenta, (aRandom - 0.55) / 0.25);
    else                     particleColor = mix(cMagenta, cWhite, (aRandom - 0.8) / 0.2);

    // Grey mist at the start, evolve to full colour as scroll progresses
    vec3 cGrey = vec3(0.4, 0.4, 0.5);
    vColor = mix(cGrey, particleColor, uEvolution);

    // Fade edges
    vAlpha = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.75, 1.0, t));
}
