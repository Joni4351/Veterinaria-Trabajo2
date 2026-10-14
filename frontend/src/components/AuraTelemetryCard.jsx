import React, { useEffect, useRef, useState } from 'react';
import { Activity, ShieldCheck, HeartPulse, Sparkles } from 'lucide-react';

/**
 * AuraTelemetryCard
 * Tarjeta de telemetría bio-cuántica en tiempo real con onda cardíaca animada (ECG),
 * métricas de oxigenación, frecuencia cardíaca y modulación acústica de estrés (432 Hz).
 * Inspirada fielmente en la interfaz AURA VET.
 */
export default function AuraTelemetryCard() {
  const canvasRef = useRef(null);
  const [heartRate, setHeartRate] = useState(78);
  const [oxygen, setOxygen] = useState(99);
  const [cortisol, setCortisol] = useState(2.1);

  // Animación del trazo ECG
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId;
    let width = (canvas.width = canvas.parentElement.clientWidth || 380);
    let height = (canvas.height = 70);

    let offset = 0;

    const drawECG = () => {
      ctx.clearRect(0, 0, width, height);

      // Línea base suave
      ctx.strokeStyle = 'rgba(0, 245, 160, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Trazo de pulso vital verde neón
      ctx.strokeStyle = '#00f5a0';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#00f5a0';
      ctx.shadowBlur = 10;
      ctx.beginPath();

      const step = 2;
      const waveLength = 160;

      for (let x = 0; x < width; x += step) {
        const relX = (x + offset) % waveLength;
        let y = height / 2;

        if (relX > 40 && relX < 45) {
          y -= 4; // Pequeña onda P
        } else if (relX >= 45 && relX < 50) {
          y += 5; // Onda Q
        } else if (relX >= 50 && relX < 56) {
          y -= 26; // Pico R alto
        } else if (relX >= 56 && relX < 62) {
          y += 12; // Onda S
        } else if (relX >= 75 && relX < 85) {
          y -= 8; // Onda T
        }

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      ctx.shadowBlur = 0;

      offset += 1.8;
      animationId = requestAnimationFrame(drawECG);
    };

    drawECG();

    // Fluctuación sutil en las métricas en tiempo real
    const interval = setInterval(() => {
      setHeartRate((prev) => 76 + Math.floor(Math.sin(Date.now() / 1500) * 4));
      setOxygen((prev) => 98 + Math.floor(Math.random() * 2));
      setCortisol((prev) => +(2.0 + Math.sin(Date.now() / 2500) * 0.3).toFixed(1));
    }, 2000);

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      style={{
        background: 'rgba(9, 21, 18, 0.85)',
        border: '1px solid rgba(0, 245, 160, 0.25)',
        borderRadius: '20px',
        padding: '22px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 40px -15px rgba(0, 245, 160, 0.15)',
        width: '100%',
        maxWidth: '440px',
        color: '#ffffff',
      }}
    >
      {/* Cabecera del Paciente Sincronizado */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(45, 212, 191, 0.15)',
          paddingBottom: '14px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'rgba(0, 245, 160, 0.15)',
              border: '1px solid rgba(0, 245, 160, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00f5a0',
            }}
          >
            <Activity size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Kira
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#04100c',
                  background: '#00f5a0',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  letterSpacing: '0.05em',
                }}
              >
                ACTIVO
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
              Husky Siberiano • 3 años • Chip Aura #9842
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: '#5eead4',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            TELEMETRÍA CUÁNTICA
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              justifyContent: 'flex-end',
              marginTop: '3px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#00f5a0',
                boxShadow: '0 0 8px #00f5a0',
              }}
            />
            <span style={{ fontSize: '0.76rem', color: '#00f5a0', fontWeight: 600 }}>
              Sincronizado
            </span>
          </div>
        </div>
      </div>

      {/* Trazo Cardíaco Bio-Espectral (Canvas ECG) */}
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            color: '#64748b',
            fontWeight: 600,
            letterSpacing: '0.05em',
            marginBottom: '4px',
          }}
        >
          <span>TRAZO CARDÍACO BIO-ESPECTRAL (CANAL I)</span>
          <span style={{ color: '#00f5a0' }}>78.4 HZ / SINUS</span>
        </div>
        <div
          style={{
            background: 'rgba(4, 10, 8, 0.6)',
            borderRadius: '12px',
            padding: '6px 10px',
            border: '1px solid rgba(0, 245, 160, 0.1)',
            overflow: 'hidden',
          }}
        >
          <canvas ref={canvasRef} style={{ width: '100%', height: '70px', display: 'block' }} />
        </div>
      </div>

      {/* Grid de 3 Métricas Vitales */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        {/* Frecuencia Cardíaca */}
        <div
          style={{
            background: 'rgba(12, 28, 24, 0.7)',
            padding: '10px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 245, 160, 0.12)',
          }}
        >
          <p style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
            Frec. Cardíaca
          </p>
          <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '2px 0' }}>
            {heartRate} <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>lpm</span>
          </p>
          <p style={{ fontSize: '0.68rem', color: '#00f5a0', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ● Óptimo
          </p>
        </div>

        {/* Oxigenación */}
        <div
          style={{
            background: 'rgba(12, 28, 24, 0.7)',
            padding: '10px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 245, 160, 0.12)',
          }}
        >
          <p style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
            Oxigenación
          </p>
          <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '2px 0' }}>
            {oxygen}% <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>SpO2</span>
          </p>
          <p style={{ fontSize: '0.68rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ● Saturación Plena
          </p>
        </div>

        {/* Cortisol / Estrés */}
        <div
          style={{
            background: 'rgba(12, 28, 24, 0.7)',
            padding: '10px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 245, 160, 0.12)',
          }}
        >
          <p style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
            Cortisol / Estrés
          </p>
          <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '2px 0' }}>
            {cortisol}% <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>Índice</span>
          </p>
          <p style={{ fontSize: '0.68rem', color: '#00f5a0', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ● Zero-Stress
          </p>
        </div>
      </div>

      {/* Footer de la Tarjeta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.72rem',
          color: '#94a3b8',
          borderTop: '1px solid rgba(45, 212, 191, 0.15)',
          paddingTop: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5eead4' }}>
          <Sparkles size={14} />
          <span>MODULACIÓN ACÚSTICA: 432 HZ ACTIVA</span>
        </div>
        <span style={{ color: '#00f5a0', fontWeight: 600 }}>Ver Telemetría Completa &gt;</span>
      </div>
    </div>
  );
}

