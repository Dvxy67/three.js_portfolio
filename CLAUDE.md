# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev    # Start Vite dev server (hot reload)
npm run build  # Build for production
```

## Architecture

This is a single-page portfolio website for Jean Ardaillou. All logic lives in two files:

- **`index.html`** — Contains all CSS (inline `<style>`), all HTML sections, and two inline `<script>` blocks for the custom cursor (rAF loop) and scroll reveal (IntersectionObserver). No external stylesheet.
- **`main.js`** — ES module loaded by Vite. Handles everything Three.js and GSAP:
  1. Sets up a `WebGLRenderer` on `#canvas` (fixed-position, `pointer-events: none`)
  2. Loads `./Project_43.glb` via `GLTFLoader`, normalizes its scale, makes all materials `transparent` for opacity animation
  3. After the model loads, calls `setupScrollAnimations()` which wires GSAP `ScrollTrigger` instances to a shared `state` object (`posX`, `posZ`, `scale`, `opacity`)
  4. The render loop (`animate()`) reads `state` each frame and applies values to the model — decoupling GSAP tweens from Three.js transforms

**Static assets** (`public/` or root): `Project_43.glb` (3D model), `foyer.png`, `dogitech.png`, `cv-jean-ardaillou.pdf`.

**Key dependencies**: `three` (WebGL renderer + GLTFLoader), `gsap` + `gsap/ScrollTrigger` (scroll-driven animation).

## Animation pattern

GSAP never directly touches Three.js objects during scroll. Instead it writes to the `state` proxy object, and the Three.js render loop applies those values every frame. This prevents conflicts between GSAP's timeline and Three.js's update cycle.

## Sections & scroll choreography

The 3D model moves across 5 scroll-triggered zones: Hero → About (right→left), About → Skills (left→right), Skills → Projects (right→center + scale down + fade), Projects → Contact (restore). Rotation is a single continuous tween across the entire `.content` scroll distance.
