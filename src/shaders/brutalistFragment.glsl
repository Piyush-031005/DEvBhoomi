// ============================================================
// DEVBHOOMI — Pure Procedural GLSL Worlds
// No photographs. Everything is mathematics.
// 4 worlds: Mountains | Char Dham Temples | Culture | Nature
// ============================================================

uniform float uTime;
uniform float uOpacity;
uniform vec2  uMouse;
uniform float uHover;
uniform float uScrollVelocity;
uniform int   uChapter;

varying vec2 vUv;

// ============================================================
// MATH UTILITIES
// ============================================================

float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
}

float hash1(float n) { return fract(sin(n) * 43758.5453123); }

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float fbm(vec2 p) {
    float v = 0.0;
    v += 0.500 * valueNoise(p * 1.0);
    v += 0.250 * valueNoise(p * 2.1);
    v += 0.125 * valueNoise(p * 4.3);
    v += 0.063 * valueNoise(p * 8.7);
    v += 0.031 * valueNoise(p * 17.2);
    return v;
}

float fbmDomainWarp(vec2 p) {
    vec2 q = vec2(fbm(p + vec2(0.0, 0.0)), fbm(p + vec2(5.2, 1.3)));
    return fbm(p + 1.8 * q);
}

// SDF Primitives
float sdCircle(vec2 p, float r) { return length(p) - r; }

float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float sdTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
    vec2 e0 = b - a, e1 = c - b, e2 = a - c;
    vec2 v0 = p - a, v1 = p - b, v2 = p - c;
    vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
    vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
    vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
    float s = sign(e0.x * e2.y - e0.y * e2.x);
    vec2 d = min(min(
        vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
        vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
        vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
    return -sqrt(d.x) * sign(d.y);
}

vec2 rot(vec2 p, float a) {
    float c = cos(a), s = sin(a);
    return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

float opUnion(float a, float b) { return min(a, b); }
float opSmooth(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// ============================================================
// SCENE 0 — PAHAD (Himalayas)
// Nanda Devi, Trishul, Panchachuli, Monal, Brahma Kamal
// ============================================================

float mountainRidge(float x) {
    // Uttarakhand's major peaks as Gaussian superposition
    float h = 0.0;
    h += 0.88 * exp(-pow((x + 0.38) * 3.8, 2.0)); // Nanda Devi 7816m
    h += 0.64 * exp(-pow((x + 0.12) * 4.5, 2.0)); // Trishul 7120m
    h += 0.76 * exp(-pow((x - 0.18) * 3.5, 2.0)); // Panchachuli 6904m
    h += 0.52 * exp(-pow((x + 0.60) * 5.0, 2.0)); // Kedarnath 6940m
    h += 0.44 * exp(-pow((x - 0.42) * 5.5, 2.0)); // Chaukhamba
    return h;
}

vec3 renderMountains(vec2 uv) {
    vec2 p = uv - 0.5;
    p.x *= 1.78;
    float t = uTime * 0.05;

    // ---- Sky ----
    vec3 nightTop    = vec3(0.01, 0.02, 0.06);
    vec3 twilightMid = vec3(0.06, 0.10, 0.22);
    vec3 dawnLow     = vec3(0.18, 0.08, 0.06);
    float skyH = uv.y;
    vec3 sky = mix(dawnLow, mix(twilightMid, nightTop, smoothstep(0.0, 0.8, skyH)), smoothstep(0.0, 0.5, skyH));

    // Stars
    vec2 starUV = floor(uv * 200.0);
    float star = step(0.975, hash(starUV));
    float twinkle = 0.5 + 0.5 * sin(uTime * 2.5 + hash(starUV) * 40.0);
    float starVis  = smoothstep(0.42, 0.75, uv.y);
    sky += vec3(0.85, 0.90, 1.00) * star * twinkle * starVis;

    // Aurora
    float auroraX  = sin(p.x * 2.8 + t * 1.5) * 0.5 + 0.5;
    float auroraFBM = fbm(vec2(p.x * 1.5 + t, uv.y * 2.0));
    float aurora   = auroraX * auroraFBM * smoothstep(0.48, 0.78, uv.y) * 0.5;
    sky += vec3(0.0, aurora * 0.4, aurora * 0.8);

    vec3 col = sky;

    // ---- Far ridge (misty blue) ----
    float farH = mountainRidge(p.x * 0.65 + 0.08) * 0.45 + 0.20;
    float farFBM = fbm(vec2(p.x * 5.0, 0.3)) * 0.12;
    float farMask = smoothstep(farH + farFBM + 0.006, farH + farFBM - 0.006, p.y);
    col = mix(col, vec3(0.12, 0.16, 0.30), farMask * 0.92);

    // ---- Mid ridge ----
    float midH = mountainRidge(p.x * 0.80 + 0.05) * 0.60 + 0.08;
    float midFBM = fbm(vec2(p.x * 6.0 + 2.1, 0.0)) * 0.10;
    float midMask = smoothstep(midH + midFBM + 0.007, midH + midFBM - 0.007, p.y);
    col = mix(col, vec3(0.09, 0.11, 0.19), midMask * 0.95);

    // ---- Main foreground peaks ----
    float mainFBM = fbm(vec2(p.x * 7.0 + t * 0.2, p.y * 3.0)) * 0.12;
    float mainH   = mountainRidge(p.x) * 0.82 + mainFBM - 0.06;
    float mainMask = smoothstep(mainH + 0.010, mainH - 0.010, p.y);

    // Snow coverage
    float snowY  = mainH - 0.10;
    float snowN  = fbm(vec2(p.x * 14.0, p.y * 9.0)) * 0.08;
    float snowT  = smoothstep(snowY - 0.06 + snowN, snowY + 0.10 + snowN, p.y);
    vec3 rock    = vec3(0.16, 0.14, 0.12) + fbm(vec2(p.x * 20.0, p.y * 10.0)) * 0.06;
    vec3 snow    = vec3(0.87, 0.92, 0.98);
    col = mix(col, mix(rock, snow, snowT * snowT), mainMask);

    // ---- Valley mist ----
    float mistY   = -0.08 - p.y;
    float mistFBM = fbm(vec2(p.x * 2.5 + t * 0.4, 0.0));
    float mist    = clamp(mistY * 3.5 + mistFBM * 0.6, 0.0, 0.85);
    col = mix(col, vec3(0.40, 0.52, 0.68), mist * 0.7);

    // ---- Drifting snow ----
    vec2 snowSeed = floor(uv * 90.0 + vec2(t * 0.5, t * 1.2));
    float snowDot = step(0.965, hash(snowSeed));
    vec2 snowFrac = fract(uv * 90.0 + vec2(t * 0.5, t * 1.2)) - 0.5;
    float snowFlake = max(0.0, 1.0 - length(snowFrac) * 5.0) * snowDot;
    snowFlake *= smoothstep(0.18, 0.55, uv.y);
    col += vec3(snowFlake);

    // ---- Brahma Kamal (state flower) — bottom left ----
    vec2 bkP = p - vec2(-0.62, -0.34);
    float bkR = length(bkP);
    float bkA = atan(bkP.y, bkP.x);
    // 16-petal concentric bloom
    float petals = 0.0;
    for (int k = 0; k < 8; k++) {
        float ang = bkA - float(k) * 0.7854; // PI/4
        vec2 petalCenter = vec2(cos(float(k) * 0.7854) * 0.038, sin(float(k) * 0.7854) * 0.038);
        float pd = sdCircle(bkP - petalCenter, 0.025 + sin(uTime * 1.2) * 0.002);
        petals = max(petals, smoothstep(0.002, -0.003, pd));
    }
    // Inner ring (smaller petals)
    for (int k = 0; k < 8; k++) {
        float ang = bkA - float(k) * 0.7854 + 0.3927;
        vec2 petalCenter = vec2(cos(float(k) * 0.7854 + 0.3927) * 0.020, sin(float(k) * 0.7854 + 0.3927) * 0.020);
        float pd = sdCircle(bkP - petalCenter, 0.014);
        petals = max(petals, smoothstep(0.002, -0.002, pd));
    }
    float center = smoothstep(0.002, -0.002, sdCircle(bkP, 0.012));
    col = mix(col, vec3(0.94, 0.92, 0.96), petals * 0.95);
    col = mix(col, vec3(0.98, 0.85, 0.30), center);

    // ---- Monal bird (state bird) — colorful pheasant ----
    // Positioned flying near the right peak
    vec2 mP = p - vec2(0.44, 0.20);
    // Wing flap
    float flapAngle = sin(uTime * 6.0) * 0.4;
    float mBody  = sdCircle(mP, 0.032);
    float mHead  = sdCircle(mP - vec2(0.042, 0.015), 0.018);
    float mBeak  = sdTriangle(mP - vec2(0.055, 0.012), vec2(0.0, 0.004), vec2(0.0, -0.004), vec2(0.016, 0.0));
    float mWingL = sdBox(rot(mP - vec2(-0.012, 0.0), flapAngle), vec2(0.036, 0.010));
    float mWingR = sdBox(rot(mP - vec2(0.012, 0.0), -flapAngle), vec2(0.036, 0.010));
    float mTail  = sdTriangle(mP, vec2(-0.032, 0.0), vec2(-0.032, -0.015), vec2(-0.068, -0.008));
    float monal  = opUnion(opUnion(mBody, mHead), opUnion(opUnion(mWingL, mWingR), opUnion(mBeak, mTail)));
    float monalMask = smoothstep(0.005, 0.0, monal);
    // Iridescent colors (Monal is emerald green + copper + blue)
    float iridT = fbm(mP * 30.0 + uTime * 0.2);
    vec3 monalCol = mix(vec3(0.08, 0.55, 0.42), vec3(0.72, 0.30, 0.08), iridT);
    monalCol = mix(monalCol, vec3(0.18, 0.35, 0.80), sin(bkA * 3.0) * 0.5 + 0.5);
    col = mix(col, monalCol, monalMask);

    return col;
}

// ============================================================
// SCENE 1 — CHAR DHAM
// Kedarnath shikhara + Prayer flags + Sacred fire + River
// ============================================================

float sdShikhara(vec2 p) {
    // Kedarnath temple — stepped pyramid spire
    float base     = sdBox(p - vec2(0.0, -0.30), vec2(0.32, 0.034));
    float body     = sdBox(p - vec2(0.0, -0.14), vec2(0.18, 0.14));
    float door     = sdBox(p - vec2(0.0, -0.22), vec2(0.055, 0.09));
    float step1    = sdBox(p - vec2(0.0,  0.05), vec2(0.14, 0.055));
    float step2    = sdBox(p - vec2(0.0,  0.16), vec2(0.10, 0.055));
    float step3    = sdBox(p - vec2(0.0,  0.25), vec2(0.07, 0.050));
    float step4    = sdBox(p - vec2(0.0,  0.33), vec2(0.045, 0.040));
    float kalash   = sdCircle(p - vec2(0.0, 0.395), 0.028);
    float danda    = sdBox(p - vec2(0.0, 0.44), vec2(0.005, 0.048));
    float temple   = opUnion(opUnion(base, body), opUnion(opUnion(step1, step2),
                     opUnion(opUnion(step3, step4), opUnion(kalash, danda))));
    // Hollow out door (subtract)
    temple = max(temple, -max(-door, -body));
    return temple;
}

float sdSmallTemple(vec2 p, float s) {
    p /= s;
    float b = sdBox(p - vec2(0.0, -0.16), vec2(0.10, 0.08));
    float s1 = sdBox(p - vec2(0.0, 0.0), vec2(0.075, 0.05));
    float s2 = sdBox(p - vec2(0.0, 0.07), vec2(0.050, 0.04));
    float k  = sdCircle(p - vec2(0.0, 0.125), 0.018);
    return opUnion(opUnion(b, s1), opUnion(s2, k));
}

vec3 renderTemples(vec2 uv) {
    vec2 p = uv - 0.5;
    p.x *= 1.78;
    float t = uTime * 0.08;

    // ---- Sacred dawn sky ----
    vec3 deepNight  = vec3(0.04, 0.02, 0.10);
    vec3 saffron    = vec3(0.75, 0.32, 0.05);
    vec3 gold       = vec3(0.95, 0.72, 0.28);
    float sh = smoothstep(-0.5, 0.6, uv.y);
    vec3 col = mix(gold, mix(saffron, deepNight, sh * 1.5), sh);

    // God-rays from top center
    float rayAngle = atan(p.x, uv.y - 1.0);
    float godRay   = sin(rayAngle * 22.0 + t * 0.4) * 0.5 + 0.5;
    float rayDist  = length(p - vec2(0.0, 0.38));
    godRay = godRay * exp(-rayDist * 2.8) * 0.30;
    col += vec3(1.0, 0.88, 0.52) * godRay;

    // ---- Background mountain silhouette ----
    float mH = exp(-pow(p.x * 1.6, 2.0)) * 0.52 + fbm(vec2(p.x * 4.0 + 1.2, 0.0)) * 0.14;
    float mMask = smoothstep(mH + 0.010, mH - 0.010, p.y - 0.08);
    col = mix(col, vec3(0.06, 0.04, 0.10), mMask * 0.95);
    // Snow on peaks
    float mSnow = smoothstep(mH - 0.06, mH + 0.02, p.y - 0.08);
    col = mix(col, vec3(0.86, 0.90, 0.96), mMask * mSnow * mSnow);

    // ---- Stone ground plane ----
    float groundMask = smoothstep(-0.32, -0.35, p.y);
    float groundNoise = fbm(vec2(p.x * 12.0, 0.0)) * 0.05;
    col = mix(col, vec3(0.18 + groundNoise, 0.14 + groundNoise, 0.12 + groundNoise), groundMask);

    // ---- River at base ----
    float riverY  = -0.36 + sin(p.x * 3.2 + t * 2.5) * 0.012;
    float riverW  = smoothstep(0.022, 0.0, abs(p.y - riverY));
    float ripple  = valueNoise(vec2(p.x * 28.0 - t * 7.0, 0.0)) * 0.35 + 0.65;
    col = mix(col, vec3(0.28, 0.52, 0.80) * ripple, riverW);
    // Reflection of temple in river
    float reflDist = abs(p.y - riverY + 0.02);
    float refl = smoothstep(0.12, 0.0, reflDist) * riverW;
    col += vec3(0.90, 0.65, 0.20) * refl * 0.4;

    // ---- Sacred fire (Dhuni) ----
    vec2 fp = p - vec2(0.0, -0.31);
    float fireFlicker = 0.5 + 0.5 * sin(t * 14.0 + fp.x * 50.0);
    float fireDist = length(fp * vec2(1.0, 0.6));
    float fire = exp(-fireDist * 22.0) * (0.6 + 0.4 * fireFlicker);
    col += vec3(1.0, 0.55, 0.08) * fire * 3.0;
    col += vec3(1.0, 0.90, 0.40) * exp(-fireDist * 80.0) * 2.0;

    // ---- Main Kedarnath temple ----
    float temple = sdShikhara(p);
    float tMask  = smoothstep(0.006, 0.0, temple);

    vec2 stoneUV = p * 22.0;
    float stoneN = valueNoise(stoneUV) * 0.12 + valueNoise(stoneUV * 2.5) * 0.06;
    vec3 stone   = vec3(0.24, 0.21, 0.18) + stoneN;
    // Sacred warmth on lit face
    float litFace = smoothstep(-0.1, 0.05, p.x) * 0.4;
    stone += vec3(0.12, 0.07, 0.02) * litFace;

    col = mix(col, stone, tMask);
    // Edge golden glow
    float edgeG = smoothstep(0.025, 0.0, abs(temple)) * (1.0 - tMask);
    col += vec3(0.90, 0.65, 0.15) * edgeG * 2.5;

    // ---- Side shrines (3 Dhams flanking) ----
    float sh1 = sdSmallTemple(p - vec2(-0.52, -0.08), 0.72);
    float sh2 = sdSmallTemple(p - vec2( 0.52, -0.10), 0.68);
    float sh3 = sdSmallTemple(p - vec2(-0.82, -0.12), 0.50);
    float shMask = smoothstep(0.005, 0.0, opUnion(opUnion(sh1, sh2), sh3));
    col = mix(col, stone * 0.80, shMask);

    // ---- Prayer flags ----
    float flagLineY = 0.28 - abs(p.x) * 0.18;
    float flagLine  = smoothstep(0.0025, 0.0, abs(p.y - flagLineY)) * step(abs(p.x), 0.70);
    col += vec3(0.60, 0.45, 0.28) * flagLine * 0.65;
    // Triangular flags
    for (int fi = -5; fi <= 5; fi++) {
        float fx   = float(fi) * 0.13;
        float fy   = 0.28 - abs(fx) * 0.18;
        vec2  fP   = p - vec2(fx, fy);
        float fBody = sdTriangle(fP, vec2(-0.038, 0.0), vec2(0.038, 0.0), vec2(0.0, -0.058));
        float fMask = smoothstep(0.002, -0.002, fBody);
        // Tibetan 5 colors cycle
        float fc = mod(float(fi + 6), 5.0);
        vec3 flagCol;
        if      (fc < 1.0) flagCol = vec3(0.95, 0.88, 0.15); // yellow
        else if (fc < 2.0) flagCol = vec3(0.10, 0.40, 0.90); // blue
        else if (fc < 3.0) flagCol = vec3(0.90, 0.12, 0.12); // red
        else if (fc < 4.0) flagCol = vec3(0.12, 0.72, 0.20); // green
        else               flagCol = vec3(0.92, 0.92, 0.92); // white
        col = mix(col, flagCol * 0.85, fMask * 0.9);
    }

    // Om symbol glow (above temple)
    float omGlow = exp(-length(p - vec2(0.0, 0.52)) * 12.0) * 0.6;
    col += vec3(0.95, 0.80, 0.30) * omGlow;

    return col;
}

// ============================================================
// SCENE 2 — SANSKRITI (Culture)
// Uttarakhand Topi + Aipan Art + Pahadi person + Nath
// ============================================================

vec3 renderCulture(vec2 uv) {
    vec2 p = uv - 0.5;
    p.x *= 1.78;
    float t = uTime * 0.08;

    // ---- Deep vermillion ground (Aipan base color) ----
    vec3 col = vec3(0.70, 0.06, 0.04);

    // ---- Aipan mandala tile pattern ----
    // Aipan = traditional white-on-red Kumaon folk art, geometric
    vec2 tile  = fract(uv * 3.5) - 0.5;
    float tr   = length(tile);
    float ta   = atan(tile.y, tile.x);

    // 8-petal lotus
    float outerR = 0.20;
    float petalW = abs(cos(ta * 4.0)) * outerR;
    float lotus  = smoothstep(0.008, -0.004, tr - petalW * 0.55);

    // Concentric circles
    float ring1 = smoothstep(0.006, -0.003, abs(tr - 0.18) - 0.006);
    float ring2 = smoothstep(0.004, -0.003, abs(tr - 0.10) - 0.004);
    float ring3 = smoothstep(0.004, -0.003, abs(tr - 0.04) - 0.003);

    // Crosshatch
    float cross = max(
        smoothstep(0.004, -0.003, abs(tile.x) - 0.003) * step(tr, 0.22),
        smoothstep(0.004, -0.003, abs(tile.y) - 0.003) * step(tr, 0.22)
    );
    // Dot at grid intersections
    float gridDots = 0.0;
    vec2 gd = fract(uv * 7.0) - 0.5;
    gridDots = smoothstep(0.004, -0.003, length(gd) - 0.025);

    float aipan = max(max(lotus, ring1), max(ring2, max(ring3, max(cross, gridDots))));
    // Breathing animation (Aipan motifs gently pulse)
    aipan *= 0.80 + 0.20 * sin(uTime * 0.8 + tr * 8.0);
    
    // Interactive Magic: Mouse hovering over Aipan turns it gold and glowing
    float mouseDist = length(p - (uMouse - 0.5) * vec2(1.78, 1.0));
    float magicGlow = exp(-mouseDist * 12.0) * uHover;
    
    vec3 aipanBase = vec3(0.96, 0.93, 0.88);
    vec3 aipanMagic = vec3(1.0, 0.8, 0.2); // Gold
    vec3 aipanColor = mix(aipanBase, aipanMagic, magicGlow);
    
    col = mix(col, aipanColor, aipan * (0.88 + magicGlow * 0.5));
    
    // Magical dust particles floating in the air
    float dust = 0.0;
    for(int i = 0; i < 15; i++) {
        float fi = float(i);
        vec2 dPos = vec2(
            sin(fi * 43.1 + t * 0.8) * 0.8,
            cos(fi * 23.4 + t * 0.6) * 0.4
        );
        dPos.x += sin(dPos.y * 5.0 + t) * 0.05;
        float d = length(p - dPos);
        dust += exp(-d * (200.0 + sin(fi + t * 2.0) * 100.0)) * (0.5 + 0.5 * sin(fi * 7.0 + t * 4.0));
    }
    col += vec3(0.9, 0.7, 0.3) * dust;

    // ---- Uttarakhand Topi (procedural SDF) ----
    // Traditional Garhwali/Kumaoni flat-topped woolen cap
    vec2 topiP = p - vec2(-0.28, 0.14);

    float brim   = sdBox(topiP - vec2(0.0, -0.11), vec2(0.185, 0.020));
    float capBod = sdBox(topiP - vec2(0.0,  0.01), vec2(0.145, 0.115));
    float capTop = sdBox(topiP - vec2(0.0,  0.12), vec2(0.125, 0.012));
    float topi   = opUnion(opUnion(brim, capBod), capTop);
    float topiM  = smoothstep(0.005, 0.0, topi);

    // Cap material — dark navy/black wool
    float woolN  = fbm(topiP * 35.0) * 0.08;
    vec3  capCol = vec3(0.05, 0.04, 0.10) + woolN;
    col = mix(col, capCol, topiM * 0.96);
    // Gold trim brim edge
    float topiEdge = smoothstep(0.018, 0.0, abs(topi + 0.001)) * (1.0 - topiM);
    col += vec3(0.88, 0.65, 0.12) * topiEdge * 1.8;

    // Aipan embroidery on cap face (white geometric)
    if (topiM > 0.5) {
        vec2 capUV = topiP / 0.14;
        float capR = length(capUV);
        float capA = atan(capUV.y, capUV.x);
        float capPat = abs(cos(capA * 3.0)) * smoothstep(0.7, 0.3, capR);
        capPat = smoothstep(0.28, 0.32, capPat);
        col = mix(col, vec3(0.94, 0.90, 0.84) * 0.75, capPat * topiM);
    }

    // ---- Pahadi person in traditional dress ----
    vec2 personP = p - vec2(0.38, -0.06);

    // Silhouette — woman in Pichora (traditional wrap)
    float pHead  = sdCircle(personP - vec2(0.0, 0.28), 0.055);
    float pNeck  = sdBox(personP - vec2(0.0, 0.19), vec2(0.018, 0.032));
    float pTorso = sdBox(personP - vec2(0.0, 0.06), vec2(0.075, 0.145));
    // Pichora flare at bottom (wider skirt)
    float pSkirt = sdTriangle(personP, vec2(-0.085, -0.09), vec2(0.085, -0.09), vec2(0.0, -0.28));
    // Arms in Namaste pose
    float pArmL  = sdBox(rot(personP - vec2(-0.06, 0.1), 0.6), vec2(0.018, 0.072));
    float pArmR  = sdBox(rot(personP - vec2( 0.06, 0.1), -0.6), vec2(0.018, 0.072));
    // Hands joined
    float pHands = sdCircle(personP - vec2(0.0, 0.05), 0.025);

    float person = opUnion(opUnion(pHead, pNeck), opUnion(pTorso, opUnion(opUnion(pSkirt, pArmL), opUnion(pArmR, pHands))));
    float personM = smoothstep(0.005, 0.0, person);

    // Dark silhouette with warm lit edge
    vec3 personCol = vec3(0.10, 0.06, 0.12);
    col = mix(col, personCol, personM * 0.94);
    // Red/gold Pichora border line
    float pichoraBorder = smoothstep(0.020, 0.0, abs(person + 0.004)) * (1.0 - personM);
    col += vec3(0.95, 0.72, 0.10) * pichoraBorder * 1.5;

    // Nath (traditional nose ring) — gold
    float nathRing = sdCircle(personP - vec2(-0.022, 0.255), 0.015);
    float nathInner = sdCircle(personP - vec2(-0.022, 0.255), 0.008);
    float nathMask = smoothstep(0.002, -0.002, nathRing) - smoothstep(0.002, -0.002, nathInner);
    col = mix(col, vec3(0.90, 0.68, 0.12), nathMask * 0.9);

    // Bindi
    float bindi = smoothstep(0.004, -0.002, sdCircle(personP - vec2(0.0, 0.302), 0.008));
    col = mix(col, vec3(0.92, 0.10, 0.10), bindi * 0.85);

    // ---- Folk instrument — Dhol outline (left side) ----
    vec2 dholP = p - vec2(-0.68, -0.20);
    float dholBody = sdBox(dholP, vec2(0.055, 0.088));
    float dholL    = sdCircle(dholP - vec2(-0.055, 0.0), 0.038);
    float dholR    = sdCircle(dholP - vec2( 0.055, 0.0), 0.038);
    float dhol     = opUnion(dholBody, opUnion(dholL, dholR));
    float dholM    = smoothstep(0.005, 0.0, dhol);
    col = mix(col, vec3(0.18, 0.12, 0.08), dholM * 0.80);
    float dholEdge = smoothstep(0.018, 0.0, abs(dhol + 0.001)) * (1.0 - dholM);
    col += vec3(0.85, 0.60, 0.10) * dholEdge * 1.2;

    return col;
}

// ============================================================
// SCENE 3 — PRAKRITI (Nature)
// Snow Leopard, Bugyals, Pine Forest, Himalayan Sheep, River
// ============================================================

float sdPineLayer(vec2 p, float w, float h) {
    return sdTriangle(p, vec2(-w, 0.0), vec2(w, 0.0), vec2(0.0, h));
}

float sdSheepBody(vec2 p) {
    float body = sdCircle(p, 0.028);
    float head = sdCircle(p - vec2(0.034, 0.008), 0.015);
    float leg1 = sdBox(p - vec2(-0.012, -0.040), vec2(0.005, 0.018));
    float leg2 = sdBox(p - vec2( 0.012, -0.040), vec2(0.005, 0.018));
    float leg3 = sdBox(p - vec2( 0.028, -0.038), vec2(0.005, 0.016));
    return opUnion(opUnion(body, head), opUnion(leg1, opUnion(leg2, leg3)));
}

float sdSnowLeopard(vec2 p) {
    float body  = sdBox(rot(p + vec2(0.0, 0.0), -0.18), vec2(0.092, 0.040));
    float head  = sdCircle(p - vec2(0.098, 0.028), 0.035);
    float muzzle = sdCircle(p - vec2(0.122, 0.018), 0.018);
    float ear1  = sdTriangle(p - vec2(0.085, 0.060), vec2(-0.010, 0.0), vec2(0.010, 0.0), vec2(0.0, 0.020));
    float ear2  = sdTriangle(p - vec2(0.108, 0.062), vec2(-0.008, 0.0), vec2(0.008, 0.0), vec2(0.0, 0.018));
    float tail  = sdSegment(p, vec2(-0.092, -0.008), vec2(-0.175, 0.025));
    float tailW = smoothstep(0.016, 0.0, tail);
    float leg1  = sdBox(p - vec2(-0.040, -0.052), vec2(0.012, 0.030));
    float leg2  = sdBox(p - vec2( 0.020, -0.055), vec2(0.012, 0.032));
    float leg3  = sdBox(p - vec2( 0.065, -0.050), vec2(0.011, 0.028));
    float cat   = opUnion(opUnion(opUnion(body, head), opUnion(muzzle, opUnion(ear1, ear2))),
                          opUnion(leg1, opUnion(leg2, leg3)));
    return min(cat, -tailW + 1.0 - tailW);
}

vec3 renderNature(vec2 uv) {
    vec2 p = uv - 0.5;
    p.x *= 1.78;
    float t = uTime * 0.06;

    // ---- High-altitude Bugyal sky + Alpine Aurora ----
    vec3 skyHigh = vec3(0.05, 0.12, 0.38);
    vec3 skyLow  = vec3(0.18, 0.48, 0.68);
    vec3 col = mix(skyLow, skyHigh, smoothstep(0.0, 0.7, uv.y));
    
    // Magical Green Aurora
    float auroraT = t * 3.0;
    float aurora = fbm(vec2(p.x * 2.0 + auroraT, uv.y * 3.0)) * 
                   sin(p.x * 3.0 - auroraT * 0.5) * 0.5 + 0.5;
    aurora *= smoothstep(0.3, 0.8, uv.y);
    col += vec3(0.1, 0.8, 0.4) * aurora * 0.45;

    // Clouds (SDF blobs)
    vec2 c1P = p - vec2( 0.28, 0.35);
    float cl1 = opSmooth(opSmooth(sdCircle(c1P, 0.090), sdCircle(c1P - vec2(0.07, 0.0), 0.070), 0.04),
                         sdCircle(c1P + vec2(0.07, 0.0), 0.060), 0.04);
    vec2 c2P = p - vec2(-0.45, 0.28);
    float cl2 = opSmooth(sdCircle(c2P, 0.070), sdCircle(c2P - vec2(0.06, 0.0), 0.055), 0.03);
    float cloudM = max(smoothstep(0.02, -0.01, cl1), smoothstep(0.02, -0.01, cl2));
    col = mix(col, vec3(0.96, 0.97, 0.99), cloudM * 0.85);

    // ---- Flock of Eagles (Dynamic particle system) ----
    float flock = 0.0;
    for(int i = 0; i < 15; i++) {
        float fi = float(i);
        float bx = mod(fi * 0.3 + t * 4.0, 3.5) - 1.75;
        float by = 0.2 + sin(bx * 2.0 + fi) * 0.1 + fbm(vec2(bx * 5.0, fi)) * 0.05;
        vec2 bp = p - vec2(bx, by);
        // Flap animation
        float flap = sin(t * 40.0 + fi * 1.5) * 0.012;
        float bird = sdTriangle(bp, vec2(-0.015, flap), vec2(0.015, flap), vec2(0.0, -0.005));
        flock = max(flock, smoothstep(0.002, 0.0, bird));
    }
    col = mix(col, vec3(0.05, 0.04, 0.08), flock);

    // ---- Background snow peaks ----
    float bgH = mountainRidge(p.x * 0.7 + 0.15) * 0.42 + 0.22;
    float bgHm = 0.0;
    bgHm += 0.55 * exp(-pow((p.x * 0.7 + 0.15 + 0.38) * 3.8, 2.0));
    bgHm += 0.40 * exp(-pow((p.x * 0.7 + 0.15 + 0.12) * 4.5, 2.0));
    bgHm += 0.48 * exp(-pow((p.x * 0.7 + 0.15 - 0.18) * 3.5, 2.0));
    bgHm += fbm(vec2(p.x * 5.0, 0.0)) * 0.10;
    float bgMask = smoothstep(bgHm * 0.82 + 0.24 + 0.008, bgHm * 0.82 + 0.24 - 0.008, p.y);
    col = mix(col, vec3(0.60, 0.72, 0.88), bgMask);

    // ---- Interactive Bugyal (alpine meadow) ----
    // Grass bends away from mouse hover
    float mouseDist = length(p - (uMouse - 0.5) * vec2(1.78, 1.0));
    float mouseForce = exp(-mouseDist * 10.0) * uHover * 0.08;
    
    float grassY = -0.12;
    float grassM = smoothstep(grassY + 0.015, grassY - 0.015, p.y - mouseForce);
    float windT  = fbm(vec2(p.x * 6.0 + t * 1.8, (p.y - mouseForce) * 3.0));
    vec3  grassC = mix(vec3(0.12, 0.38, 0.18), vec3(0.30, 0.54, 0.28), windT);
    col = mix(col, grassC, grassM * 0.95);

    // ---- Magical Fireflies / Dust ----
    float fireflies = 0.0;
    for(int i = 0; i < 20; i++) {
        float fi = float(i);
        vec2 fPos = vec2(
            sin(fi * 73.1 + t * 1.2) * 0.8,
            -0.15 + mod(fi * 21.3 + t * 0.5, 0.35)
        );
        fPos.x += sin(fPos.y * 10.0 + t) * 0.05;
        float d = length(p - fPos);
        float glow = exp(-d * (150.0 + sin(fi + t * 5.0) * 50.0));
        fireflies += glow * (0.5 + 0.5 * sin(fi * 11.0 + t * 8.0));
    }
    col += vec3(0.8, 0.9, 0.2) * fireflies * grassM;

    // Wildflowers in bugyal
    vec2 flwG = fract(uv * 30.0 + vec2(0.4, 0.2)) - 0.5;
    float flwDot = step(0.92, hash(floor(uv * 30.0 + vec2(0.4, 0.2))));
    flwDot *= step(length(flwG), 0.28) * grassM;
    float flwHue = hash(floor(uv * 30.0));
    vec3 flwCol  = mix(vec3(1.0, 0.88, 0.18), vec3(0.96, 0.28, 0.48), flwHue);
    flwCol       = mix(flwCol, vec3(0.30, 0.70, 0.98), step(0.66, flwHue));
    col = mix(col, flwCol, flwDot * 0.85);

    // ---- Glacial river ----
    float rvY    = -0.22 + sin(p.x * 2.8 + t * 2.0) * 0.022 + fbm(vec2(p.x * 5.0, t)) * 0.018;
    float rvMask = smoothstep(abs(p.y - rvY) - 0.022, abs(p.y - rvY) - 0.032, 0.0);
    float rvShim = valueNoise(vec2(p.x * 32.0 - t * 9.0, 0.0)) * 0.4 + 0.6;
    col = mix(col, vec3(0.32, 0.62, 0.90) * rvShim, rvMask);
    // White foam at banks
    float foam   = smoothstep(abs(p.y - rvY) - 0.025, abs(p.y - rvY) - 0.022, 0.0) * rvMask;
    col = mix(col, vec3(0.95, 0.97, 1.0), foam * 0.7);

    // ---- Pine Forest ----
    for (int fi = -8; fi <= 8; fi++) {
        float fxi = float(fi);
        float tx  = fxi * 0.145 + sin(fxi * 2.17) * 0.025;
        float ty  = -0.06 + sin(fxi * 1.63) * 0.018;
        float ts  = 0.58 + hash(vec2(fxi, 1.0)) * 0.28;

        vec2 tp = p - vec2(tx, ty);
        tp.x += mouseForce * 0.5; // Trees bend away from mouse too!
        tp /= ts;
        float tree = opUnion(opUnion(
            sdPineLayer(tp + vec2(0.0, 0.0),  0.065, 0.160),
            sdPineLayer(tp + vec2(0.0, 0.095), 0.050, 0.130)),
            opUnion(
            sdPineLayer(tp + vec2(0.0, 0.175), 0.038, 0.110),
            sdBox(tp + vec2(0.0, 0.055), vec2(0.007, 0.045))
        ));
        float treeMask = smoothstep(0.004, 0.0, tree);
        float pineShade = valueNoise(vec2(fxi, 2.0)) * 0.15;
        float sway = sin(uTime * 0.8 + fxi * 1.5) * 0.003;
        col = mix(col, vec3(0.04, 0.16 + pineShade, 0.07), treeMask * 0.96);
        float tipSnow = smoothstep(0.060, 0.075, tp.y + 0.175) * treeMask;
        col = mix(col, vec3(0.90, 0.93, 0.96), tipSnow * 0.6);
    }

    // ---- Himalayan Sheep (5 grazing) ----
    vec2 sp0 = vec2(-0.62, -0.26) + vec2(sin(uTime * 0.25) * 0.018, 0.0);
    vec2 sp1 = vec2(-0.48, -0.28) + vec2(sin(uTime * 0.28 + 1.0) * 0.015, 0.0);
    vec2 sp2 = vec2(-0.35, -0.25) + vec2(sin(uTime * 0.22 + 2.0) * 0.012, 0.0);
    vec2 sp3 = vec2( 0.62, -0.24) + vec2(sin(uTime * 0.30 + 3.0) * 0.016, 0.0);
    vec2 sp4 = vec2( 0.50, -0.27) + vec2(sin(uTime * 0.27 + 4.0) * 0.014, 0.0);

    float sheep = opUnion(opUnion(sdSheepBody(p - sp0), sdSheepBody(p - sp1)),
                  opUnion(sdSheepBody(p - sp2), opUnion(sdSheepBody(p - sp3), sdSheepBody(p - sp4))));
    float sheepM = smoothstep(0.004, 0.0, sheep);
    float sheepN = valueNoise((p) * 18.0) * 0.08;
    col = mix(col, vec3(0.92 + sheepN, 0.90 + sheepN, 0.88 + sheepN), sheepM * 0.96);

    // ---- Snow Leopard (right, partially hidden in rocks) ----
    vec2 leopP = p - vec2(0.55, -0.16);
    float leopard = sdSnowLeopard(leopP);
    float leopM   = smoothstep(0.005, 0.0, leopard);
    // Spot pattern
    float spotH   = hash(floor(leopP * 14.0));
    vec2  spotF   = fract(leopP * 14.0) - 0.5;
    float spot    = step(0.65, spotH) * smoothstep(0.28, 0.0, length(spotF));
    vec3  leopCol = mix(vec3(0.72, 0.70, 0.66), vec3(0.18, 0.14, 0.11), spot);
    col = mix(col, leopCol, leopM * 0.92);
    // Eyes glow with magic green
    float eye1 = smoothstep(0.005, -0.002, sdCircle(leopP - vec2(0.095, 0.038), 0.007));
    float eye2 = smoothstep(0.005, -0.002, sdCircle(leopP - vec2(0.112, 0.040), 0.007));
    col = mix(col, vec3(0.40, 1.0, 0.50), max(eye1, eye2) * leopM);
    // Add eye glow aura
    col += vec3(0.1, 0.6, 0.2) * exp(-length(leopP - vec2(0.10, 0.039)) * 40.0) * leopM * 1.5;

    return col;
}

// Reuse mountain ridge from scene 0 here
float mountainRidge(float x) {
    float h = 0.0;
    h += 0.88 * exp(-pow((x + 0.38) * 3.8, 2.0));
    h += 0.64 * exp(-pow((x + 0.12) * 4.5, 2.0));
    h += 0.76 * exp(-pow((x - 0.18) * 3.5, 2.0));
    h += 0.52 * exp(-pow((x + 0.60) * 5.0, 2.0));
    h += 0.44 * exp(-pow((x - 0.42) * 5.5, 2.0));
    return h;
}

// ============================================================
// MAIN DISPATCH
// ============================================================
void main() {
    vec2 uv = vUv;

    // Subtle hover-warp
    float hd = distance(uv, uMouse);
    float hw = smoothstep(0.45, 0.0, hd) * uHover * 0.012;
    uv.x += sin(uv.y * 28.0 + uTime * 5.0) * hw;

    vec3 col;
    if      (uChapter == 0) col = renderMountains(uv);
    else if (uChapter == 1) col = renderTemples(uv);
    else if (uChapter == 2) col = renderCulture(uv);
    else                    col = renderNature(uv);

    // Film grain
    float grain = (fract(sin(dot(vUv + fract(uTime * 0.1), vec2(127.1, 311.7))) * 43758.5) - 0.5) * 0.055;
    col += grain;

    // Vignette
    float vig = 1.0 - smoothstep(0.48, 1.35, length(vUv - 0.5) * 1.38);
    col *= vig;

    // Scroll glitch
    float glitch = step(0.982, sin(vUv.y * 160.0 + uTime * 28.0)) * abs(uScrollVelocity) * 0.06;
    col.r += glitch; col.b -= glitch * 0.5;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), uOpacity);
}
