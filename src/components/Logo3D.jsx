/* Logo3D — the Academix brandmark as a real-time three.js object.
 * Style: toon/cel-shaded extruded block letters (navy caps, gold extrude sides)
 * with cartoon contour outlines (OutlineEffect) — three.js `webgl_materials_toon`
 * + `webgl_geometry_text`. The `rows` array stacks text lines top→down
 * ("LCCB" stamp above the dominant "ACADEMIX"). Letters pop in with a stagger,
 * idle-bob, and the block tilts toward the pointer. Falls back to the flat DOM
 * mark when WebGL or the font is unavailable, or when motion is reduced. */
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

export default function Logo3D({
  className = '',
  fallback = null,
  label = 'Academix by LCCB',
  rows = [{ text: 'LCCB', size: 0.34 }, { text: 'ACADEMIX', size: 1 }],
}) {
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

      scene.add(new THREE.AmbientLight(0xffffff, 0.32));
      const key = new THREE.DirectionalLight(0xfff2c9, 0.55); // solved for ~#1e3d5c front faces in sRGB
      key.position.set(-2.4, 3.4, 5);
      scene.add(key);

      const capTex = bandTexture([55, 255]); /* navy caps: two flat bands */
      const sideTex = bandTexture([80, 150, 255]); /* gold sides: three flat bands */
      const capMat = new THREE.MeshToonMaterial({ color: '#224366', gradientMap: capTex });
      const sideMat = new THREE.MeshToonMaterial({ color: GOLD, gradientMap: sideTex });
      const outlineOf = (t) => ({ color: OUTLINE_RGB, alpha: 1, thickness: t });
      capMat.userData.outlineParameters = outlineOf(0.08);
      sideMat.userData.outlineParameters = outlineOf(0.05);

      /* Build each row at its own scale, kerned by measured advances; the rows
       * stack top→down, left-aligned; every letter is its own mesh (stagger). */
      const V_GAP = 0.36;
      const rowsBuilt = [];
      const letters = [];
      for (const { text, size } of rows) {
        const opts = { size, depth: 0.34 * size, bevelEnabled: true, bevelThickness: 0.055 * size, bevelSize: 0.04 * size, bevelSegments: 1, curveSegments: 5 };
        const GAP = 0.05 * size;
        let cursor = 0;
        let minY = Infinity; let maxY = -Infinity; let endX = 0;
        for (const ch of text) {
          const geo = new TextGeometry(ch, { font, ...opts });
          geo.computeBoundingBox();
          const w = geo.boundingBox.max.x - geo.boundingBox.min.x;
          geo.translate(-geo.boundingBox.min.x, 0, 0); // letter starts at x=0
          const mesh = new THREE.Mesh(geo, [capMat, sideMat]);
          mesh.position.x = cursor;
          cursor += w + GAP;
          endX = mesh.position.x + w;
          letters.push({ mesh, baseY: 0 });
          minY = Math.min(minY, geo.boundingBox.min.y);
          maxY = Math.max(maxY, geo.boundingBox.max.y);
        }
        rowsBuilt.push({ meshLetters: letters.slice(letters.length - text.length), minY, maxY, endX });
      }

      /* Stack: row 0 highest; y decreases downward. */
      let yTop = 0;
      rowsBuilt.forEach((row, i) => {
        if (i > 0) yTop -= (rowsBuilt[i - 1].maxY - rowsBuilt[i - 1].minY) + V_GAP;
        const shift = yTop - row.maxY;
        row.meshLetters.forEach(({ mesh }) => { mesh.position.y = shift + mesh.position.y; });
        row.top = yTop;
        row.bottom = yTop + (row.minY - row.maxY); // yTop + negative height
      });

      /* Center the block on 0 — with an optical nudge, since the perspective
       * yaw lets the far letters shrink and pulls the mass left. */
      const top = rowsBuilt[0].top;
      const bottom = rowsBuilt[rowsBuilt.length - 1].bottom;
      const width = Math.max(...rowsBuilt.map((r) => r.endX));
      const centerY = (top + bottom) / 2;
      const world = new THREE.Group();
      letters.forEach((l) => {
        l.baseY = l.mesh.position.y;
        world.add(l.mesh);
      });
      world.position.set(-(width / 2) + 0.08, -centerY, 0);
      scene.add(world);
      world.rotation.x = -0.12; /* hint of the top surfaces */
      world.rotation.y = 0.16;  /* hint of the gold extrude sides */

      /* Frame the block (letters still at scale 1). */
      const vFov = (camera.fov * Math.PI) / 180;
      const halfH = (top - bottom) / 2 + 0.1;
      const halfW = width / 2 + 0.05;
      const zH = halfH / Math.tan(vFov / 2);
      const zW = halfW / (Math.tan(vFov / 2) * aspect);
      camera.position.set(0, 0.02, Math.max(zH, zW, 1.6));
      camera.lookAt(0, 0.02, 0);

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
        target.x = ((e.clientX - r.left) / r.width - 0.5) * 0.3;
        target.y = ((e.clientY - r.top) / r.height - 0.5) * -0.14;
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
          const born = t - i * 0.07;
          if (reduceMotion) {
            l.mesh.scale.setScalar(1);
          } else {
            /* spring: overshoot to 1.18, settle at 1 */
            const s = 1.18 * easeOut(born / 0.5) - 0.18 * easeOut((born - 0.16) / 0.5);
            l.mesh.scale.setScalar(Math.max(s, 0.001));
          }
          l.mesh.position.y = l.baseY + (reduceMotion ? 0 : Math.sin(t * 1.7 + i * 0.85) * 0.03);
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
  }, [useCanvas, JSON.stringify(rows)]);

  if (!useCanvas) return fallback;
  return (
    <span
      ref={hostRef}
      className={className}
      data-logo3d={label}
      role="img"
      aria-label={label}
    />
  );
}
