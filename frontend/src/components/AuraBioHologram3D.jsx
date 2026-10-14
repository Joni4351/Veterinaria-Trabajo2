import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * AuraBioHologram3D
 * Modelado 3D interactivo en Three.js que representa el "Núcleo de Bio-Resonancia y Telemetría Molecular".
 * Cuenta con anillos giroscópicos orbitales, un icosaedro cuántico wireframe, partículas orbitales
 * y pulso vital interactivo rotable con el cursor/mouse.
 */
export default function AuraBioHologram3D() {
  const mountRef = useRef(null);
  const [activeFrequency, setActiveFrequency] = useState('432 Hz');
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 360;
    const height = mount.clientHeight || 340;

    // Escena, Cámara y Renderizador
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5.2;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      // Entornos sin soporte WebGL (como JSDOM en pruebas)
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    // Grupo principal para rotación global interactiva
    const hologramGroup = new THREE.Group();
    scene.add(hologramGroup);

    // 1. Núcleo Cuántico Central (Icosaedro Wireframe Bioluminiscente)
    const coreGeometry = new THREE.IcosahedronGeometry(1.2, 1);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f5a0,
      wireframe: true,
      transparent: true,
      opacity: 0.75,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    hologramGroup.add(coreMesh);

    // 2. Núcleo Interno Sólido Traslúcido
    const innerGeom = new THREE.OctahedronGeometry(0.7, 0);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      wireframe: false,
      transparent: true,
      opacity: 0.25,
    });
    const innerMesh = new THREE.Mesh(innerGeom, innerMat);
    hologramGroup.add(innerMesh);

    // 3. Anillos Giroscópicos Orbitales (Gimbal Rings)
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x05f2af,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const ring1Geom = new THREE.TorusGeometry(1.7, 0.02, 8, 64);
    const ring1 = new THREE.Mesh(ring1Geom, ringMat1);
    ring1.rotation.x = Math.PI / 4;
    hologramGroup.add(ring1);

    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const ring2Geom = new THREE.TorusGeometry(2.0, 0.015, 8, 64);
    const ring2 = new THREE.Mesh(ring2Geom, ringMat2);
    ring2.rotation.y = Math.PI / 3;
    hologramGroup.add(ring2);

    const ring3Geom = new THREE.TorusGeometry(2.25, 0.012, 8, 64);
    const ring3 = new THREE.Mesh(ring3Geom, ringMat1);
    ring3.rotation.z = Math.PI / 2.5;
    hologramGroup.add(ring3);

    // 4. Nube de Partículas Cuánticas Orbitantes
    const particlesCount = 180;
    const positions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      const radius = 1.8 + Math.random() * 0.9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.045,
      color: 0x5eead4,
      transparent: true,
      opacity: 0.85,
    });
    const particlePoints = new THREE.Points(particleGeometry, particleMaterial);
    hologramGroup.add(particlePoints);

    // Luz ambiental y puntual
    const pointLight = new THREE.PointLight(0x00f5a0, 2, 10);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Interacción con Ratón / Touch (Drag to Rotate)
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotXVelocity = 0;
    let rotYVelocity = 0;

    const handlePointerDown = (e) => {
      isDragging = true;
      setIsInteracting(true);
      prevMouseX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      prevMouseY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    };

    const handlePointerMove = (e) => {
      if (!isDragging) return;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      const deltaX = clientX - prevMouseX;
      const deltaY = clientY - prevMouseY;

      rotYVelocity = deltaX * 0.005;
      rotXVelocity = deltaY * 0.005;

      hologramGroup.rotation.y += rotYVelocity;
      hologramGroup.rotation.x += rotXVelocity;

      prevMouseX = clientX;
      prevMouseY = clientY;
    };

    const handlePointerUp = () => {
      isDragging = false;
      setTimeout(() => setIsInteracting(false), 800);
    };

    const dom = renderer.domElement;
    dom.style.cursor = 'grab';
    dom.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // Bucle de Animación
    let animationId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Rotaciones armónicas de anillos a frecuencias bio-acústicas
      ring1.rotation.x += 0.008;
      ring1.rotation.y += 0.006;
      ring2.rotation.y += 0.009;
      ring2.rotation.z += 0.005;
      ring3.rotation.z += 0.007;
      ring3.rotation.x -= 0.006;

      // Pulso vital (latido cardíaco bio-cuántico)
      const pulse = Math.sin(elapsedTime * 2.8) * 0.08 + 1;
      coreMesh.scale.set(pulse, pulse, pulse);
      innerMesh.scale.set(pulse * 0.9, pulse * 0.9, pulse * 0.9);
      particlePoints.rotation.y += 0.002;

      // Inercia suave si no se arrastra
      if (!isDragging) {
        hologramGroup.rotation.y += 0.004;
        hologramGroup.rotation.x += Math.sin(elapsedTime * 0.5) * 0.001;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Redimensionado responsivo
    const handleResize = () => {
      if (!mount) return;
      const newW = mount.clientWidth;
      const newH = mount.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      cancelAnimationFrame(animationId);

      // Limpieza de memoria WebGL
      coreGeometry.dispose();
      coreMaterial.dispose();
      innerGeom.dispose();
      innerMat.dispose();
      ring1Geom.dispose();
      ring2Geom.dispose();
      ring3Geom.dispose();
      ringMat1.dispose();
      ringMat2.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '380px',
        height: '340px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Indicador superior del modelo 3D */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '16px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.75rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: '#00f5a0',
          background: 'rgba(6, 16, 13, 0.75)',
          padding: '4px 10px',
          borderRadius: '999px',
          border: '1px solid rgba(0, 245, 160, 0.3)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#00f5a0',
            boxShadow: '0 0 8px #00f5a0',
            animation: 'pulse 1.5s infinite',
          }}
        />
        <span>MODELADO BIO-CUÁNTICO 3D</span>
      </div>

      {/* Contenedor Canvas WebGL */}
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      />

      {/* Control interactivo inferior */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.72rem',
          color: '#94a3b8',
          background: 'rgba(6, 16, 13, 0.8)',
          padding: '5px 14px',
          borderRadius: '999px',
          border: '1px solid rgba(45, 212, 191, 0.2)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span>
          {isInteracting ? '🔄 Rotando con Cursor' : '✨ Arrastra con el ratón para rotar'}
        </span>
        <span style={{ color: '#00f5a0', fontWeight: 600 }}>• 432 Hz Resonancia</span>
      </div>
    </div>
  );
}
