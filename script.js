"use strict";

const DEFAULT_FORCE = 10;
const DEFAULT_OPPOSING_FORCE = 5;
const DEFAULT_MASS = 2;
const DEFAULT_DIRECTION_DEG = 0;
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
  directionDeg: DEFAULT_DIRECTION_DEG,
  resultForce: DEFAULT_FORCE,
  acceleration: DEFAULT_FORCE / DEFAULT_MASS,
  velocity: DEFAULT_VELOCITY,
  positionX: DEFAULT_POSITION,
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
  directionSlider: document.getElementById("directionSlider"),
  forceSliderValue: document.getElementById("forceSliderValue"),
  opposingForceSliderValue: document.getElementById("opposingForceSliderValue"),
  massSliderValue: document.getElementById("massSliderValue"),
  directionSliderValue: document.getElementById("directionSliderValue"),
  forceOutput: document.getElementById("forceOutput"),
  opposingForceOutput: document.getElementById("opposingForceOutput"),
  resultForceOutput: document.getElementById("resultForceOutput"),
  massOutput: document.getElementById("massOutput"),
  directionOutput: document.getElementById("directionOutput"),
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

function getDirectionVector() {
  const directionRad = simulation.directionDeg * Math.PI / 180;

  return {
    x: Math.sin(directionRad),
    z: Math.cos(directionRad)
  };
}

function updatePhysics(deltaTime) {
  calculateAcceleration();

  const direction = getDirectionVector();

  simulation.velocity += simulation.acceleration * deltaTime;
  simulation.positionX += direction.x * simulation.velocity * deltaTime;
  simulation.positionZ += direction.z * simulation.velocity * deltaTime;

  // Keep the cart close to the Hiro marker so students can keep seeing it.
  if (Math.hypot(simulation.positionX, simulation.positionZ) > MAX_DISTANCE_FROM_MARKER) {
    resetMotion();
    return;
  }

  simulation.trailDistance += Math.abs(simulation.velocity * deltaTime);
  if (simulation.trailDistance >= TRAIL_POINT_INTERVAL) {
    simulation.trailDistance = 0;
    addTrailPoint();
  }
}

function updateCartPosition() {
  elements.cartRig.setAttribute("position", {
    x: simulation.positionX * VISUAL_POSITION_SCALE,
    y: 0.04,
    z: simulation.positionZ * VISUAL_POSITION_SCALE
  });
  elements.cartRig.setAttribute("rotation", `0 ${simulation.directionDeg} 0`);
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
    x: simulation.positionX * VISUAL_POSITION_SCALE,
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

function getDirectionName(degrees) {
  if (degrees === 0 || degrees === 360) {
    return "Depan";
  }

  if (degrees === 90) {
    return "Kanan";
  }

  if (degrees === 180) {
    return "Belakang";
  }

  if (degrees === 270) {
    return "Kiri";
  }

  return "Miring";
}

function updateOpposingControlVisibility() {
  elements.opposingForceControl.classList.toggle("hidden", !simulation.opposingForceEnabled);
}

function updateOutputs() {
  const resultForceText = formatNumber(simulation.resultForce);
  const accelerationText = formatNumber(simulation.acceleration);
  const directionText = `${simulation.directionDeg} deg ${getDirectionName(simulation.directionDeg)}`;

  elements.forceSliderValue.textContent = `${simulation.force} N`;
  elements.opposingForceSliderValue.textContent = `${simulation.opposingForce} N`;
  elements.massSliderValue.textContent = `${simulation.mass} kg`;
  elements.directionSliderValue.textContent = directionText;
  elements.forceOutput.textContent = `${simulation.force} N`;
  elements.opposingForceOutput.textContent = simulation.opposingForceEnabled
    ? `${simulation.opposingForce} N`
    : "-";
  elements.massOutput.textContent = `${simulation.mass} kg`;
  elements.resultForceOutput.textContent = `${resultForceText} N`;
  elements.directionOutput.textContent = directionText;
  elements.accelerationOutput.textContent = `${accelerationText} m/s^2`;

  const opposingLine = simulation.opposingForceEnabled
    ? `\nF2 = ${simulation.opposingForce} N`
    : "";

  elements.cartLabel.setAttribute(
    "value",
    `m = ${simulation.mass} kg\nF1 = ${simulation.force} N${opposingLine}\nF_resultan = ${resultForceText} N\narah = ${directionText}\na = ${accelerationText} m/s^2`
  );
}

function render() {
  calculateAcceleration();
  updateCartPosition();
  updateVectorVisuals();
  updateOutputs();
}

function resetMotion() {
  simulation.velocity = DEFAULT_VELOCITY;
  simulation.positionX = DEFAULT_POSITION;
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
  simulation.directionDeg = DEFAULT_DIRECTION_DEG;
  resetMotion();

  elements.forceSlider.value = DEFAULT_FORCE;
  elements.opposingForceSlider.value = DEFAULT_OPPOSING_FORCE;
  elements.opposingForceToggle.checked = false;
  elements.massSlider.value = DEFAULT_MASS;
  elements.directionSlider.value = DEFAULT_DIRECTION_DEG;

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

  elements.directionSlider.addEventListener("input", () => {
    simulation.directionDeg = Number(elements.directionSlider.value);
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
