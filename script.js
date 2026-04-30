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
const CART_TARGET_LENGTH = 1.15;

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
  arScene: document.getElementById("arScene"),
  hiroMarker: document.getElementById("hiroMarker")
};

function resizeArCanvas() {
  if (!elements.arScene || !elements.arScene.renderer || !elements.arScene.camera) {
    return;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  elements.arScene.renderer.setSize(width, height, false);
  elements.arScene.camera.aspect = width / height;
  elements.arScene.camera.updateProjectionMatrix();
}

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

function normalizeCartModel() {
  const cartObject = elements.cart.getObject3D("mesh");

  if (!cartObject || !window.THREE) {
    return;
  }

  elements.cart.setAttribute("scale", "1 1 1");
  elements.cart.setAttribute("position", "0 0 0");
  elements.cart.setAttribute("rotation", "0 0 0");
  elements.cart.setAttribute("visible", "true");

  cartObject.updateMatrixWorld(true);

  const firstBox = new THREE.Box3().setFromObject(cartObject);
  const firstSize = new THREE.Vector3();
  firstBox.getSize(firstSize);

  const longestHorizontalSide = Math.max(firstSize.x, firstSize.z);

  if (!Number.isFinite(longestHorizontalSide) || longestHorizontalSide === 0) {
    elements.markerStatus.textContent = "Cart model loaded, but its size could not be measured.";
    return;
  }

  const fittedScale = CART_TARGET_LENGTH / longestHorizontalSide;
  elements.cart.setAttribute("scale", `${fittedScale} ${fittedScale} ${fittedScale}`);

  cartObject.updateMatrixWorld(true);

  const fittedBox = new THREE.Box3().setFromObject(cartObject);
  const centerWorld = new THREE.Vector3();
  fittedBox.getCenter(centerWorld);

  const bottomCenterWorld = new THREE.Vector3(centerWorld.x, fittedBox.min.y, centerWorld.z);
  const parentObject = elements.cart.object3D.parent;
  const centerLocal = parentObject.worldToLocal(centerWorld.clone());
  const bottomCenterLocal = parentObject.worldToLocal(bottomCenterWorld.clone());

  // Center the GLB on the cart rig and place its lowest point on the marker plane.
  elements.cart.setAttribute("position", {
    x: -centerLocal.x,
    y: -bottomCenterLocal.y,
    z: -centerLocal.z
  });
  elements.cart.setAttribute("visible", "true");
  elements.fallbackCart.setAttribute("visible", "false");

  elements.markerStatus.textContent = "Cart model loaded. Scan the Hiro marker to view the AR simulation.";
}

function waitForCartModel(attempt = 0) {
  if (elements.cart.getObject3D("mesh")) {
    normalizeCartModel();
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
  render();

  /*
    Optional wheel rotation:
    If your GLB has separate wheel meshes, you can find them after the model loads
    and rotate each wheel based on simulation.velocity. The provided app moves the
    whole cart model because many classroom GLB assets have fixed wheels.
  */
}

function bindEvents() {
  window.addEventListener("resize", resizeArCanvas);
  window.addEventListener("orientationchange", () => {
    window.setTimeout(resizeArCanvas, 300);
  });

  elements.cart.addEventListener("model-loaded", normalizeCartModel);

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
resizeArCanvas();
requestAnimationFrame(animationLoop);
