# AR Simulation of Newton's Second Law

Interactive marker-based WebAR simulation for:

```text
F = m x a
a = F / m
```

This project uses A-Frame 1.6.0 and AR.js 3.4.7.

## Folder Structure

```text
AR-newton-kiro/
├── index.html
├── style.css
├── script.js
└── assets/
    └── cart.glb
```

## Local Testing

Camera access works best from a local server.

```bash
python -m http.server 8080
```

Open:

```text
http://localhost:8080
```

On a phone, deploy with HTTPS first or use a local HTTPS tunnel. Mobile Chrome requires a secure context for camera access, except for `localhost`.

## Hiro Marker

The app uses the default AR.js Hiro marker. Print it or display it on another screen:

```text
https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png
```

Point the camera at the Hiro marker to show the cart, force arrow, and live formula label.

## Model Orientation

The cart moves toward positive X. The GLB flag is on the negative X side of the model, so the model rotation is set to `0 0 0` in `index.html` to keep the flag facing backward.

## GitHub Pages Deployment

1. Push this repository to GitHub.
2. Go to Settings > Pages.
3. Set the source to the main branch root.
4. Open the HTTPS Pages URL on mobile Chrome.

## QR Code Usage

After GitHub Pages is deployed, generate a QR code for the HTTPS URL. Students can scan the QR code to open the app, then scan the Hiro marker to view the AR simulation.

You can place both on one worksheet:

- QR code for the deployed app URL
- Hiro marker for AR tracking

## Physics Behavior

Every animation frame:

```text
acceleration = force / mass
velocity = velocity + acceleration * deltaTime
position = position + velocity * deltaTime
```

Increasing force makes the cart accelerate faster. Increasing mass lowers acceleration and makes the cart move more slowly for the same force.
