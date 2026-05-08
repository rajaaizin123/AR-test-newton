"use strict";

const DEFAULT_FORCE = 10;
const DEFAULT_MASS = 2;
const DEFAULT_THETA_DEG = 0;
const DEFAULT_VELOCITY = 0;
const DEFAULT_POSITION = 0;

const MAX_DISTANCE_FROM_MARKER = 3.4;
const VISUAL_POSITION_SCALE = 0.42;
const MAX_DELTA_TIME = 0.05;
const FORCE_MIN = 1;
const FORCE_MAX = 20;
const COMPONENT_MIN_VISIBLE_LENGTH = 0.04;
const TRAIL_POINT_LIMIT = 28;
const TRAIL_POINT_INTERVAL = 0.12;

const simulation = {
  force: DEFAULT_FORCE,
  mass: DEFAULT_MASS,
  thetaDeg: DEFAULT_THETA_DEG,
  thetaRad: 0,
  fx: DEFAULT_FORCE,
  fz: 0,
  ax: DEFAULT_FORCE / DEFAULT_MASS,
  az: 0,
  acceleration: DEFAULT_FORCE / DEFAULT_MASS,
  velocityX: DEFAULT_VELOCITY,
  velocityZ: DEFAULT_VELOCITY,
  positionX: DEFAULT_POSITION,
  positionZ: DEFAULT_POSITION,
  trailDistance: 0,
  isPlaying: true,
  markerVisible: false,
  previousTime: null
};

const elements = {
  forceSlider: document.getElementById("forceSlider"),
  massSlider: document.getElementById("massSlider"),
  thetaSlider: document.getElementById("thetaSlider"),
  forceSliderValue: document.getElementById("forceSliderValue"),
  massSliderValue: document.getElementById("massSliderValue"),
  thetaSliderValue: document.getElementById("thetaSliderValue"),
  forceOutput: document.getElementById("forceOutput"),
  massOutput: document.getElementById("massOutput"),
  thetaOutput: document.getElementById("thetaOutput"),
  fxOutput: document.getElementById("fxOutput"),
  fzOutput: document.getElementById("fzOutput"),
  axOutput: document.getElementById("axOutput"),
  azOutput: document.getElementById("azOutput"),
  accelerationOutput: document.getElementById("accelerationOutput"),
  playPauseButton: document.getElementById("playPauseButton"),
  resetButton: document.getElementById("resetButton"),
  markerStatus: document.getElementById("markerStatus"),
  cart: document.getElementById("cart"),
  cartRig: document.getElementById("cartRig"),
  forceArrow: document.getElementById("forceArrow"),
  forceArrowShaft: document.getElementById("forceArrowShaft"),
  forceArrowHead: document.getElementById("forceArrowHead"),
  fxArrow: document.getElementById("fxArrow"),
  fxArrowShaft: document.getElementById("fxArrowShaft"),
  fxArrowHead: document.getElementById("fxArrowHead"),
  fzArrow: document.getElementById("fzArrow"),
  fzArrowShaft: document.getElementById("fzArrowShaft"),
  fzArrowHead: document.getElementById("fzArrowHead"),
  accelerationArrow: document.getElementById("accelerationArrow"),
  accelerationArrowDash1: document.getElementById("accelerationArrowDash1"),
  accelerationArrowDash2: document.getElementById("accelerationArrowDash2"),
  accelerationArrowDash3: document.getElementById("accelerationArrowDash3"),
  accelerationArrowHead: document.getElementById("accelerationArrowHead"),
  trailRoot: document.getElementById("trailRoot"),
  cartLabel: document.getElementById("cartLabel"),
  arScene: document.getElementById("arScene"),
  hiroMarker: document.getElementById("hiroMarker")
};

function calculateAcceleration() {
  simulation.thetaRad = simulation.thetaDeg * Math.PI / 180;
  simulation.fx = simulation.force * Math.cos(simulation.thetaRad);
  simulation.fz = simulation.force * Math.sin(simulation.thetaRad);
  simulation.ax = simulation.fx / simulation.mass;
  simulation.az = simulation.fz / simulation.mass;
  simulation.acceleration = simulation.force / simulation.mass;
}

function updatePhysics(deltaTime) {
  calculateAcceleration();

  simulation.velocityX += simulation.ax * deltaTime;
  simulation.velocityZ += simulation.az * deltaTime;

  simulation.positionX += simulation.velocityX * deltaTime;
  simulation.positionZ += simulation.velocityZ * deltaTime;

  // Keep the cart close to the Hiro marker so students can keep seeing it.
  const distanceFromMarker = Math.hypot(simulation.positionX, simulation.positionZ);
  if (distanceFromMarker > MAX_DISTANCE_FROM_MARKER) {
    resetMotion();
    return;
  }

  simulation.trailDistance += Math.hypot(simulation.velocityX * deltaTime, simulation.velocityZ * deltaTime);
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
}

function setMarkerVisible(isVisible) {
  if (simulation.markerVisible === isVisible) {
    return;
  }

  simulation.markerVisible = isVisible;

  if (isVisible) {
    resetMotion();
  //  elements.markerStatus.textContent = "Hiro marker detected. Adjust force and mass to compare acceleration.";
    //elements.markerStatus.classList.add("detected");
  } else {
    //elements.markerStatus.textContent = "Scan the Hiro marker to view the AR simulation.";
   // elements.markerStatus.classList.remove("detected");
  }
}

function updateForceArrow() {
  const forceRatio = (simulation.force - FORCE_MIN) / (FORCE_MAX - FORCE_MIN);
  const shaftLength = 0.24 + forceRatio * 0.82;

  updateSolidArrow(elements.forceArrowShaft, elements.forceArrowHead, shaftLength, 0.11, 0.025);
  elements.forceArrow.setAttribute("rotation", `0 ${-simulation.thetaDeg} 0`);
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

function updateComponentArrow(groupElement, shaftElement, headElement, value, positiveRotation, negativeRotation) {
  const magnitudeRatio = Math.min(Math.abs(value) / FORCE_MAX, 1);
  const shaftLength = value === 0 ? COMPONENT_MIN_VISIBLE_LENGTH : 0.1 + magnitudeRatio * 0.62;

  updateSolidArrow(shaftElement, headElement, shaftLength, 0.07, 0.014);
  groupElement.setAttribute("rotation", `0 ${value >= 0 ? positiveRotation : negativeRotation} 0`);
  groupElement.setAttribute("visible", Math.abs(value) > 0.01);
}

function updateAccelerationArrow() {
  const forceRatio = (simulation.force - FORCE_MIN) / (FORCE_MAX - FORCE_MIN);
  const dashLength = 0.1 + forceRatio * 0.08;
  const gap = 0.08;
  const startOffset = 0.1;
  const dashes = [
    elements.accelerationArrowDash1,
    elements.accelerationArrowDash2,
    elements.accelerationArrowDash3
  ];

  dashes.forEach((dash, index) => {
    dash.setAttribute("geometry", {
      primitive: "cylinder",
      radius: 0.011,
      height: dashLength
    });
    dash.setAttribute("position", `${startOffset + index * (dashLength + gap) + dashLength / 2} 0 0`);
  });

  const headX = startOffset + dashes.length * dashLength + (dashes.length - 1) * gap + 0.06;
  elements.accelerationArrowHead.setAttribute("position", `${headX} 0 0`);
  elements.accelerationArrow.setAttribute("rotation", `0 ${-simulation.thetaDeg} 0`);
}

function updateVectorVisuals() {
  updateForceArrow();
  updateComponentArrow(elements.fxArrow, elements.fxArrowShaft, elements.fxArrowHead, simulation.fx, 0, 180);
  updateComponentArrow(elements.fzArrow, elements.fzArrowShaft, elements.fzArrowHead, simulation.fz, -90, 90);
  updateAccelerationArrow();
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

  const box = new THREE.Box3().setFromObject(cartObject);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  elements.cart.setAttribute("visible", "true");

  //elements.markerStatus.textContent =
   // `Cart loaded: size ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}, center ${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}.`;
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

function updateOutputs() {
  const accelerationText = simulation.acceleration.toFixed(2);
  const fxText = formatNumber(simulation.fx);
  const fzText = formatNumber(simulation.fz);
  const axText = formatNumber(simulation.ax);
  const azText = formatNumber(simulation.az);

  elements.forceSliderValue.textContent = `${simulation.force} N`;
  elements.massSliderValue.textContent = `${simulation.mass} kg`;
  elements.thetaSliderValue.textContent = `${simulation.thetaDeg}${String.fromCharCode(176)}`;
  elements.forceOutput.textContent = `${simulation.force} N`;
  elements.massOutput.textContent = `${simulation.mass} kg`;
  elements.thetaOutput.textContent = `${simulation.thetaDeg}${String.fromCharCode(176)}`;
  elements.fxOutput.textContent = `${fxText} N`;
  elements.fzOutput.textContent = `${fzText} N`;
  elements.axOutput.textContent = `${axText} m/s^2`;
  elements.azOutput.textContent = `${azText} m/s^2`;
  elements.accelerationOutput.textContent = `${accelerationText} m/s^2`;

  elements.cartLabel.setAttribute(
    "value",
    `F = ${simulation.force} N\nm = ${simulation.mass} kg\ntheta = ${simulation.thetaDeg} deg\nFx = ${fxText} N, Fz = ${fzText} N\na = ${accelerationText} m/s^2`
  );
}

function render() {
  updateVectorVisuals();
  updateOutputs();
}

function resetMotion() {
  simulation.velocityX = DEFAULT_VELOCITY;
  simulation.velocityZ = DEFAULT_VELOCITY;
  simulation.positionX = DEFAULT_POSITION;
  simulation.positionZ = DEFAULT_POSITION;
  simulation.trailDistance = 0;
  simulation.previousTime = null;
  clearTrail();
  updateCartPosition();
}

function resetSimulation() {
  simulation.force = DEFAULT_FORCE;
  simulation.mass = DEFAULT_MASS;
  simulation.thetaDeg = DEFAULT_THETA_DEG;
  resetMotion();

  elements.forceSlider.value = DEFAULT_FORCE;
  elements.massSlider.value = DEFAULT_MASS;
  elements.thetaSlider.value = DEFAULT_THETA_DEG;

  calculateAcceleration();
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

  /*
    Optional wheel rotation:
    If your GLB has separate wheel meshes, you can find them after the model loads
    and rotate each wheel based on simulation.velocity. The provided app moves the
    whole cart model because many classroom GLB assets have fixed wheels.
  */
}

function bindEvents() {
  elements.cart.addEventListener("model-loaded", prepareCartModel);

  elements.cart.addEventListener("model-error", () => {
    elements.markerStatus.textContent = "Cart model failed to load. Check assets/cart.glb.";
  });

  elements.forceSlider.addEventListener("input", () => {
    simulation.force = Number(elements.forceSlider.value);
    calculateAcceleration();
    render();
  });

  elements.massSlider.addEventListener("input", () => {
    simulation.mass = Number(elements.massSlider.value);
    calculateAcceleration();
    render();
  });

  elements.thetaSlider.addEventListener("input", () => {
    simulation.thetaDeg = Number(elements.thetaSlider.value);
    calculateAcceleration();
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
render();
waitForCartModel();
requestAnimationFrame(animationLoop);
