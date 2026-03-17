import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ── Renderer ──────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

// ── Scène & Caméra ────────────────────────────────────────────────────────
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 6;

// ── Lumières ──────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xfff5e0, 1.2);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffe8c0, 0.8);
keyLight.position.set(4, 5, 4);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xc0ccff, 0.4);
fillLight.position.set(-5, -2, -3);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffeedd, 0.3);
rimLight.position.set(0, -5, -5);
scene.add(rimLight);

// ── État partagé pour les animations ──────────────────────────────────────
// On anime cet objet proxy, et on l'applique dans la boucle de rendu
const state = {
  posX:    1.5,   // position X de l'objet (droite = positif)
  posZ:    0,     // profondeur (recul pour la section projets)
  scale:   1,     // échelle relative (1 = taille normale)
  opacity: 1,     // opacité des matériaux
  lightIntensity: 1,
};

// ── Chargement du modèle GLB ──────────────────────────────────────────────
let model = null;
let normalScale = 1;
const materials = []; // on stocke tous les matériaux pour animer l'opacité

const loader = new GLTFLoader();
loader.load(
  './Project_43.glb',

  (gltf) => {
    model = gltf.scene;

    // Centrer et normaliser
    const box    = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    model.position.sub(center);
    normalScale = 2.2 / maxDim;
    model.scale.setScalar(normalScale);

    // Rendre tous les matériaux transparents pour pouvoir animer l'opacité
    model.traverse(child => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          mat.transparent = true;
          mat.opacity = 1;
          materials.push(mat);
        });
      }
    });

    scene.add(model);

    // Position X initiale (droite)
    model.position.x = state.posX;

    // ── Animation d'entrée ──
    model.scale.setScalar(0);
    gsap.to(model.scale, {
      x: normalScale, y: normalScale, z: normalScale,
      duration: 1.8,
      ease: 'elastic.out(1, 0.6)',
      delay: 0.3,
      onComplete: () => setupScrollAnimations(),
    });

    // Masquer le loader
    setTimeout(() => {
      document.getElementById('loader').classList.add('hidden');
    }, 1400);
  },

  undefined,

  (err) => {
    console.error('Erreur GLB :', err);
    document.getElementById('loader').classList.add('hidden');
  }
);

// ── Animations scroll ─────────────────────────────────────────────────────
function setupScrollAnimations() {

  // ── Rotation continue sur toute la page ──
  gsap.to(model.rotation, {
    y: Math.PI * 4,
    ease: 'none',
    scrollTrigger: {
      trigger: '.content',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.5,
    },
  });

  // ── HERO → ABOUT : droite → gauche ──
  ScrollTrigger.create({
    trigger: '.about',
    start: 'top 85%',
    end: 'top 15%',
    scrub: 1.8,
    onUpdate: (self) => {
      state.posX = gsap.utils.interpolate(1.5, -1.5, self.progress);
    },
  });

  // ── ABOUT → SKILLS : gauche → droite ──
  ScrollTrigger.create({
    trigger: '.skills',
    start: 'top 85%',
    end: 'top 15%',
    scrub: 1.8,
    onUpdate: (self) => {
      state.posX = gsap.utils.interpolate(-1.5, 1.5, self.progress);
    },
  });

  // ── SKILLS → PROJECTS : droite → centre + recul + fondu ──
  ScrollTrigger.create({
    trigger: '.projects',
    start: 'top 85%',
    end: 'top 30%',
    scrub: 1.8,
    onUpdate: (self) => {
      state.posX    = gsap.utils.interpolate(1.5, 0,    self.progress);
      state.posZ    = gsap.utils.interpolate(0,   -2.5, self.progress);
      state.scale   = gsap.utils.interpolate(1,   0.45, self.progress);
      state.opacity = gsap.utils.interpolate(1,   0.12, self.progress);
    },
  });

  // ── PROJECTS → CONTACT : retour droite + résurrection ──
  ScrollTrigger.create({
    trigger: '.contact',
    start: 'top 85%',
    end: 'top 15%',
    scrub: 1.8,
    onUpdate: (self) => {
      state.posX    = gsap.utils.interpolate(0,    1.5, self.progress);
      state.posZ    = gsap.utils.interpolate(-2.5, 0,   self.progress);
      state.scale   = gsap.utils.interpolate(0.45, 1,   self.progress);
      state.opacity = gsap.utils.interpolate(0.12, 1,   self.progress);
    },
  });

  // ── Oscillation verticale idle ──
  gsap.to(state, {
    // on anime juste une valeur pour l'offset Y
  });
  // Version directe sur l'objet pour le flottement
  gsap.to(model.position, {
    y: 0.12,
    duration: 3,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
}

// ── Boucle de rendu ───────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  // Appliquer l'état à l'objet en temps réel
  if (model) {
    model.position.x = state.posX;
    model.position.z = state.posZ;

    const s = normalScale * state.scale;
    model.scale.x = s;
    model.scale.y = s;
    model.scale.z = s;

    // Opacité sur tous les matériaux
    materials.forEach(mat => { mat.opacity = state.opacity; });
  }

  renderer.render(scene, camera);
}
animate();

// ── Resize ────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});