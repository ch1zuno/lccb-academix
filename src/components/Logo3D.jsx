/* Logo3D — the LCCB Academix brandmark as a real-time three.js object.
 * Style: toon/cel-shaded extruded block letters (navy caps, gold extrude sides)
 * with cartoon contour outlines (OutlineEffect). Letters pop in with a stagger,
 * then idle-bob, and the group tilts toward the pointer. Falls back to the flat
 * DOM mark when WebGL or the font is unavailable, or when motion is reduced.
 * Style references: three.js `webgl_materials_toon` + `webgl_geometry_text`. */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';

const GOLD = '#d4ac0d';
const OUTLINE_RGB = [0.06, 0.16, 0.26]; // LCCB navy

function bandTexture(steps) {
  /* Cel-gradient map: greys only — the material color supplies the hue. */
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((l, i) => { data.set([l, l, l, 255], i * 4); });
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export default function Logo3D({ className = '', fallback = null, text = 'LCCB' }) {
  const hostRef = useRef(null);
  const [useCanvas, setUseCanvas] = useState(true);

  useEffect(() => {
    if (!useCanvas) return undefined;
    const host = hostRef.current;
    if (!host) return undefined;

    let disposed = false;
    let cleanup = () => {};
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    (async () => {
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      } catch {
        setUseCanvas(false); // no WebGL → render the flat DOM mark instead
        return;
      }
      if (disposed) { renderer.dispose(); return; }

      const font = await new FontLoader().loadAsync('/fonts/helvetiker_bold.typeface.json').catch(() => null);
      if (!font || disposed || !host.isConnected) {
        renderer.dispose();
        if (!font) setUseCanvas(false);
        return;
      }

      const scene = new THREE.Scene();
      const aspect = host.clientWidth / host.clientHeight || 1;
      const camera = new THREE.PerspectiveCamera(26, aspect, 0.1, 40);

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const key = new THREE.DirectionalLight(0xfff2c9, 1.35); // slightly warm, gold-friendly
      key.position.set(-2.4, 3.4, 5);
      scene.add(key);

      const capTex = bandTexture([110, 255]); /* navy caps: two flat bands */
      const sideTex = bandTexture([80, 150, 255]); /* gold sides: three flat bands */
      const capMat = new THREE.MeshToonMaterial({ color: '#35597f', gradientMap: capTex });
      const sideMat = new THREE.MeshToonMaterial({ color: GOLD, gradientMap: sideTex });
      const outlineOf = (t) => ({ color: OUTLINE_RGB, alpha: 1, thickness: t });
      capMat.userData.outlineParameters = outlineOf(0.08);
      sideMat.userData.outlineParameters = outlineOf(0.05);

      /* One extruded mesh per letter, kerned by its measured advance. */
      const opts = { size: 1, depth: 0.34, bevelEnabled: true, bevelThickness: 0.055, bevelSize: 0.04, bevelSegments: 1, curveSegments: 5 };
      const GAP = 0.055;
      const letters = [];
      let cursor = 0;
      for (const ch of text) {
        const geo = new TextGeometry(ch, { font, ...opts });
        geo.computeBoundingBox();
        const w = geo.boundingBox.max.x - geo.boundingBox.min.x;
        geo.translate(-geo.boundingBox.min.x, 0, 0); // letter starts at x=0
        cursor += w + GAP;
        letters.push({ mesh: new THREE.Mesh(geo, [capMat, sideMat]), rest: cursor - w - GAP, w });
      }
      const rowWidth = cursor - GAP;
      const world = new THREE.Group();
      for (const l of letters) {
        l.mesh.position.x = -rowWidth / 2 + l.rest;
        world.add(l.mesh);
      }
      scene.add(world);
      world.position.x = 0.05; /* perspective yaw pushes mass left — re-center optically */
      world.rotation.x = -0.12; /* hint of the top surfaces */
      world.rotation.y = 0.16; /* hint of the gold extrude sides */

      /* Frame the row (letters still at scale 1). */
      const box = new THREE.Box3().setFromObject(world);
      const size = box.getSize(new THREE.Vector3());
      const vFov = (camera.fov * Math.PI) / 180;
      const halfH = size.y / 2 + 0.12;
      const halfW = size.x / 2 + 0.06;
      const zH = halfH / Math.tan(vFov / 2);
      const zW = halfW / (Math.tan(vFov / 2) * aspect);
      camera.position.set(0, size.y / 2, Math.max(zH, zW, size.z * 2 + 1.4));
      camera.lookAt(0, size.y / 2, 0);

      /* Outline pass, then shrink to size before the first frame. */
      const effect = new OutlineEffect(renderer, { defaultThickness: 0.006, defaultColor: OUTLINE_RGB });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      effect.setSize(host.clientWidth, host.clientHeight, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      host.appendChild(renderer.domElement);
      if (!reduceMotion) letters.forEach((l) => l.mesh.scale.setScalar(0.001));

      /* Animation: staggered pop-in, idle bob, pointer tilt. */
      const tilt = { x: 0, y: 0 };
      const target = { x: 0, y: 0 };
      const onMove = (e) => {
        const r = host.getBoundingClientRect();
        target.x = ((e.clientX - r.left) / r.width - 0.5) * 0.34;
        target.y = ((e.clientY - r.top) / r.height - 0.5) * -0.16;
      };
      const onLeave = () => { target.x = 0; target.y = 0; };
      if (!reduceMotion) {
        host.addEventListener('pointermove', onMove);
        host.addEventListener('pointerleave', onLeave);
      }

      const easeOut = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
      const clock = new THREE.Clock();
      let raf = 0;
      const tick = () => {
        const t = clock.getElapsedTime();
        tilt.x += (target.x - tilt.x) * 0.08;
        tilt.y += (target.y - tilt.y) * 0.08;
        letters.forEach((l, i) => {
          const born = t - i * 0.09;
          if (reduceMotion) {
            l.mesh.scale.setScalar(1);
          } else {
            /* spring: overshoot to 1.18, settle at 1 */
            const s = 1.18 * easeOut(born / 0.5) - 0.18 * easeOut((born - 0.16) / 0.5);
            l.mesh.scale.setScalar(Math.max(s, 0.001));
          }
          l.mesh.position.y = reduceMotion ? 0 : Math.sin(t * 1.7 + i * 0.85) * 0.032;
          l.mesh.rotation.z = reduceMotion ? 0 : Math.sin(t * 1.3 + i * 1.1) * 0.045;
        });
        world.rotation.y = 0.16 + tilt.x;
        world.rotation.x = -0.12 + tilt.y;
        effect.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      const resize = () => {
        if (!host.clientWidth || !host.clientHeight) return;
        camera.aspect = host.clientWidth / host.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(host.clientWidth, host.clientHeight, false);
        effect.setSize(host.clientWidth, host.clientHeight, false);
      };
      const ro = new ResizeObserver(resize);
      ro.observe(host);
      resize();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        host.removeEventListener('pointermove', onMove);
        host.removeEventListener('pointerleave', onLeave);
        letters.forEach((l) => l.mesh.geometry.dispose());
        capMat.dispose(); sideMat.dispose(); capTex.dispose(); sideTex.dispose();
        renderer.dispose();
        renderer.domElement?.remove();
      };
    })();

    return () => { disposed = true; cleanup(); };
  }, [useCanvas, text]);

  if (!useCanvas) return fallback;
  return <span ref={hostRef} className={className} data-logo3d={text} />;
}
