uniform float uTime;
uniform float uEvolution;
attribute float aPathId;    // which flow ribbon (0-1 normalized)
attribute float aT;         // position along that ribbon (0-1)
attribute float aRandom;
attribute float aLayer;     // 0=main flow, 1=flower accent, 2=star

varying vec3  vColor;
varying float vAlpha;
varying float vType;
varying float vT;

// ── Simplex 3D Noise ──────────────────────────────────────────────────
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
  vec4 p = permute4(permute4(permute4(
    i.z + vec4(0.0,i1.z,i2.z,1.0))
   +i.y + vec4(0.0,i1.y,i2.y,1.0))
   +i.x + vec4(0.0,i1.x,i2.x,1.0));
  float n_  = 1.0/7.0;
  vec3  ns  = n_*D.wyz - D.xzx;
  vec4  j   = p - 49.0*floor(p*ns.z*ns.z);
  vec4  x_  = floor(j*ns.z);
  vec4  y_  = floor(j - 7.0*x_);
  vec4  x   = x_*ns.x + ns.yyyy;
  vec4  y   = y_*ns.x + ns.yyyy;
  vec4  h   = 1.0 - abs(x) - abs(y);
  vec4  b0  = vec4(x.xy,y.xy);
  vec4  b1  = vec4(x.zw,y.zw);
  vec4  s0  = floor(b0)*2.0+1.0;
  vec4  s1  = floor(b1)*2.0+1.0;
  vec4  sh  = -step(h, vec4(0.0));
  vec4  a0  = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4  a1  = b1.xzyw + s1.xzyw*sh.zzww;
  vec3  p0  = vec3(a0.xy, h.x);
  vec3  p1  = vec3(a0.zw, h.y);
  vec3  p2  = vec3(a1.xy, h.z);
  vec3  p3  = vec3(a1.zw, h.w);
  vec4  norm= taylorInvSqrt4(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4  m   = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m = m*m;
  return 42.0*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

// ── Cubic Bezier ─────────────────────────────────────────────────────
// Each "ribbon" follows a unique cubic bezier from cigarette tip → upper-left
vec2 cubicBezier(vec2 p0, vec2 p1, vec2 p2, vec2 p3, float t){
  float u = 1.0-t;
  return u*u*u*p0 + 3.0*u*u*t*p1 + 3.0*u*t*t*p2 + t*t*t*p3;
}

void main(){
  vType = aLayer;
  vT    = aT;

  // ── Ribbon path (Demon Slayer flowing line) ───────────────────────
  // Origin: cigarette area (lower-centre-left of image)
  vec2 origin = vec2(-1.0, -3.5);

  // Each path has a unique signature angle determined by pathId
  float pid   = aPathId;                          // 0..1
  float angle = mix(-0.5, 1.8, pid);              // sweep from lower-right to upper-left

  // Bezier control points — gives the signature curling arc
  vec2 p0 = origin;
  vec2 p1 = origin + vec2(-2.0 + pid*1.0, 4.0 + pid*2.0);          // first curl
  vec2 p2 = p1     + vec2(-3.0 - pid*2.0, 4.0 + pid*3.0);          // second curl
  vec2 p3 = p2     + vec2(-2.0 * cos(angle), 3.0 * sin(angle));     // tip

  // Animate: the whole ribbon "scrolls" forward using uTime
  float scroll = fract(aRandom + uTime * mix(0.06, 0.12, aRandom));
  float t = fract(aT + scroll);

  vec2 baseXY = cubicBezier(p0, p1, p2, p3, t);

  // Secondary oscillation perpendicular to flow — the Demon Slayer wiggle
  // Calculate tangent direction numerically
  float dt = 0.01;
  vec2 tangent = normalize(cubicBezier(p0,p1,p2,p3,min(t+dt,1.0))
                          - cubicBezier(p0,p1,p2,p3,max(t-dt,0.0)));
  vec2 normal  = vec2(-tangent.y, tangent.x);

  // Oscillate in the normal direction (the signature "breathing" wave)
  float wave   = sin(t * 12.0 * 3.14159 + aPathId * 6.28 + uTime * 3.0)
               * mix(0.15, 0.45, pid) * t;  // grows towards tip
  baseXY += normal * wave;

  // Subtle curl-noise turbulence on top
  float nt = snoise(vec3(baseXY * 0.3, uTime * 0.15 + pid * 5.0));
  baseXY  += normal * nt * 0.3 * t;

  float z = 0.2 + aRandom * 0.6;   // slight depth scatter (behind image plane)

  // Flower accents orbit around the flow
  if (aLayer > 0.5 && aLayer < 1.5) {
    float orbitR = 1.2 + aRandom;
    float orbitA = aRandom * 6.28 + uTime * 0.4;
    baseXY += vec2(cos(orbitA), sin(orbitA)) * orbitR * t;
  }

  // Star/sparkle accents scatter wider
  if (aLayer > 1.5) {
    baseXY += vec2((aRandom - 0.5)*8.0, aRandom*6.0);
  }

  vec4 mvPos = modelViewMatrix * vec4(baseXY, z, 1.0);
  gl_Position = projectionMatrix * mvPos;

  // ── Particle size ─────────────────────────────────────────────────
  // Main flow: very tiny points packed densely → forms solid glowing line
  // Flowers & stars: bigger
  float sz = 4.0;
  if (aLayer > 0.5 && aLayer < 1.5) sz = 30.0;
  if (aLayer > 1.5)                  sz = 12.0;

  // Demon Slayer style: brightest near the tip of each ribbon
  float tipBright = smoothstep(0.0, 0.4, t) * (1.0 - smoothstep(0.85, 1.0, t));
  sz *= mix(0.5, 1.0, tipBright);

  gl_PointSize = sz / -mvPos.z;

  // ── Color palette ─────────────────────────────────────────────────
  // Demon Slayer Water Breathing palette:
  //   - deep navy → electric cyan → white at the tip
  // Mixed with purple/magenta for the flowers
  vec3 cDeepBlue   = vec3(0.0,  0.15, 0.5);
  vec3 cCyan        = vec3(0.05, 0.75, 1.0);
  vec3 cWhite       = vec3(0.85, 0.95, 1.0);
  vec3 cPurple      = vec3(0.45, 0.05, 0.85);
  vec3 cMagenta     = vec3(0.9,  0.15, 0.7);
  vec3 cGold        = vec3(1.0,  0.75, 0.1);  // for the orange fish in reference

  // Main flow: blue→cyan→white gradient along t
  vec3 flowColor = mix(cDeepBlue, cCyan, smoothstep(0.0, 0.5, t));
  flowColor      = mix(flowColor, cWhite, smoothstep(0.6, 0.95, t));

  // Flowers: purple→magenta
  vec3 flowerColor = mix(cPurple, cMagenta, aRandom);

  // Stars/fish: gold
  vec3 starColor = mix(cCyan, cGold, aRandom);

  vec3 rawColor;
  if (aLayer < 0.5)                   rawColor = flowColor;
  else if (aLayer < 1.5)              rawColor = flowerColor;
  else                                rawColor = starColor;

  // Grey mist when evolution == 0, full color when evolution == 1
  vec3 grey    = vec3(0.35, 0.38, 0.45);
  vColor = mix(grey, rawColor, uEvolution);

  // Alpha: fade tails and heads, full brightness in body
  float fadeIn  = smoothstep(0.0,  0.05, t);
  float fadeOut = 1.0 - smoothstep(0.88, 1.0,  t);
  vAlpha = fadeIn * fadeOut;
}
