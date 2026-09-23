import { useEffect, useRef } from "react";
import * as THREE from "three";
import earthTextureUrl from "../../assets/textures/earth_atmos_2048.jpg";
import cloudsTextureUrl from "../../assets/textures/earth_clouds_1024.png";

// ─── Real 3D Rotating Earth Globe (Three.js) ──────────────────────────────
// Renders an actual textured, lit, rotating Earth sphere with a cloud layer
// and soft atmosphere glow, instead of a flat CSS approximation.
export default function Globe3D({ size = 210 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let animationId;
    let renderer, scene, camera, earthMesh, cloudMesh, glowMesh;

    // ── Scene / Camera ──────────────────────────────────────────────────
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 4.2;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // ── Lighting ─────────────────────────────────────────────────────────
    const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.5);
sunLight.position.set(5, 2, 5);
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0x0d5c48, 0.85);
scene.add(ambientLight);

    // ── Earth ────────────────────────────────────────────────────────────
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(earthTextureUrl);
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    const earthGeometry = new THREE.SphereGeometry(1.5, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
  map: earthTexture,
  shininess: 10,
  specular: new THREE.Color(0x1a4a3a),
  color: new THREE.Color(0x8fe0c4), // tints the photo toward the site's teal-green palette
});
    earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earthMesh);

    // ── Cloud layer ──────────────────────────────────────────────────────
    const cloudsTexture = textureLoader.load(cloudsTextureUrl);
    const cloudGeometry = new THREE.SphereGeometry(1.515, 64, 64);
    const cloudMaterial = new THREE.MeshLambertMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(cloudMesh);

    // ── Atmosphere glow (fresnel-style rim light via backside sphere) ────
    const glowGeometry = new THREE.SphereGeometry(1.62, 64, 64);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          gl_FragColor = vec4(0.15, 0.85, 0.75, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glowMesh);

    // Slight axial tilt, like the real Earth
    earthMesh.rotation.z = THREE.MathUtils.degToRad(23.4);
    cloudMesh.rotation.z = THREE.MathUtils.degToRad(23.4);

    // ── Animation loop ───────────────────────────────────────────────────
    const animate = () => {
      earthMesh.rotation.y += 0.0028;
      cloudMesh.rotation.y += 0.0042;
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    // ── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationId);
      earthGeometry.dispose();
      earthMaterial.dispose();
      cloudGeometry.dispose();
      cloudMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      earthTexture.dispose();
      cloudsTexture.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [size]);

  return (
    <div
      ref={mountRef}
      style={{
        width: size,
        height: size,
        position: "relative",
        zIndex: 10,
      }}
    />
  );
}
