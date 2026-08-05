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
uniform float uIntroProgress;

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
    float t = uTime;
    
    // 3D Parallax from mouse
    vec2 mv = (uMouse - 0.5) * 2.0;

    // Dynamic wind direction for clouds
    float windX = t * (0.8 + 0.2 * sin(t * 0.3));

    // ==== Sky & Clouds ====
    float skyH = uv.y + mv.y * 0.02;
    vec3 dawnLow   = vec3(0.05, 0.15, 0.30);
    vec3 twilightMid = vec3(0.12, 0.25, 0.45);
    vec3 nightTop  = vec3(0.02, 0.04, 0.08);
    vec3 sky = mix(dawnLow, mix(twilightMid, nightTop, smoothstep(0.0, 0.8, skyH)), smoothstep(0.0, 0.5, skyH));

    // Stars
    vec2 starUV = floor(uv * 200.0);
    float star = step(0.975, hash(starUV));
    float twinkle = 0.5 + 0.5 * sin(uTime * 2.5 + hash(starUV) * 40.0);
    float starVis  = smoothstep(0.42, 0.75, uv.y);
    sky += vec3(0.85, 0.90, 1.00) * star * twinkle * starVis;

    // God Rays (Sunlight appearing through clouds)
    float rays = 0.0;
    for(int i = 0; i < 5; i++) {
        float rayY = uv.y - 0.5 - float(i)*0.1;
        float rayX = uv.x - 0.5 - mv.x * 0.01;
        float ang = atan(rayY, rayX);
        rays += (sin(ang * 12.0 + t * 0.5) * 0.5 + 0.5) * exp(-length(vec2(rayX, rayY)) * 2.0) * 0.05;
    }
    sky += vec3(1.0, 0.8, 0.5) * rays * smoothstep(0.2, 0.6, uv.y);

    // Aurora (now affected by wind)
    float auroraX  = sin(p.x * 2.8 + windX) * 0.5 + 0.5;
    float auroraFBM = fbm(vec2(p.x * 1.5 + windX, uv.y * 2.0));
    float aurora   = auroraX * auroraFBM * smoothstep(0.48, 0.78, uv.y) * 0.5;
    sky += vec3(0.0, aurora * 0.4, aurora * 0.8);

    vec3 col = sky;

    // ---- Far ridge (misty blue, deep parallax) ----
    vec2 pFar = p - mv * 0.02;
    float farH = mountainRidge(pFar.x * 0.65 + 0.08) * 0.45 + 0.20;
    float farFBM = fbm(vec2(pFar.x * 5.0, 0.3)) * 0.12;
    float farMask = smoothstep(farH + farFBM + 0.006, farH + farFBM - 0.006, pFar.y);
    col = mix(col, vec3(0.12, 0.16, 0.30), farMask * 0.92);

    // ---- Mid ridge (medium parallax) ----
    vec2 pMid = p - mv * 0.05;
    float midH = mountainRidge(pMid.x * 0.80 + 0.05) * 0.60 + 0.08;
    float midFBM = fbm(vec2(pMid.x * 6.0 + 2.1, 0.0)) * 0.10;
    float midMask = smoothstep(midH + midFBM + 0.007, midH + midFBM - 0.007, pMid.y);
    col = mix(col, vec3(0.09, 0.11, 0.19), midMask * 0.95);

    // ---- Main foreground peaks (max parallax) ----
    vec2 pMain = p - mv * 0.1;
    float mainFBM = fbm(vec2(pMain.x * 7.0 + windX * 0.5, pMain.y * 3.0)) * 0.12;
    float mainH   = mountainRidge(pMain.x) * 0.82 + mainFBM - 0.06;
    float mainMask = smoothstep(mainH + 0.010, mainH - 0.010, pMain.y);

    // Snow coverage on main peaks
    float snowY  = mainH - 0.10;
    float snowN  = fbm(vec2(pMain.x * 14.0, pMain.y * 9.0)) * 0.08;
    float snowT  = smoothstep(snowY - 0.06 + snowN, snowY + 0.10 + snowN, pMain.y);
    vec3 rock    = vec3(0.16, 0.14, 0.12) + fbm(vec2(pMain.x * 20.0, pMain.y * 10.0)) * 0.06;
    vec3 snow    = vec3(0.87, 0.92, 0.98);
    col = mix(col, mix(rock, snow, snowT * snowT), mainMask);

    // ---- Volumetric Valley mist (flowing through valleys) ----
    float mistY   = -0.08 - pMain.y;
    // Layered fbm for volumetric look
    float mistFBM1 = fbm(vec2(pMain.x * 2.5 + windX * 0.8, pMain.y * 4.0 - t * 0.2));
    float mistFBM2 = fbm(vec2(pMain.x * 5.0 - windX * 0.4, pMain.y * 8.0 + t * 0.4));
    float mistFBM  = (mistFBM1 * 0.7 + mistFBM2 * 0.3);
    float mist    = clamp(mistY * 3.5 + mistFBM * 0.8, 0.0, 0.95);
    vec3 mistCol = mix(vec3(0.40, 0.52, 0.68), vec3(0.8, 0.85, 0.9), mistFBM);
    col = mix(col, mistCol, mist * 0.85);

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
float sdPortal(vec2 p, vec2 size, float thickness) {
    float outer = sdBox(p, size);
    float inner = sdBox(p, size - vec2(thickness));
    return max(outer, -inner);
}

// Function to simulate blocks assembling based on time
float assembleMask(vec2 p, float t, float seed) {
    float cellY = floor((p.y + 0.5) * 20.0); // Quantize Y into blocks
    float revealT = t - cellY * 0.1 - hash1(cellY + seed) * 0.5;
    return smoothstep(0.0, 0.2, revealT);
}

vec3 renderTemples(vec2 uv) {
    vec2 p = uv - 0.5;
    p.x *= 1.78;
    float t = uTime;
    
    // Interactive bell ripple (mouse hover triggers divine wave)
    float rippleDist = distance(p, (uMouse - 0.5) * vec2(1.78, 1.0));
    float bellRipple = sin(rippleDist * 40.0 - t * 10.0) * exp(-rippleDist * 5.0) * uHover;
    p += normalize(p) * bellRipple * 0.02;

    vec3 col = vec3(0.02, 0.03, 0.05); // Deep spiritual void

    // God-rays from the heavens
    float godRays = 0.0;
    for(int i = 0; i < 7; i++) {
        float f = float(i) * 0.2;
        float r = sin(p.x * (10.0 + f * 5.0) + t * 0.2 + f) * 0.5 + 0.5;
        godRays += r * exp(-abs(p.y - 1.0) * 1.5) * 0.08;
    }
    col += vec3(0.9, 0.8, 0.6) * godRays * (1.0 + bellRipple * 5.0);
    
    // Ambient volumetric fog
    float fog = fbm(vec2(p.x * 2.0, p.y * 2.0 - t * 0.2)) * 0.2;
    col += vec3(0.1, 0.15, 0.25) * fog;

    // ---- 4 Floating Sacred Portals ----
    vec2 pos[4];
    pos[0] = vec2(-0.8, sin(t * 0.5) * 0.05); // Yamunotri
    pos[1] = vec2(-0.3, sin(t * 0.6 + 1.0) * 0.08); // Gangotri
    pos[2] = vec2( 0.3, sin(t * 0.4 + 2.0) * 0.06); // Kedarnath (Main)
    pos[3] = vec2( 0.8, sin(t * 0.7 + 3.0) * 0.04); // Badrinath
    
    vec3 pCols[4];
    pCols[0] = vec3(0.1, 0.4, 0.8); // Water/Blue
    pCols[1] = vec3(0.7, 0.9, 1.0); // Ice/White
    pCols[2] = vec3(0.9, 0.3, 0.1); // Fire/Saffron
    pCols[3] = vec3(1.0, 0.8, 0.2); // Gold/Wealth

    for(int i = 0; i < 4; i++) {
        vec2 localP = p - pos[i];
        localP = rot(localP, sin(t * 0.2 + float(i)) * 0.1);
        float portal = sdPortal(localP, vec2(0.15, 0.25), 0.02);
        
        float amask = assembleMask(localP, mod(t * 0.5, 4.0), float(i) * 12.3);
        float pMask = smoothstep(0.005, 0.0, portal) * amask;
        
        vec2 stUV = localP * 20.0;
        float stone = valueNoise(stUV) * 0.5 + 0.5;
        vec3 frameCol = mix(vec3(0.1), vec3(0.3), stone);
        col = mix(col, frameCol, pMask);
        
        float innerD = sdBox(localP, vec2(0.13, 0.23));
        float innerEnergy = exp(-abs(innerD) * 15.0) * amask;
        
        float magic = fbm(vec2(localP.x * 10.0 + t, localP.y * 10.0 - t * 2.0));
        vec3 energyCol = pCols[i] * (0.5 + magic * 0.5);
        
        col += energyCol * innerEnergy * 1.5;
        float insideMask = smoothstep(0.0, -0.01, innerD);
        col = mix(col, energyCol * 2.0, insideMask * amask);
    }
    
    // ---- Thousands of floating dust/snow particles ----
    float dust = 0.0;
    for(int i = 0; i < 30; i++) {
        float fi = float(i);
        vec2 dp = vec2(
            fract(sin(fi * 11.11) * 43.5 + t * 0.05) * 3.5 - 1.75,
            fract(cos(fi * 22.22) * 54.3 - t * 0.1) * 2.0 - 1.0
        );
        dp.x += sin(dp.y * 5.0 + t) * 0.05;
        float dist = length(p - dp);
        dust += exp(-dist * 400.0) * (sin(t * 5.0 + fi) * 0.5 + 0.5);
    }
    col += vec3(0.9, 0.8, 0.6) * dust;
    
    // Prayer flags GPU wind simulation across the top
    float flagLineY = 0.35 + sin(p.x * 2.0 + t) * 0.05;
    float flags = 0.0;
    float flagW = 0.04;
    float flagX = mod(p.x, flagW) - flagW*0.5;
    float flagIdx = floor(p.x / flagW);
    float flagWind = sin(flagIdx * 10.0 + t * 5.0) * 0.01;
    float flagH = sdBox(vec2(flagX, p.y - flagLineY + 0.03 + flagWind), vec2(0.015, 0.03));
    if (flagH < 0.0 && p.y < flagLineY) {
        vec3[] fC = vec3[](vec3(0.1, 0.2, 0.8), vec3(1.0, 1.0, 1.0), vec3(0.8, 0.1, 0.1), vec3(0.1, 0.7, 0.2), vec3(0.9, 0.8, 0.1));
        col = mix(col, fC[int(abs(mod(flagIdx, 5.0)))], 0.9);
    }

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

    // ---- Abstract Divine Presence (Replacing literal forms) ----
    // Rotating geometric energy field (Sri Yantra / Mandala inspired)
    float gT = t * 0.4;
    vec2 centerP = p - vec2(0.2, 0.0);
    
    // Complex rotation
    vec2 rp1 = rot(centerP, gT);
    vec2 rp2 = rot(centerP, -gT * 1.5);
    
    // Abstract light sculpture (intersecting triangles and circles)
    float mandala = 100.0; // Start with infinity for intersection/union
    for(int i = 0; i < 6; i++) {
        float fi = float(i);
        float a = gT + fi * 1.047; // PI/3
        vec2 tp = rot(centerP, a);
        float tri = sdTriangle(tp, vec2(0.0, 0.3), vec2(0.25, -0.15), vec2(-0.25, -0.15));
        mandala = opUnion(mandala, abs(tri) - 0.002);
    }
    
    // Inner glowing core
    float core = sdCircle(centerP, 0.08 + sin(t * 3.0) * 0.01);
    mandala = opUnion(mandala, abs(core) - 0.005);
    
    // Energy field waves radiating outward
    float waveDist = length(centerP);
    float waves = sin(waveDist * 40.0 - t * 5.0) * 0.5 + 0.5;
    float waveMask = exp(-waveDist * 8.0);
    
    // Outer halo
    float halo = abs(sdCircle(centerP, 0.4)) - 0.002;
    mandala = opUnion(mandala, halo);
    
    float mMask = smoothstep(0.005, 0.0, mandala);
    float mGlow = exp(-abs(mandala) * 30.0);
    
    // Sacred golden and bright white light
    vec3 divineBase = vec3(1.0, 0.9, 0.7);
    vec3 divineCore = vec3(1.0, 1.0, 1.0);
    
    // Render the abstract sculpture
    col = mix(col, divineBase, mMask);
    col += divineCore * mGlow * 1.5;
    col += vec3(0.9, 0.5, 0.1) * waves * waveMask * 0.6; // Pulsing energy

    // Floating orbs of consciousness
    float orbs = 0.0;
    for(int i = 0; i < 8; i++) {
        float fi = float(i);
        vec2 op = centerP + vec2(sin(fi * 7.0 + t) * 0.5, cos(fi * 13.0 + t * 1.2) * 0.5);
        float od = length(p - (op + centerP)); // offset relative to center
        orbs += exp(-od * 100.0) * (sin(t * 4.0 + fi) * 0.5 + 0.5);
    }
    col += vec3(1.0, 0.8, 0.4) * orbs * 1.2;

    return col;

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

    // ---- Glacial river (Flow-map distortion) ----
    // Use domain warping to simulate fluid flow vectors
    float flowDistort = fbmDomainWarp(vec2(p.x * 3.0, t * 0.5)) * 0.1;
    float rvY    = -0.22 + sin(p.x * 2.8 + t * 2.0) * 0.022 + fbm(vec2(p.x * 5.0, t)) * 0.018 + flowDistort;
    
    float rvDist = abs(p.y - rvY);
    float rvMask = smoothstep(rvDist - 0.022, rvDist - 0.032, 0.0);
    
    // Fluid shim (water highlights based on flow map)
    float rvShim = valueNoise(vec2(p.x * 32.0 - t * 9.0 + flowDistort * 10.0, 0.0)) * 0.4 + 0.6;
    col = mix(col, vec3(0.32, 0.62, 0.90) * rvShim, rvMask);
    
    // Flowing white foam at banks
    float foamMap = fbm(vec2(p.x * 10.0 - t * 2.0, rvY * 10.0)) * 0.01;
    float foam   = smoothstep(rvDist - 0.025 + foamMap, rvDist - 0.022 + foamMap, 0.0) * rvMask;
    col = mix(col, vec3(0.95, 0.97, 1.0), foam * 0.7);

    // ---- Pine Forest (GPU Space Folding / Instancing) ----
    float forestY = -0.06;
    if (p.y > forestY - 0.1 && p.y < forestY + 0.25) {
        // Domain repetition parameters
        float treeW = 0.08;
        
        // 3 Layers of depth for the forest
        for(int layer = 0; layer < 3; layer++) {
            float fl = float(layer);
            float parallax = mouseForce * (0.3 + fl * 0.2);
            vec2 treeP = p - vec2(parallax, forestY + fl * 0.02);
            
            // X-axis folding
            float cellX = floor(treeP.x / treeW);
            treeP.x = mod(treeP.x, treeW) - treeW * 0.5;
            
            // Per-instance random properties
            float treeSeed = cellX * 13.37 + fl * 23.45;
            float treeHash = hash1(treeSeed);
            float ts = 0.5 + treeHash * 0.4; // Scale
            float ty = sin(treeSeed * 5.0) * 0.01; // Y offset
            
            treeP -= vec2(0.0, ty);
            treeP /= ts;
            
            float tree = opUnion(opUnion(
                sdPineLayer(treeP + vec2(0.0, 0.0),  0.065, 0.160),
                sdPineLayer(treeP + vec2(0.0, 0.095), 0.050, 0.130)),
                opUnion(
                sdPineLayer(treeP + vec2(0.0, 0.175), 0.038, 0.110),
                sdBox(treeP + vec2(0.0, 0.055), vec2(0.007, 0.045))
            ));
            
            float treeMask = smoothstep(0.004, 0.0, tree);
            
            // Shading and wind sway
            float sway = sin(uTime * 0.8 + treeSeed * 5.0) * 0.005;
            float pineShade = treeHash * 0.15;
            vec3 pineCol = vec3(0.04, 0.12 + pineShade, 0.08);
            
            // Depth fade
            pineCol = mix(pineCol, vec3(0.3, 0.4, 0.5), fl * 0.15);
            col = mix(col, pineCol, treeMask * 0.98);
            
            // Snow on tips
            float tipSnow = smoothstep(0.060, 0.075, treeP.y + 0.175) * treeMask;
            col = mix(col, vec3(0.90, 0.93, 0.96), tipSnow * (0.8 - fl * 0.2));
        }
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

    // ---- Global Bloom / Glow ----
    // Extract luminance
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    // Soft threshold
    float bloom = smoothstep(0.6, 0.9, lum);
    col += col * bloom * 0.4;

    return col;
}


// ============================================================
// SCENE -1 — THE AWAKENING (HERO SEQUENCE)
// Darkness -> Heartbeat -> Sacred Geometry -> Assembly -> Portal
// ============================================================
vec3 renderHero(vec2 uv) {
    vec2 p = uv - 0.5;
    p.x *= 1.78;
    float t = uTime;
    vec3 col = vec3(0.0);
    
    // uIntroProgress goes from 0.0 to 1.0
    // Stage 1: 0.0 to 0.3 - Darkness and Heartbeat Pulse
    // Stage 2: 0.3 to 0.6 - Sacred Geometry Awakens
    // Stage 3: 0.6 to 0.9 - Portal Opens (Particles Assemble)
    // Stage 4: 0.9 to 1.0 - Transition to Mountains
    
    // ---- 1. Heartbeat Particle (0.0 to 0.4) ----
    float hbPhase = clamp(uIntroProgress / 0.4, 0.0, 1.0);
    float hbFade = 1.0 - smoothstep(0.3, 0.4, uIntroProgress);
    if (hbPhase > 0.0 && hbFade > 0.0) {
        float pulse = sin(t * 12.0) * exp(-fract(t * 1.5) * 5.0); // Heartbeat
        float core = sdCircle(p, 0.01 + pulse * 0.005);
        float glow = exp(-core * (200.0 - pulse * 100.0));
        col += vec3(0.9, 0.5, 0.2) * glow * hbFade * smoothstep(0.0, 0.1, hbPhase);
    }
    
    // ---- 2. Sacred Geometry Awakens (0.3 to 0.7) ----
    float geoPhase = clamp((uIntroProgress - 0.3) / 0.4, 0.0, 1.0);
    float geoFade = 1.0 - smoothstep(0.65, 0.75, uIntroProgress);
    if (geoPhase > 0.0 && geoFade > 0.0) {
        float gT = t * 0.5;
        vec2 rp = rot(p, gT);
        float mandala = sdCircle(rp, 0.2 * geoPhase);
        
        // Rotating triangles (Sri Yantra vibe)
        for(int i = 0; i < 4; i++) {
            float fi = float(i);
            vec2 tp = rot(p, gT * (fi + 1.0) * (mod(fi, 2.0) == 0.0 ? 1.0 : -1.0));
            float tri = sdTriangle(tp, vec2(0.0, 0.15 + fi*0.05) * geoPhase, 
                                       vec2(0.13 + fi*0.04, -0.1 + fi*0.02) * geoPhase, 
                                       vec2(-0.13 - fi*0.04, -0.1 + fi*0.02) * geoPhase);
            mandala = opUnion(mandala, abs(tri) - 0.002);
        }
        
        float geoGlow = smoothstep(0.005, 0.0, abs(mandala));
        geoGlow += exp(-abs(mandala) * 50.0) * 0.5;
        
        // Color shifts from gold to divine white
        vec3 geoCol = mix(vec3(0.9, 0.6, 0.1), vec3(0.8, 0.9, 1.0), geoPhase);
        col += geoCol * geoGlow * smoothstep(0.0, 0.1, geoPhase) * geoFade;
    }
    
    // ---- 3. The Divine Portal & Particles (0.5 to 1.0) ----
    float portalPhase = clamp((uIntroProgress - 0.5) / 0.5, 0.0, 1.0);
    if (portalPhase > 0.0) {
        // Portal ring expanding
        float ringR = portalPhase * 2.5; // Expands outward
        float ringD = abs(length(p) - ringR);
        float ringGlow = exp(-ringD * 10.0) * (1.0 - portalPhase); // Fades as it expands
        col += vec3(0.6, 0.8, 1.0) * ringGlow;
        
        // Particles flying towards the camera (out of the portal)
        float stars = 0.0;
        for(int i = 0; i < 40; i++) {
            float fi = float(i);
            // Z-coordinate determines size and speed
            float pZ = fract(fi * 0.123 - t * 0.8 + portalPhase * 5.0); 
            // XY scatter
            vec2 pXY = vec2(sin(fi * 111.1), cos(fi * 222.2));
            vec2 stP = p - (pXY * (1.0 - pZ) * 2.0 * portalPhase);
            
            float stSize = (1.0 - pZ) * 0.03; // Bigger as it gets closer
            float st = smoothstep(stSize, 0.0, length(stP));
            stars += st * pZ * (1.0 - portalPhase); // Fade out at the end
        }
        col += vec3(1.0, 0.9, 0.8) * stars;
        
        // Inner void revealing the mountain scene behind
        // We blend the rendered mountain scene into the inner void
        float voidM = smoothstep(0.1, 0.4, portalPhase) * smoothstep(ringR + 0.1, ringR - 0.1, length(p));
        vec3 mtnCol = renderMountains(uv);
        col = mix(col, mtnCol, voidM);
    }
    
    return col;
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
    if      (uChapter == -1) col = renderHero(uv);
    else if (uChapter == 0) col = renderMountains(uv);
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
