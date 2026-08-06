import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Remove all br-ch-photo-bg divs (with all their children) from each chapter
# These are the full-bleed image sections
html = re.sub(
    r'\s*<!-- Full-bleed editorial photo.*?</div>\s*(?=<div class="br-grid")',
    '\n          ',
    html,
    flags=re.DOTALL
)
# Also simpler version without the comment
html = re.sub(
    r'\s*<div class="br-ch-photo-bg">.*?</div>\s*(?=<div class="br-grid")',
    '\n          ',
    html,
    flags=re.DOTALL
)

# 2. Add Section 5 after </section> of brutalist-act
sacred_section = """
      <!-- ============================================================ -->
      <!-- Act 6: DEVBHOOMI DECODED — Sacred Topography Scanner         -->
      <!-- Pure code-generated. No images. Only math and the mountains. -->
      <!-- ============================================================ -->
      <section id="sacred-data" style="height: 250vh; position: relative;">
        <!-- Sticky viewport wrapper -->
        <div class="sd-sticky">

          <!-- CANVAS — the procedural mountain / scan / trishul -->
          <canvas id="sd-canvas"></canvas>

          <!-- HUD Overlay -->
          <div class="sd-hud">

            <!-- Corner reticles (4 corners, like Blue Flax poster) -->
            <div class="sd-corner tl"></div>
            <div class="sd-corner tr"></div>
            <div class="sd-corner bl"></div>
            <div class="sd-corner br"></div>

            <!-- Title block — top left -->
            <div class="sd-title-block">
              <span class="sd-eyebrow">TOPOGRAPHIC SCAN  ·  30°22'N  79°21'E</span>
              <h2 class="sd-title">देवभूमि<br><span>DECODED</span></h2>
            </div>

            <!-- Peak callouts — positioned absolutely over canvas -->
            <div class="sd-callout sd-callout--right" data-idx="0" style="left:12%; bottom:52%;">
              <div class="sd-callout-box">
                <span class="sd-callout-name">NANDA DEVI</span>
                <span class="sd-callout-name-skt">नन्दा देवी</span>
                <span class="sd-callout-elev">7,816 M</span>
                <span class="sd-callout-sub">HIGHEST IN INDIA</span>
              </div>
            </div>

            <div class="sd-callout sd-callout--left" data-idx="1" style="left:30%; bottom:40%;">
              <div class="sd-callout-box">
                <span class="sd-callout-name">KEDARNATH</span>
                <span class="sd-callout-name-skt">केदारनाथ</span>
                <span class="sd-callout-elev">3,584 M</span>
                <span class="sd-callout-sub">CHAR DHAM CIRCUIT</span>
              </div>
            </div>

            <div class="sd-callout sd-callout--right" data-idx="2" style="left:50%; bottom:55%;">
              <div class="sd-callout-box">
                <span class="sd-callout-name">TRISHUL</span>
                <span class="sd-callout-name-skt">त्रिशूल</span>
                <span class="sd-callout-elev">7,120 M</span>
                <span class="sd-callout-sub">SHIVA'S TRIDENT</span>
              </div>
            </div>

            <div class="sd-callout sd-callout--left" data-idx="3" style="left:70%; bottom:48%;">
              <div class="sd-callout-box">
                <span class="sd-callout-name">PANCHACHULI</span>
                <span class="sd-callout-name-skt">पञ्चचूली</span>
                <span class="sd-callout-elev">6,904 M</span>
                <span class="sd-callout-sub">THE FIVE FIRES</span>
              </div>
            </div>

            <div class="sd-callout sd-callout--right" data-idx="4" style="left:88%; bottom:38%;">
              <div class="sd-callout-box">
                <span class="sd-callout-name">BADRINATH</span>
                <span class="sd-callout-name-skt">बद्रीनाथ</span>
                <span class="sd-callout-elev">3,133 M</span>
                <span class="sd-callout-sub">VAIKUNTHA DHAM</span>
              </div>
            </div>

            <!-- Scan progress bar — bottom -->
            <div class="sd-scanbar">
              <span class="sd-scanbar-label">SCANNING TERRAIN</span>
              <div class="sd-scanbar-track">
                <div class="sd-scanbar-fill" id="sd-scanbar-fill"></div>
              </div>
            </div>

            <!-- Data counters — bottom right -->
            <div class="sd-counters">
              <div class="sd-counter">
                <span class="sd-counter-val" id="sd-c-0">000</span>
                <span class="sd-counter-label">GLACIERS</span>
              </div>
              <div class="sd-counter">
                <span class="sd-counter-val" id="sd-c-1">00</span>
                <span class="sd-counter-label">SACRED RIVERS</span>
              </div>
              <div class="sd-counter">
                <span class="sd-counter-val" id="sd-c-2">00</span>
                <span class="sd-counter-label">PEAKS &gt; 6000M</span>
              </div>
              <div class="sd-counter">
                <span class="sd-counter-val" id="sd-c-3">0</span>
                <span class="sd-counter-label">CHAR DHAMS</span>
              </div>
            </div>

          </div>
          <!-- END HUD -->

        </div>
        <!-- END STICKY -->
      </section>
"""

# Insert before </main>
html = html.replace('    </main>', sacred_section + '\n    </main>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("HTML updated: images removed from chapters, Section 5 added.")
