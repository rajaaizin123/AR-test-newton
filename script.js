"use strict";

const DEFAULT_FORCE = 10;
const DEFAULT_MASS = 2;
const DEFAULT_VELOCITY = 0;
const DEFAULT_POSITION = 0;

const MAX_X_POSITION = 1.8;
const VISUAL_POSITION_SCALE = 0.32;
const MAX_DELTA_TIME = 0.05;
const FORCE_MIN = 1;
const FORCE_MAX = 20;

const simulation = {
  force: DEFAULT_FORCE,
  mass: DEFAULT_MASS,
  acceleration: DEFAULT_FORCE / DEFAULT_MASS,
  velocity: DEFAULT_VELOCITY,
  position: DEFAULT_POSITION,
  isPlaying: true,
  markerVisible: false,
  previousTime: null
};

const elements = {
  forceSlider: document.getElementById("forceSlider"),
  massSlider: document.getElementById("massSlider"),
  forceSliderValue: document.getElementById("forceSliderValue"),
  massSliderValue: document.getElementById("massSliderValue"),
  forceOutput: document.getElementById("forceOutput"),
  massOutput: document.getElementById("massOutput"),
  accelerationOutput: document.getElementById("accelerationOutput"),
  playPauseButton: document.getElementById("playPauseButton"),
  resetButton: document.getElementById("resetButton"),
  markerStatus: document.getElementById("markerStatus"),
  cart: document.getElementById("cart"),
  fallbackCart: document.getElementById("fallbackCart"),
  cartRig: document.getElementById("cartRig"),
  forceArrowShaft: document.getElementById("forceArrowShaft"),
  forceArrowHead: document.getElementById("forceArrowHead"),
  cartLabel: document.getElementById("cartLabel"),
  hiroMarker: document.getElementById("hiroMarker")
};

function calculateAcceleration() {
  // Newton's Second Law: F = m x a, so acceleration is force divided by mass.
  simulation.acceleration = simulation.force / simulation.mass;
}

function updatePhysics(deltaTime) {
  calculateAcceleration();

  // Velocity changes because acceleration acts over time.
  simulation.velocity += simulation.acceleration * deltaTime;

  // Position changes because velocity acts over time.
  simulation.position += simulation.velocity * deltaTime;

  // Keep the cart close to the Hiro marker so students can keep seeing it.
  if (simulation.position > MAX_X_POSITION) {
    simulation.position = DEFAULT_POSITION;
    simulation.velocity = DEFAULT_VELOCITY;
  }
}

function updateCartPosition() {
  elements.cartRig.setAttribute("position", {
    x: simulation.position * VISUAL_POSITION_SCALE,
    y: 0.04,
    z: 0
  });
}

function updateForceArrow() {
  const forceRatio = (simulation.force - FORCE_MIN) / (FORCE_MAX - FORCE_MIN);
  const shaftLength = 0.2 + forceRatio * 0.75;
  const shaftCenterX = 0.12 + shaftLength / 2;
  const headX = 0.12 + shaftLength + 0.09;

  elements.forceArrowShaft.setAttribute("geometry", {
    primitive: "cylinder",
    radius: 0.025,
    height: shaftLength
  });
  elements.forceArrowShaft.setAttribute("position", `${shaftCenterX} 0 0`);
  elements.forceArrowHead.setAttribute("position", `${headX} 0 0`);
}

function prepareCartModel() {
  const cartObject = elements.cart.getObject3D("mesh");

  if (!cartObject || !window.THREE) {
    return;
  }

  elements.cart.setAttribute("position", "0 0.02 0");
  elements.cart.setAttribute("rotation", "0 0 0");
  elements.cart.setAttribute("scale", "0.28 0.28 0.28");

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
  elements.fallbackCart.setAttribute("visible", "false");

  elements.markerStatus.textContent =
    `Cart loaded: size ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}, center ${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}.`;
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

function updateOutputs() {
  const accelerationText = simulation.acceleration.toFixed(2);

  elements.forceSliderValue.textContent = `${simulation.force} N`;
  elements.massSliderValue.textContent = `${simulation.mass} kg`;
  elements.forceOutput.textContent = `${simulation.force} N`;
  elements.massOutput.textContent = `${simulation.mass} kg`;
  elements.accelerationOutput.textContent = `${accelerationText} m/s^2`;

  elements.cartLabel.setAttribute(
    "value",
    `F = ${simulation.force} N\nm = ${simulation.mass} kg\na = ${accelerationText} m/s^2`
  );
}

function render() {
  updateCartPosition();
  updateForceArrow();
  updateOutputs();
}

function resetMotion() {
  simulation.velocity = DEFAULT_VELOCITY;
  simulation.position = DEFAULT_POSITION;
  simulation.previousTime = null;
}

function resetSimulation() {
  simulation.force = DEFAULT_FORCE;
  simulation.mass = DEFAULT_MASS;
  resetMotion();

  elements.forceSlider.value = DEFAULT_FORCE;
  elements.massSlider.value = DEFAULT_MASS;

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

  if (!simulation.markerVisible) {
    return;
  }

  updatePhysics(deltaTime);

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
    elements.fallbackCart.setAttribute("visible", "true");
    elements.markerStatus.textContent = "Cart model failed to load. The blue fallback cart is shown. Check assets/cart.glb.";
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

  elements.playPauseButton.addEventListener("click", () => {
    simulation.isPlaying = !simulation.isPlaying;
    elements.playPauseButton.textContent = simulation.isPlaying ? "Pause" : "Play";
    simulation.previousTime = null;
  });

  elements.resetButton.addEventListener("click", resetSimulation);

  elements.hiroMarker.addEventListener("markerFound", () => {
    simulation.markerVisible = true;
    resetMotion();
    elements.markerStatus.textContent = "Hiro marker detected. Adjust force and mass to compare acceleration.";
    elements.markerStatus.classList.add("detected");
  });

  elements.hiroMarker.addEventListener("markerLost", () => {
    simulation.markerVisible = false;
    elements.markerStatus.textContent = "Scan the Hiro marker to view the AR simulation.";
    elements.markerStatus.classList.remove("detected");
  });
}

bindEvents();
calculateAcceleration();
render();
waitForCartModel();
requestAnimationFrame(animationLoop);
