uniform float uTime;
uniform float uEvolution;
attribute float aPathId;
attribute float aT;
attribute float aRandom;
attribute float aLayer;

varying vec3 vColor;
varying float vAlpha;
varying float vType;
varying float vLife;

// ── Simplex Noise ──────────────────────────────────────────────────
vec4 permute4(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt4(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0*C.xxx;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = permute4(permute4(permute4(i.z + vec4(0.0,i1.z,i2.z,1.0))+i.y + vec4(0.0,i1.y,i2.y,1.0))+i.x + vec4(0.0,i1.x,i2.x,1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_*D.wyz - D.xzx;
  vec4 j = p - 49.0*floor(p*ns.z*ns.z);
  vec4 x_ = floor(j*ns.z);
  vec4 y_ = floor(j - 7.0*x_);
  vec4 x = x_*ns.x + ns.yyyy;
  vec4 y = y_*ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy,y.xy);
  vec4 b1 = vec4(x.zw,y.zw);
  vec4 s0 = floor(b0)*2.0+1.0;
  vec4 s1 = floor(b1)*2.0+1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt4(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m = m*m;
  return 42.0*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main() {
    vType = aLayer;
    
    // Smooth particle life cycle
    float speed = mix(0.1, 0.25, aRandom);
    float life = fract(uTime * speed + aPathId);
    vLife = life;

    // Start from behind the subject (center bottom/left)
    vec3 pos = vec3(-1.0 + (aRandom - 0.5) * 4.0, -5.0 + (aRandom - 0.5) * 2.0, -1.0 + aRandom);

    // Flow upward and spread out beautifully like elegant smoke/silk
    float t = life;
    
    // Base trajectory
    pos.y += t * 15.0; // Rise up
    pos.x += t * mix(-8.0, 8.0, aRandom); // Spread wide
    
    // Elegant curl noise for museum-quality silk flow
    float freq = 0.2;
    float n1 = snoise(vec3(pos.x * freq, pos.y * freq, uTime * 0.1 + aPathId));
    float n2 = snoise(vec3(pos.y * freq + 5.0, pos.z * freq, uTime * 0.12));
    float n3 = snoise(vec3(pos.z * freq, pos.x * freq + 5.0, uTime * 0.08));
    
    pos.x += n1 * t * 6.0;
    pos.y += n2 * t * 4.0;
    pos.z += n3 * t * 3.0;

    // Awwwards-level gentle swaying
    pos.x += sin(t * 10.0 + uTime + aPathId * 6.28) * 1.5 * t;

    // Keep particles away from the center (face area)
    float distFromCenter = length(pos.xy);
    if (distFromCenter < 3.0) {
        pos.xy += normalize(pos.xy) * (3.0 - distFromCenter) * t;
    }

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Size calculation - Soft, elegant sizes
    float baseSize = 80.0;
    if (aLayer > 0.5 && aLayer < 1.5) baseSize = 120.0; // Flowers
    if (aLayer > 1.5) baseSize = 60.0; // Stars

    // Size pulses gently
    float sizePulse = sin(life * 3.14159);
    gl_PointSize = (baseSize * sizePulse) / -mvPos.z;

    // Elegant cinematic colors: deep blue, crimson, cyan, magenta
    vec3 c1 = vec3(0.05, 0.4, 0.9);   // Deep Blue
    vec3 c2 = vec3(0.9, 0.1, 0.3);    // Crimson Red
    vec3 c3 = vec3(0.0, 0.8, 0.9);    // Cyan
    vec3 c4 = vec3(0.8, 0.1, 0.7);    // Magenta

    vec3 finalColor;
    if (aRandom < 0.25) finalColor = mix(c1, c3, life);
    else if (aRandom < 0.5) finalColor = mix(c2, c4, life);
    else if (aRandom < 0.75) finalColor = mix(c3, c1, life);
    else finalColor = mix(c4, c2, life);

    // Initial state is a cinematic grey/silver smoke, evolving to full vibrant color
    vec3 silverSmoke = vec3(0.6, 0.65, 0.7);
    vColor = mix(silverSmoke, finalColor, uEvolution);

    // Smooth fade in and fade out
    vAlpha = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.7, 1.0, life));
}
