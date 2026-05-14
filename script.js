"use strict";

const DEFAULT_FORCE = 10;
const DEFAULT_OPPOSING_FORCE = 5;
const DEFAULT_MASS = 2;
const DEFAULT_VELOCITY = 0;
const DEFAULT_POSITION = 0;

const MAX_DISTANCE_FROM_MARKER = 3.4;
const VISUAL_POSITION_SCALE = 0.42;
const MAX_DELTA_TIME = 0.05;
const FORCE_MIN = 0;
const FORCE_MAX = 20;
const RESULT_FORCE_EPSILON = 0.01;
const TRAIL_POINT_LIMIT = 28;
const TRAIL_POINT_INTERVAL = 0.12;
const FORWARD_ROTATION_Y = -90;
const BACKWARD_ROTATION_Y = 90;

const simulation = {
  force: DEFAULT_FORCE,
  opposingForce: DEFAULT_OPPOSING_FORCE,
  opposingForceEnabled: false,
  mass: DEFAULT_MASS,
  resultForce: DEFAULT_FORCE,
  acceleration: DEFAULT_FORCE / DEFAULT_MASS,
  velocityZ: DEFAULT_VELOCITY,
  positionZ: DEFAULT_POSITION,
  trailDistance: 0,
  isPlaying: true,
  markerVisible: false,
  previousTime: null
};

const elements = {
  forceSlider: document.getElementById("forceSlider"),
  opposingForceSlider: document.getElementById("opposingForceSlider"),
  opposingForceToggle: document.getElementById("opposingForceToggle"),
  opposingForceControl: document.getElementById("opposingForceControl"),
  massSlider: document.getElementById("massSlider"),
  forceSliderValue: document.getElementById("forceSliderValue"),
  opposingForceSliderValue: document.getElementById("opposingForceSliderValue"),
  massSliderValue: document.getElementById("massSliderValue"),
  forceOutput: document.getElementById("forceOutput"),
  opposingForceOutput: document.getElementById("opposingForceOutput"),
  resultForceOutput: document.getElementById("resultForceOutput"),
  massOutput: document.getElementById("massOutput"),
  accelerationOutput: document.getElementById("accelerationOutput"),
  playPauseButton: document.getElementById("playPauseButton"),
  resetButton: document.getElementById("resetButton"),
  markerStatus: document.getElementById("markerStatus"),
  cart: document.getElementById("cart"),
  cartRig: document.getElementById("cartRig"),
  forceArrow: document.getElementById("forceArrow"),
  forceArrowShaft: document.getElementById("forceArrowShaft"),
  forceArrowHead: document.getElementById("forceArrowHead"),
  opposingArrow: document.getElementById("opposingArrow"),
  opposingArrowShaft: document.getElementById("opposingArrowShaft"),
  opposingArrowHead: document.getElementById("opposingArrowHead"),
  resultArrow: document.getElementById("resultArrow"),
  resultArrowShaft: document.getElementById("resultArrowShaft"),
  resultArrowHead: document.getElementById("resultArrowHead"),
  trailRoot: document.getElementById("trailRoot"),
  cartLabel: document.getElementById("cartLabel"),
  hiroMarker: document.getElementById("hiroMarker")
};

function calculateAcceleration() {
  simulation.resultForce = simulation.opposingForceEnabled
    ? simulation.force - simulation.opposingForce
    : simulation.force;
  simulation.acceleration = simulation.resultForce / simulation.mass;
}

function updatePhysics(deltaTime) {
  calculateAcceleration();

  simulation.velocityZ += simulation.acceleration * deltaTime;
  simulation.positionZ += simulation.velocityZ * deltaTime;

  // Keep the cart close to the Hiro marker so students can keep seeing it.
  if (Math.abs(simulation.positionZ) > MAX_DISTANCE_FROM_MARKER) {
    resetMotion();
    return;
  }

  simulation.trailDistance += Math.abs(simulation.velocityZ * deltaTime);
  if (simulation.trailDistance >= TRAIL_POINT_INTERVAL) {
    simulation.trailDistance = 0;
    addTrailPoint();
  }
}

function updateCartPosition() {
  elements.cartRig.setAttribute("position", {
    x: 0,
    y: 0.04,
    z: simulation.positionZ * VISUAL_POSITION_SCALE
  });
}

function setMarkerVisible(isVisible) {
  if (simulation.markerVisible === isVisible) {
    return;
  }

  simulation.markerVisible = isVisible;

  if (isVisible) {
    resetMotion();
    elements.markerStatus.textContent = "Marker Hiro terdeteksi.";
    elements.markerStatus.classList.add("detected");
  } else {
    elements.markerStatus.textContent = "Scan marker Hiro untuk mulai.";
    elements.markerStatus.classList.remove("detected");
  }
}

function getForceRatio(value) {
  return Math.min(Math.max(value / FORCE_MAX, 0), 1);
}

function updateSolidArrow(shaftElement, headElement, shaftLength, startOffset, radius) {
  const shaftCenterX = startOffset + shaftLength / 2;
  const headX = startOffset + shaftLength + 0.06;

  shaftElement.setAttribute("geometry", {
    primitive: "cylinder",
    radius,
    height: shaftLength
  });
  shaftElement.setAttribute("position", `${shaftCenterX} 0 0`);
  headElement.setAttribute("position", `${headX} 0 0`);
}

function updateForceArrow() {
  const shaftLength = 0.24 + getForceRatio(simulation.force) * 0.82;

  updateSolidArrow(elements.forceArrowShaft, elements.forceArrowHead, shaftLength, 0.11, 0.025);
  elements.forceArrow.setAttribute("rotation", `0 ${FORWARD_ROTATION_Y} 0`);
}

function updateOpposingArrow() {
  elements.opposingArrow.setAttribute("visible", simulation.opposingForceEnabled);

  if (!simulation.opposingForceEnabled) {
    return;
  }

  const shaftLength = 0.16 + getForceRatio(simulation.opposingForce) * 0.72;
  updateSolidArrow(elements.opposingArrowShaft, elements.opposingArrowHead, shaftLength, 0.07, 0.014);
  elements.opposingArrow.setAttribute("rotation", `0 ${BACKWARD_ROTATION_Y} 0`);
}

function updateResultArrow() {
  if (Math.abs(simulation.resultForce) <= RESULT_FORCE_EPSILON) {
    elements.resultArrow.setAttribute("visible", false);
    return;
  }

  const shaftLength = 0.12 + getForceRatio(Math.abs(simulation.resultForce)) * 0.78;
  updateSolidArrow(elements.resultArrowShaft, elements.resultArrowHead, shaftLength, 0.08, 0.018);
  elements.resultArrow.setAttribute("visible", true);
  elements.resultArrow.setAttribute(
    "rotation",
    `0 ${simulation.resultForce > 0 ? FORWARD_ROTATION_Y : BACKWARD_ROTATION_Y} 0`
  );
}

function updateVectorVisuals() {
  updateForceArrow();
  updateOpposingArrow();
  updateResultArrow();
}

function clearTrail() {
  while (elements.trailRoot.firstChild) {
    elements.trailRoot.removeChild(elements.trailRoot.firstChild);
  }
}

function addTrailPoint() {
  const point = document.createElement("a-sphere");
  point.setAttribute("radius", "0.025");
  point.setAttribute("position", {
    x: 0,
    y: 0.025,
    z: simulation.positionZ * VISUAL_POSITION_SCALE
  });
  point.setAttribute("material", "color: #64ffda; opacity: 0.72; transparent: true; emissive: #64ffda; emissiveIntensity: 0.2");
  elements.trailRoot.appendChild(point);

  while (elements.trailRoot.children.length > TRAIL_POINT_LIMIT) {
    elements.trailRoot.removeChild(elements.trailRoot.firstChild);
  }
}

function prepareCartModel() {
  const cartObject = elements.cart.getObject3D("mesh");

  if (!cartObject || !window.THREE) {
    return;
  }

  elements.cart.setAttribute("position", "0 -0.48 0");
  elements.cart.setAttribute("rotation", "0 0 0");
  elements.cart.setAttribute("scale", "0.45 0.45 0.45");

  cartObject.updateMatrixWorld(true);
  cartObject.traverse((child) => {
    child.frustumCulled = false;

    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.side = THREE.DoubleSide;
        material.needsUpdate = true;
      });
    }
  });

  elements.cart.setAttribute("visible", "true");
}

function waitForCartModel(attempt = 0) {
  if (elements.cart.getObject3D("mesh")) {
    prepareCartModel();
    return;
  }

  if (attempt < 40) {
    window.setTimeout(() => waitForCartModel(attempt + 1), 125);
  }
}

function formatNumber(value) {
  return Math.abs(value) < 0.005 ? "0.00" : value.toFixed(2);
}

function updateOpposingControlVisibility() {
  elements.opposingForceControl.classList.toggle("hidden", !simulation.opposingForceEnabled);
}

function updateOutputs() {
  const resultForceText = formatNumber(simulation.resultForce);
  const accelerationText = formatNumber(simulation.acceleration);

  elements.forceSliderValue.textContent = `${simulation.force} N`;
  elements.opposingForceSliderValue.textContent = `${simulation.opposingForce} N`;
  elements.massSliderValue.textContent = `${simulation.mass} kg`;
  elements.forceOutput.textContent = `${simulation.force} N`;
  elements.opposingForceOutput.textContent = simulation.opposingForceEnabled
    ? `${simulation.opposingForce} N`
    : "-";
  elements.massOutput.textContent = `${simulation.mass} kg`;
  elements.resultForceOutput.textContent = `${resultForceText} N`;
  elements.accelerationOutput.textContent = `${accelerationText} m/s^2`;

  const opposingLine = simulation.opposingForceEnabled
    ? `\nF2 = ${simulation.opposingForce} N`
    : "";

  elements.cartLabel.setAttribute(
    "value",
    `m = ${simulation.mass} kg\nF1 = ${simulation.force} N${opposingLine}\nF_resultan = ${resultForceText} N\na = ${accelerationText} m/s^2`
  );
}

function render() {
  calculateAcceleration();
  updateVectorVisuals();
  updateOutputs();
}

function resetMotion() {
  simulation.velocityZ = DEFAULT_VELOCITY;
  simulation.positionZ = DEFAULT_POSITION;
  simulation.trailDistance = 0;
  simulation.previousTime = null;
  clearTrail();
  updateCartPosition();
}

function resetSimulation() {
  simulation.force = DEFAULT_FORCE;
  simulation.opposingForce = DEFAULT_OPPOSING_FORCE;
  simulation.opposingForceEnabled = false;
  simulation.mass = DEFAULT_MASS;
  resetMotion();

  elements.forceSlider.value = DEFAULT_FORCE;
  elements.opposingForceSlider.value = DEFAULT_OPPOSING_FORCE;
  elements.opposingForceToggle.checked = false;
  elements.massSlider.value = DEFAULT_MASS;

  updateOpposingControlVisibility();
  render();
}

function animationLoop(currentTime) {
  requestAnimationFrame(animationLoop);

  render();

  if (!simulation.isPlaying) {
    simulation.previousTime = currentTime;
    return;
  }

  if (simulation.previousTime === null) {
    simulation.previousTime = currentTime;
    return;
  }

  const secondsSinceLastFrame = (currentTime - simulation.previousTime) / 1000;
  const deltaTime = Math.min(secondsSinceLastFrame, MAX_DELTA_TIME);
  simulation.previousTime = currentTime;

  setMarkerVisible(elements.hiroMarker.object3D.visible);

  if (!simulation.markerVisible) {
    return;
  }

  updatePhysics(deltaTime);
  updateCartPosition();
}

function bindEvents() {
  elements.cart.addEventListener("model-loaded", prepareCartModel);

  elements.cart.addEventListener("model-error", () => {
    elements.markerStatus.textContent = "Model gerobak gagal dimuat. Periksa file assets/tes2.glb.";
  });

  elements.forceSlider.addEventListener("input", () => {
    simulation.force = Number(elements.forceSlider.value);
    render();
  });

  elements.opposingForceSlider.addEventListener("input", () => {
    simulation.opposingForce = Number(elements.opposingForceSlider.value);
    render();
  });

  elements.opposingForceToggle.addEventListener("change", () => {
    simulation.opposingForceEnabled = elements.opposingForceToggle.checked;
    updateOpposingControlVisibility();
    render();
  });

  elements.massSlider.addEventListener("input", () => {
    simulation.mass = Number(elements.massSlider.value);
    render();
  });

  elements.playPauseButton.addEventListener("click", () => {
    simulation.isPlaying = !simulation.isPlaying;
    elements.playPauseButton.textContent = simulation.isPlaying ? "Pause" : "Play";
    simulation.previousTime = null;
  });

  elements.resetButton.addEventListener("click", resetSimulation);

  elements.hiroMarker.addEventListener("markerFound", () => {
    setMarkerVisible(true);
  });

  elements.hiroMarker.addEventListener("markerLost", () => {
    setMarkerVisible(false);
  });
}

bindEvents();
calculateAcceleration();
updateOpposingControlVisibility();
render();
waitForCartModel();
requestAnimationFrame(animationLoop);
