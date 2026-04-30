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
  cameraPermissionPanel: document.getElementById("cameraPermissionPanel"),
  cameraPermissionText: document.getElementById("cameraPermissionText"),
  startCameraButton: document.getElementById("startCameraButton"),
  playPauseButton: document.getElementById("playPauseButton"),
  resetButton: document.getElementById("resetButton"),
  markerStatus: document.getElementById("markerStatus"),
  cart: document.getElementById("cart"),
  cartRig: document.getElementById("cartRig"),
  forceArrowShaft: document.getElementById("forceArrowShaft"),
  forceArrowHead: document.getElementById("forceArrowHead"),
  cartLabel: document.getElementById("cartLabel"),
  arScene: document.getElementById("arScene"),
  hiroMarker: document.getElementById("hiroMarker")
};

function isLocalhost() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function updateCameraPermissionMessage(message, keepPanelOpen = true) {
  elements.cameraPermissionText.textContent = message;
  elements.cameraPermissionPanel.classList.toggle("hidden", !keepPanelOpen);
}

async function requestCameraPermission() {
  if (!window.isSecureContext && !isLocalhost()) {
    updateCameraPermissionMessage(
      "Camera is blocked because this page is not HTTPS. Use GitHub Pages HTTPS, localhost, or an HTTPS tunnel."
    );
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    updateCameraPermissionMessage("This browser does not expose camera access through getUserMedia.");
    return;
  }

  try {
    updateCameraPermissionMessage("Requesting camera permission...");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" }
      }
    });

    stream.getTracks().forEach((track) => track.stop());
    updateCameraPermissionMessage("Camera permission is allowed. If AR does not start, refresh this page once.");
  } catch (error) {
    updateCameraPermissionMessage(`Camera permission failed: ${error.name}. Check browser site settings.`);
  }
}

async function initializeCameraPermissionPanel() {
  if (!window.isSecureContext && !isLocalhost()) {
    updateCameraPermissionMessage(
      "Camera prompt will not appear on insecure HTTP. Open this from https:// or http://localhost."
    );
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    updateCameraPermissionMessage("Camera API is not available in this browser.");
    return;
  }

  if (navigator.permissions && navigator.permissions.query) {
    try {
      const permission = await navigator.permissions.query({ name: "camera" });

      if (permission.state === "granted") {
        updateCameraPermissionMessage("Camera permission is already allowed. Scan the Hiro marker.");
      } else if (permission.state === "denied") {
        updateCameraPermissionMessage("Camera permission is blocked. Open browser site settings and allow camera.");
      } else {
        updateCameraPermissionMessage("Tap Start Camera if the browser permission prompt does not appear automatically.");
      }

      permission.addEventListener("change", initializeCameraPermissionPanel);
      return;
    } catch (error) {
      // Some browsers do not support querying camera permission by name.
    }
  }

  updateCameraPermissionMessage("Tap Start Camera if the browser permission prompt does not appear automatically.");
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
  elements.startCameraButton.addEventListener("click", requestCameraPermission);

  elements.arScene.addEventListener("loaded", () => {
    if (elements.cameraPermissionText.textContent === "Checking camera permission...") {
      updateCameraPermissionMessage("A-Frame scene loaded. Waiting for camera permission...");
    }
  });

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
initializeCameraPermissionPanel();
calculateAcceleration();
render();
waitForCartModel();
requestAnimationFrame(animationLoop);
