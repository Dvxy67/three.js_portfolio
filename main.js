import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader }  from 'three/addons/loaders/RGBELoader.js';
import gsap            from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ── Renderer ──────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping      = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;

// ── Scène & Caméra ────────────────────────────────────────────────────────
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 6;

// ── Lumières ──────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xfff5e0, 1.0);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffe8c0, 0.9);
keyLight.position.set(4, 5, 4);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xc0ccff, 0.35);
fillLight.position.set(-5, -2, -3);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffeedd, 0.25);
rimLight.position.set(0, -5, -5);
scene.add(rimLight);

// ── Environment Map (réflexions premium) ──────────────────────────────────
// Pour activer : déposer un fichier .hdr dans le dossier
// (ex: studio_small_08_1k.hdr depuis polyhaven.com/hdris)
// puis décommenter les lignes ci-dessous.
//
// new RGBELoader().load('./studio_small.hdr', texture => {
//   const pmrem  = new THREE.PMREMGenerator(renderer);
//   const envMap = pmrem.fromEquirectangular(texture).texture;
//   scene.environment = envMap;
//   texture.dispose();
//   pmrem.dispose();
// });

// ── État scroll (animé par ScrollTrigger) ─────────────────────────────────
const state = {
  posX:    1.5,
  posZ:    0,
  scale:   1,
  opacity: 1,
};

// ── Interaction souris ────────────────────────────────────────────────────
const mouse = { x: 0, y: 0 };
// On ne met pas à jour directement — on lisse dans la boucle
const mouseLerp = { x: 0, y: 0 };

window.addEventListener('mousemove', e => {
  mouse.x =  (e.clientX / window.innerWidth  - 0.5) * 2;
  mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
});

// ── Raycaster (hover glow doré) ───────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouseVec  = new THREE.Vector2();
let hoveredMesh = null;
const GOLD_EMISSIVE  = new THREE.Color(0xc9963a);
const BLACK_EMISSIVE = new THREE.Color(0x000000);

window.addEventListener('mousemove', e => {
  mouseVec.x =  (e.clientX / window.innerWidth ) * 2 - 1;
  mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// ── Chargement du modèle GLB ──────────────────────────────────────────────
let model       = null;
let normalScale = 1;
const materials = [];

const loader = new GLTFLoader();
loader.load(
  './Project_43.glb',

  gltf => {
    model = gltf.scene;

    // Centrer & normaliser
    const box    = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    model.position.sub(center);
    normalScale = 2.2 / maxDim;
    model.scale.setScalar(normalScale);

    // Matériaux transparents pour l'opacité scroll
    model.traverse(child => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          mat.transparent = true;
          mat.opacity     = 1;
          // Activer emissive pour le raycaster hover
          if (!mat.emissive) mat.emissive = BLACK_EMISSIVE.clone();
          materials.push(mat);
        });
      }
    });

    scene.add(model);
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

    // Cacher le loader
    setTimeout(() => {
      document.getElementById('loader').classList.add('hidden');
    }, 1400);
  },

  undefined,

  err => {
    console.error('Erreur chargement GLB :', err);
    document.getElementById('loader').classList.add('hidden');
  }
);

// ── Animations scroll ─────────────────────────────────────────────────────
function setupScrollAnimations() {

  // Rotation continue sur toute la page
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

  // HERO → ABOUT : droite → gauche
  ScrollTrigger.create({
    trigger: '.about',
    start: 'top 85%',
    end: 'top 15%',
    scrub: 1.8,
    onUpdate: self => {
      state.posX = gsap.utils.interpolate(1.5, -1.5, self.progress);
    },
  });

  // ABOUT → EXPERIENCE : gauche → droite
  ScrollTrigger.create({
    trigger: '.experience',
    start: 'top 85%',
    end: 'top 15%',
    scrub: 1.8,
    onUpdate: self => {
      state.posX = gsap.utils.interpolate(-1.5, 1.5, self.progress);
    },
  });

  // EXPERIENCE → SKILLS : droite → gauche
  ScrollTrigger.create({
    trigger: '.skills',
    start: 'top 85%',
    end: 'top 15%',
    scrub: 1.8,
    onUpdate: self => {
      state.posX = gsap.utils.interpolate(1.5, -1.5, self.progress);
    },
  });

  // SKILLS → PROJECTS : gauche → centre + recul + fondu
  ScrollTrigger.create({
    trigger: '.projects',
    start: 'top 85%',
    end: 'top 30%',
    scrub: 1.8,
    onUpdate: self => {
      state.posX    = gsap.utils.interpolate(-1.5, 0,    self.progress);
      state.posZ    = gsap.utils.interpolate(0,   -2.5, self.progress);
      state.scale   = gsap.utils.interpolate(1,   0.45, self.progress);
      state.opacity = gsap.utils.interpolate(1,   0.10, self.progress);
    },
  });

  // PROJECTS → CONTACT : retour droite + résurrection
  ScrollTrigger.create({
    trigger: '.contact',
    start: 'top 85%',
    end: 'top 15%',
    scrub: 1.8,
    onUpdate: self => {
      state.posX    = gsap.utils.interpolate(0,    1.5, self.progress);
      state.posZ    = gsap.utils.interpolate(-2.5, 0,   self.progress);
      state.scale   = gsap.utils.interpolate(0.45, 1,   self.progress);
      state.opacity = gsap.utils.interpolate(0.10, 1,   self.progress);
    },
  });

  // Flottement vertical idle
  gsap.to(model.position, {
    y: 0.12,
    duration: 3,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });

  // Rafraîchir les positions ScrollTrigger après setup complet
  ScrollTrigger.refresh();
}

// ── Boucle de rendu ───────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  if (model) {
    // ── Appliquer l'état scroll ──
    model.position.x = state.posX;
    model.position.z = state.posZ;

    const s = normalScale * state.scale;
    model.scale.x = s;
    model.scale.y = s;
    model.scale.z = s;

    materials.forEach(mat => { mat.opacity = state.opacity; });

    // ── Parallax souris (lerp → fluide) ──
    // On lisse la position de la souris pour éviter les à-coups
    mouseLerp.x += (mouse.x - mouseLerp.x) * 0.04;
    mouseLerp.y += (mouse.y - mouseLerp.y) * 0.04;

    // Ajouter un offset de rotation basé sur la souris
    // Sans toucher à model.rotation.y (géré par GSAP scroll)
    // On utilise rotation.x et un décalage de groupe
    model.rotation.x += (mouseLerp.y * 0.15 - model.rotation.x) * 0.05;
    // Pour X : on influence doucement sans override
    // (La rotation Y de GSAP continue de fonctionner en parallèle)

    // ── Raycaster hover glow ──
    raycaster.setFromCamera(mouseVec, camera);
    const hits = raycaster.intersectObjects(model.children, true);

    if (hits.length > 0) {
      const mesh = hits[0].object;
      if (mesh !== hoveredMesh) {
        // Désactiver l'ancien
        if (hoveredMesh && hoveredMesh.material && hoveredMesh.material.emissive) {
          gsap.to(hoveredMesh.material.emissive, {
            r: 0, g: 0, b: 0,
            duration: 0.3,
          });
          gsap.to(hoveredMesh.material, { emissiveIntensity: 0, duration: 0.3 });
        }
        hoveredMesh = mesh;
        // Activer le nouveau
        if (mesh.material && mesh.material.emissive) {
          gsap.to(mesh.material.emissive, {
            r: GOLD_EMISSIVE.r,
            g: GOLD_EMISSIVE.g,
            b: GOLD_EMISSIVE.b,
            duration: 0.4,
          });
          gsap.to(mesh.material, { emissiveIntensity: 0.2, duration: 0.4 });
        }
      }
    } else if (hoveredMesh) {
      if (hoveredMesh.material && hoveredMesh.material.emissive) {
        gsap.to(hoveredMesh.material.emissive, {
          r: 0, g: 0, b: 0,
          duration: 0.5,
        });
        gsap.to(hoveredMesh.material, { emissiveIntensity: 0, duration: 0.5 });
      }
      hoveredMesh = null;
    }
  }

  renderer.render(scene, camera);
}
animate();

// ── Resize ────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2));
  ScrollTrigger.refresh();
});