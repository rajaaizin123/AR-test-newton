/**
 * Newton's 2nd Law – WebAR Simulation
 * =====================================
 * F = m × a  →  a = F / m
 *
 * Physics loop runs via requestAnimationFrame.
 * A-Frame entity positions are updated each frame.
 */

'use strict';

// ─────────────────────────────────────────────
// 1. PHYSICS STATE
// ─────────────────────────────────────────────
const physics = {
  force:        10,     // Newtons
  mass:         2,      // kg
  velocity:     0,      // m/s  (along X)
  position:     0,      // m    (along X, mapped to A-Frame units)
  acceleration: 0,      // m/s²
  paused:       false,
  lastTime:     null,   // timestamp of previous frame (ms)

  /** Clamp deltaTime to avoid huge jumps after tab switch */
  MAX_DELTA: 0.05,      // seconds

  /** World-space scale: 1 physics metre → 0.15 A-Frame units */
  SCALE: 0.15,

  /** Soft boundary: cart bounces back at ±boundary metres */
  BOUNDARY: 1.8,
};

// ─────────────────────────────────────────────
// 2. DOM REFERENCES
// ─────────────────────────────────────────────
const forceSlider    = document.getElementById('forceSlider');
const massSlider     = document.getElementById('massSlider');
const forceVal       = document.getElementById('forceVal');
const massVal        = document.getElementById('massVal');
const displayForce   = document.getElementById('display-force');
const displayMass    = document.getElementById('display-mass');
const displayAccel   = document.getElementById('display-accel');
const displayVel     = document.getElementById('display-velocity');
const displayPos     = document.getElementById('display-position');
const btnReset       = document.getElementById('btnReset');
const btnPause       = document.getElementById('btnPause');
const markerHint     = document.getElementById('marker-hint');

// A-Frame entities (grabbed after DOM is ready)
let cartGroup, arrowShaft, arrowHead, cartLabel;

// ─────────────────────────────────────────────
// 3. INITIALISE AFTER A-FRAME LOADS
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Wait for A-Frame scene to be ready
  const scene = document.getElementById('arScene');
  scene.addEventListener('loaded', onSceneLoaded);

  // Fallback: grab entities after a short delay if event already fired
  setTimeout(grabEntities, 1500);
});

function onSceneLoaded() {
  grabEntities();
  buildGridLines();
  startLoop();
}

function grabEntities() {
  cartGroup  = document.getElementById('cartGroup');
  arrowShaft = document.getElementById('arrowShaft');
  arrowHead  = document.getElementById('arrowHead');
  cartLabel  = document.getElementById('cartLabel');
}

// ─────────────────────────────────────────────
// 4. MARKER VISIBILITY FEEDBACK
// ─────────────────────────────────────────────
const hiroMarker = document.getElementById('hiroMarker');

hiroMarker.addEventListener('markerFound', () => {
  markerHint.classList.add('hidden');
});

hiroMarker.addEventListener('markerLost', () => {
  markerHint.classList.remove('hidden');
});

// ─────────────────────────────────────────────
// 5. SLIDER EVENT LISTENERS
// ─────────────────────────────────────────────
forceSlider.addEventListener('input', () => {
  physics.force = parseFloat(forceSlider.value);
  forceVal.textContent = physics.force + ' N';
  displayForce.textContent = physics.force;
  updateAccelDisplay();
  updateArrow();
});

massSlider.addEventListener('input', () => {
  physics.mass = parseFloat(massSlider.value);
  massVal.textContent = physics.mass + ' kg';
  displayMass.textContent = physics.mass;
  updateAccelDisplay();
  updateCartScale();
});

// ─────────────────────────────────────────────
// 6. BUTTON HANDLERS
// ─────────────────────────────────────────────
btnReset.addEventListener('click', resetSimulation);

btnPause.addEventListener('click', () => {
  physics.paused = !physics.paused;
  btnPause.textContent = physics.paused ? '▶ Play' : '⏸ Pause';
  btnPause.classList.toggle('btn-paused', physics.paused);

  if (!physics.paused) {
    // Reset lastTime so deltaTime doesn't spike on resume
    physics.lastTime = null;
  }
});

// ─────────────────────────────────────────────
// 7. RESET SIMULATION
// ─────────────────────────────────────────────
function resetSimulation() {
  physics.velocity = 0;
  physics.position = 0;
  physics.lastTime = null;

  // Restore sliders to defaults
  forceSlider.value = 10;
  massSlider.value  = 2;
  physics.force = 10;
  physics.mass  = 2;

  forceVal.textContent = '10 N';
  massVal.textContent  = '2 kg';
  displayForce.textContent = '10';
  displayMass.textContent  = '2';

  updateAccelDisplay();
  updateArrow();
  updateCartScale();
  applyCartPosition();
  updateHUD();
}

// ─────────────────────────────────────────────
// 8. PHYSICS LOOP
// ─────────────────────────────────────────────
function startLoop() {
  requestAnimationFrame(loop);
}

function loop(timestamp) {
  requestAnimationFrame(loop);

  if (physics.paused) return;

  // ── Delta time ──
  if (physics.lastTime === null) {
    physics.lastTime = timestamp;
    return;
  }
  const rawDelta = (timestamp - physics.lastTime) / 1000; // seconds
  const dt = Math.min(rawDelta, physics.MAX_DELTA);
  physics.lastTime = timestamp;

  // ── F = m·a  →  a = F/m ──
  physics.acceleration = physics.force / physics.mass;

  // ── Integrate velocity ──
  physics.velocity += physics.acceleration * dt;

  // ── Soft boundary: reverse velocity with damping ──
  if (physics.position >= physics.BOUNDARY && physics.velocity > 0) {
    physics.velocity *= -0.6;
    physics.position = physics.BOUNDARY;
  }
  if (physics.position <= -physics.BOUNDARY && physics.velocity < 0) {
    physics.velocity *= -0.6;
    physics.position = -physics.BOUNDARY;
  }

  // ── Integrate position ──
  physics.position += physics.velocity * dt;

  // ── Apply to scene ──
  applyCartPosition();
  updateHUD();
  animateWheels(dt);
}

// ─────────────────────────────────────────────
// 9. APPLY POSITION TO A-FRAME ENTITY
// ─────────────────────────────────────────────
function applyCartPosition() {
  if (!cartGroup) return;

  const xAframe = physics.position * physics.SCALE;
  const current = cartGroup.getAttribute('position');
  cartGroup.setAttribute('position', {
    x: xAframe,
    y: current ? current.y : 0.2,
    z: current ? current.z : 0,
  });
}

// ─────────────────────────────────────────────
// 10. UPDATE HUD (HTML overlay)
// ─────────────────────────────────────────────
function updateHUD() {
  displayVel.textContent = physics.velocity.toFixed(2);
  displayPos.textContent = 'Pos: ' + physics.position.toFixed(2) + ' m';
  updateAccelDisplay();
}

function updateAccelDisplay() {
  const a = (physics.force / physics.mass).toFixed(2);
  displayAccel.textContent = a;
  physics.acceleration = parseFloat(a);

  // Update 3D label on cart
  if (cartLabel) {
    cartLabel.setAttribute('value',
      `F=${physics.force}N  m=${physics.mass}kg\na=${a} m/s²`
    );
  }
}

// ─────────────────────────────────────────────
// 11. SCALE ARROW WITH FORCE
// ─────────────────────────────────────────────
function updateArrow() {
  if (!arrowShaft || !arrowHead) return;

  // Shaft length scales linearly with force (range 1–20 → 0.15–0.7)
  const minLen = 0.15, maxLen = 0.70;
  const t = (physics.force - 1) / (20 - 1);
  const shaftLen = minLen + t * (maxLen - minLen);

  arrowShaft.setAttribute('geometry', 'height', shaftLen);

  // Reposition shaft so its base stays at the cart edge
  const shaftX = 0.3 + shaftLen / 2;
  arrowShaft.setAttribute('position', `${shaftX} 0.05 0`);

  // Arrowhead sits at the tip of the shaft
  const headX = 0.3 + shaftLen + 0.06;
  arrowHead.setAttribute('position', `${headX} 0.05 0`);
}

// ─────────────────────────────────────────────
// 12. SCALE CART WITH MASS (visual feedback)
// ─────────────────────────────────────────────
function updateCartScale() {
  const cartBody = document.getElementById('cartBody');
  if (!cartBody) return;

  // Mass 1–10 → scale 0.7–1.4 on Y and Z (heavier = bigger)
  const s = 0.7 + (physics.mass - 1) / 9 * 0.7;
  cartBody.setAttribute('scale', `1 ${s.toFixed(2)} ${s.toFixed(2)}`);
}

// ─────────────────────────────────────────────
// 13. ANIMATE WHEELS (rotate with velocity)
// ─────────────────────────────────────────────
let wheelAngle = 0;

function animateWheels(dt) {
  // Wheel circumference ≈ 2π × 0.07 ≈ 0.44 A-Frame units
  // Angular velocity (deg/s) = linear velocity / radius × (180/π)
  const radius = 0.07;
  const angularVel = (physics.velocity * physics.SCALE / radius) * (180 / Math.PI);
  wheelAngle += angularVel * dt;

  const ids = ['wheelFL', 'wheelFR', 'wheelBL', 'wheelBR'];
  ids.forEach(id => {
    const w = document.getElementById(id);
    if (w) {
      w.setAttribute('rotation', `90 ${wheelAngle.toFixed(1)} 0`);
    }
  });
}

// ─────────────────────────────────────────────
// 14. BUILD GRID LINES ON GROUND PLANE
// ─────────────────────────────────────────────
function buildGridLines() {
  const container = document.getElementById('gridLines');
  if (!container) return;

  const lineColor = '#4fc3f7';
  const opacity   = 0.25;

  // Vertical lines (along Z axis)
  for (let x = -1.8; x <= 1.8; x += 0.4) {
    const line = document.createElement('a-entity');
    line.setAttribute('line', `start: ${x} 0 -1; end: ${x} 0 1; color: ${lineColor}; opacity: ${opacity}`);
    container.appendChild(line);
  }

  // Horizontal lines (along X axis)
  for (let z = -1; z <= 1; z += 0.4) {
    const line = document.createElement('a-entity');
    line.setAttribute('line', `start: -1.8 0 ${z}; end: 1.8 0 ${z}; color: ${lineColor}; opacity: ${opacity}`);
    container.appendChild(line);
  }
}

// ─────────────────────────────────────────────
// 15. INITIAL STATE SETUP
// ─────────────────────────────────────────────
// Run once DOM is ready (before scene loads)
window.addEventListener('load', () => {
  updateAccelDisplay();
  updateArrow();
  updateCartScale();
});

// ─────────────────────────────────────────────
// 16. SLIDER FILL (CSS custom property trick)
// ─────────────────────────────────────────────
// Updates the CSS --val variable so the gradient fill tracks the thumb.
function updateSliderFill(slider) {
  slider.style.setProperty('--val', slider.value);
}

forceSlider.addEventListener('input', () => updateSliderFill(forceSlider));
massSlider.addEventListener('input',  () => updateSliderFill(massSlider));

// Set initial fill on load
window.addEventListener('load', () => {
  updateSliderFill(forceSlider);
  updateSliderFill(massSlider);
});
