import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Heart, Sparkles, Award, Stethoscope } from 'lucide-react';

/**
 * VeterinaryPet3D
 * Compañero canino 3D interactivo en Three.js.
 * Características únicas:
 * - Cabeza y mirada que siguen el cursor del ratón en tiempo real.
 * - Cola con animación de meneo alegre continuo.
 * - Collar veterinario con chapa médica.
 * - Botones interactivos: Acariciar (corazones), Dar Premio (hueso animado), Chequeo Clínico (escaneo vital).
 */
export default function VeterinaryPet3D() {
  const mountRef = useRef(null);
  const [petMood, setPetMood] = useState('¡Feliz de verte!');
  const [petHearts, setPetHearts] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const petActionRef = useRef({ action: 'idle', time: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 380;
    const height = mount.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'Modelo 3D interactivo de mascota canina de la clínica veterinaria');
    mount.appendChild(renderer.domElement);

    // Iluminación suave y cálida
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.2);
    dirLight.position.set(4, 8, 5);
    scene.add(dirLight);

    const fillLight = new THREE.PointLight(0xccfbf1, 0.8, 10);
    fillLight.position.set(-3, 2, 3);
    scene.add(fillLight);

    // Sombra suave en el suelo
    const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.15,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.05;
    scene.add(shadowMesh);

    // Grupo Maestro del Perrito
    const dog = new THREE.Group();
    scene.add(dog);

    // Materiales del perrito (Golden / Caramelo cálido)
    const furColor = 0xf59e0b;      // Dorado cálido
    const darkFurColor = 0xd97706;  // Sombra suave
    const lightFurColor = 0xfef3c7; // Blanco crema pecho/hocico
    const noseColor = 0x1e293b;     // Nariz oscura brillante
    const collarColor = 0x0d9488;   // Collar verde clínico
    const goldColor = 0xf59e0b;     // Plaquita dorada

    const furMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.65 });
    const darkFurMat = new THREE.MeshStandardMaterial({ color: darkFurColor, roughness: 0.7 });
    const muzzleMat = new THREE.MeshStandardMaterial({ color: lightFurColor, roughness: 0.6 });
    const noseMat = new THREE.MeshStandardMaterial({ color: noseColor, roughness: 0.2 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const collarMat = new THREE.MeshStandardMaterial({ color: collarColor, roughness: 0.3 });
    const goldMat = new THREE.MeshStandardMaterial({ color: goldColor, metalness: 0.7, roughness: 0.3 });

    // 1. Cuerpo sentado
    const bodyGeo = new THREE.CylinderGeometry(0.55, 0.72, 1.2, 16);
    const body = new THREE.Mesh(bodyGeo, furMat);
    body.position.set(0, -0.4, 0);
    body.rotation.x = 0.15;
    dog.add(body);

    // Pecho blanco suave
    const chestGeo = new THREE.SphereGeometry(0.48, 16, 16);
    const chest = new THREE.Mesh(chestGeo, muzzleMat);
    chest.position.set(0, -0.32, 0.35);
    chest.scale.set(0.7, 0.9, 0.5);
    dog.add(chest);

    // 2. Cuello y Collar
    const collarGeo = new THREE.TorusGeometry(0.5, 0.07, 12, 24);
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 0.28, 0.08);
    collar.rotation.x = Math.PI / 2.3;
    dog.add(collar);

    // Chapa veterinaria (Huesito / Placa)
    const medalGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16);
    const medal = new THREE.Mesh(medalGeo, goldMat);
    medal.position.set(0, 0.15, 0.55);
    medal.rotation.x = Math.PI / 3;
    dog.add(medal);

    // 3. Cabeza (Grupo rotatorio que sigue el ratón)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.55, 0.1);
    dog.add(headGroup);

    // Cráneo
    const headGeo = new THREE.SphereGeometry(0.62, 24, 24);
    const head = new THREE.Mesh(headGeo, furMat);
    headGroup.add(head);

    // Hocico
    const muzzleGeo = new THREE.SphereGeometry(0.32, 16, 16);
    const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzle.position.set(0, -0.12, 0.5);
    muzzle.scale.set(0.9, 0.75, 1.1);
    headGroup.add(muzzle);

    // Nariz
    const noseGeo = new THREE.SphereGeometry(0.1, 12, 12);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.06, 0.8);
    nose.scale.set(1.2, 0.9, 0.8);
    headGroup.add(nose);

    // Lengua juguetona
    const tongueGeo = new THREE.BoxGeometry(0.12, 0.03, 0.22);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, -0.22, 0.68);
    tongue.rotation.x = 0.3;
    headGroup.add(tongue);

    // Ojos vivos
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(x, 0.1, 0.52);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), eyeMat);
      eye.scale.set(0.9, 1, 0.5);
      eyeGroup.add(eye);

      // Brillo del ojo
      const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), eyeHighlightMat);
      highlight.position.set(x > 0 ? 0.03 : -0.03, 0.03, 0.07);
      eyeGroup.add(highlight);

      return eyeGroup;
    };
    headGroup.add(createEye(-0.25));
    headGroup.add(createEye(0.25));

    // Orejas caídas y suaves (Golden/Corgi)
    const createEar = (x, isLeft) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(x, 0.32, 0);

      const earGeo = new THREE.ConeGeometry(0.22, 0.65, 16);
      const ear = new THREE.Mesh(earGeo, darkFurMat);
      ear.position.set(0, -0.25, 0);
      ear.rotation.z = isLeft ? -0.4 : 0.4;
      ear.rotation.x = 0.2;
      ear.scale.set(1, 1, 0.45);
      earGroup.add(ear);

      return earGroup;
    };
    const leftEar = createEar(-0.48, true);
    const rightEar = createEar(0.48, false);
    headGroup.add(leftEar);
    headGroup.add(rightEar);

    // 4. Patitas delanteras
    const pawGeo = new THREE.CylinderGeometry(0.13, 0.16, 0.7, 12);
    const createPaw = (x) => {
      const paw = new THREE.Mesh(pawGeo, furMat);
      paw.position.set(x, -0.7, 0.42);
      paw.rotation.x = -0.15;

      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), muzzleMat);
      foot.position.set(0, -0.35, 0.08);
      foot.scale.set(1.1, 0.6, 1.3);
      paw.add(foot);

      return paw;
    };
    dog.add(createPaw(-0.28));
    dog.add(createPaw(0.28));

    // 5. Patitas traseras sentadas
    const hindLegGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const createHindLeg = (x) => {
      const hind = new THREE.Mesh(hindLegGeo, darkFurMat);
      hind.position.set(x, -0.65, -0.15);
      hind.scale.set(0.8, 1, 1.2);
      return hind;
    };
    dog.add(createHindLeg(-0.52));
    dog.add(createHindLeg(0.52));

    // 6. Cola con Meneo Alegre (Tail Wagging)
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, -0.65, -0.55);
    dog.add(tailGroup);

    const tailGeo = new THREE.CylinderGeometry(0.08, 0.14, 0.65, 12);
    const tail = new THREE.Mesh(tailGeo, furMat);
    tail.position.set(0, 0.3, -0.1);
    tail.rotation.x = -0.8;
    tailGroup.add(tail);

    // Anillo de escaneo médico (para chequeo 3D)
    const scanRingGeo = new THREE.TorusGeometry(1.2, 0.02, 12, 48);
    const scanRingMat = new THREE.MeshBasicMaterial({
      color: 0x0d9488,
      transparent: true,
      opacity: 0,
    });
    const scanRing = new THREE.Mesh(scanRingGeo, scanRingMat);
    scanRing.rotation.x = Math.PI / 2;
    dog.add(scanRing);

    // Seguimiento del Ratón (Mouse Tracking)
    const mousePos = { x: 0, y: 0 };
    const targetHeadRot = { x: 0, y: 0 };

    const handleMouseMove = (e) => {
      const rect = mount.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      mousePos.x = relX * 2;
      mousePos.y = relY * 2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Bucle de Animación
    let animationId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Respiración suave del cuerpo
      const breath = Math.sin(elapsed * 2.2) * 0.025;
      body.scale.set(1 + breath, 1 + breath, 1 + breath);

      // Meneado de cola alegre (Tail wagging)
      const wagSpeed = petActionRef.current.action === 'excited' ? 18 : 8;
      tailGroup.rotation.y = Math.sin(elapsed * wagSpeed) * 0.5;
      tailGroup.rotation.z = Math.cos(elapsed * (wagSpeed / 2)) * 0.15;

      // Movimiento de orejas sutil
      leftEar.rotation.z = -0.4 + Math.sin(elapsed * 3) * 0.05;
      rightEar.rotation.z = 0.4 - Math.sin(elapsed * 3) * 0.05;

      // La cabeza sigue el cursor del mouse con suavizado (Lerp)
      targetHeadRot.y = THREE.MathUtils.clamp(mousePos.x * 0.65, -0.65, 0.65);
      targetHeadRot.x = THREE.MathUtils.clamp(mousePos.y * 0.45, -0.35, 0.35);

      headGroup.rotation.y += (targetHeadRot.y - headGroup.rotation.y) * 0.08;
      headGroup.rotation.x += (targetHeadRot.x - headGroup.rotation.x) * 0.08;

      // Acción de Premio / Acariciar
      if (petActionRef.current.action === 'bounce') {
        const t = (elapsed - petActionRef.current.time) * 6;
        if (t < Math.PI * 2) {
          dog.position.y = Math.sin(t) * 0.18;
          headGroup.rotation.z = Math.sin(t * 2) * 0.15;
        } else {
          dog.position.y = 0;
          headGroup.rotation.z = 0;
          petActionRef.current.action = 'idle';
        }
      }

      // Animación de Escaneo Médico
      if (petActionRef.current.action === 'scan') {
        const scanT = (elapsed - petActionRef.current.time) * 2;
        if (scanT < 4) {
          scanRingMat.opacity = Math.sin(scanT * Math.PI) * 0.8;
          scanRing.position.y = -0.8 + (scanT % 2) * 0.9;
        } else {
          scanRingMat.opacity = 0;
          petActionRef.current.action = 'idle';
          setIsScanning(false);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Redimensionado
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
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);

      // Limpieza Three.js
      headGeo.dispose();
      bodyGeo.dispose();
      furMat.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Interacción 1: Acariciar al perrito
  const handlePet = () => {
    petActionRef.current = { action: 'bounce', time: performance.now() / 1000 };
    setPetMood('¡Mueve la colita alegremente! ❤️');
    const newHeart = { id: Date.now() + Math.random(), x: 30 + Math.random() * 40 };
    setPetHearts((prev) => [...prev.slice(-3), newHeart]);
    setTimeout(() => {
      setPetHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1400);
  };

  // Interacción 2: Dar premio
  const handleGiveTreat = () => {
    petActionRef.current = { action: 'excited', time: performance.now() / 1000 };
    setPetMood('¡Le encantó el premio! 🦴✨');
    setTimeout(() => {
      petActionRef.current.action = 'idle';
      setPetMood('¡Listo para el próximo paciente!');
    }, 2200);
  };

  // Interacción 3: Chequeo médico
  const handleScan = () => {
    setIsScanning(true);
    petActionRef.current = { action: 'scan', time: performance.now() / 1000 };
    setPetMood('🩺 Escaneo Clínico: Signos vitales 100% óptimos.');
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '420px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        padding: '1.5rem',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Badge Superior */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: '0.5rem',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#0f766e',
            background: '#ccfbf1',
            padding: '4px 12px',
            borderRadius: '999px',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#0d9488',
            }}
          />
          <span>Toby • Mascota de la Clínica (3D Interactivo)</span>
        </div>

        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
          Sigue tu cursor 👀
        </span>
      </div>

      {/* Corazones animados flotantes */}
      {petHearts.map((heart) => (
        <div
          key={heart.id}
          style={{
            position: 'absolute',
            left: `${heart.x}%`,
            top: '40%',
            color: '#ef4444',
            animation: 'floatUp 1.2s ease-out forwards',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          <Heart size={28} fill="#ef4444" />
        </div>
      ))}

      {/* Contenedor del Modelo 3D */}
      <div
        ref={mountRef}
        aria-hidden="true"
        style={{
          width: '100%',
          height: '270px',
          position: 'relative',
        }}
      />

      {/* Estado de ánimo dinámico */}
      <div
        style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: isScanning ? '#0f766e' : '#334155',
          background: isScanning ? '#f0fdfa' : '#f8fafc',
          border: `1px solid ${isScanning ? '#99f6e4' : '#e2e8f0'}`,
          padding: '6px 16px',
          borderRadius: '999px',
          marginBottom: '1rem',
          textAlign: 'center',
          width: '100%',
          transition: 'all 0.25s ease',
        }}
      >
        {petMood}
      </div>

      {/* Botones Interactivos de Acción */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          width: '100%',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={handlePet}
          className="btn btn-sm"
          style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: '999px',
            fontSize: '0.8rem',
            padding: '6px 14px',
            minHeight: '38px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          <Heart size={14} fill="#ef4444" color="#ef4444" />
          <span>Acariciar</span>
        </button>

        <button
          type="button"
          onClick={handleGiveTreat}
          className="btn btn-sm"
          style={{
            backgroundColor: '#fef3c7',
            color: '#b45309',
            border: '1px solid #fde68a',
            borderRadius: '999px',
            fontSize: '0.8rem',
            padding: '6px 14px',
            minHeight: '38px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          <Award size={14} color="#d97706" />
          <span>Dar Premio 🦴</span>
        </button>

        <button
          type="button"
          onClick={handleScan}
          className="btn btn-sm"
          style={{
            backgroundColor: '#ccfbf1',
            color: '#0f766e',
            border: '1px solid #99f6e4',
            borderRadius: '999px',
            fontSize: '0.8rem',
            padding: '6px 14px',
            minHeight: '38px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          <Stethoscope size={14} color="#0d9488" />
          <span>Chequeo Clínico</span>
        </button>
      </div>

      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(0.8); }
          50% { transform: translateY(-25px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-50px) scale(1); }
        }
      `}</style>
    </div>
  );
}

