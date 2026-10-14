import React, { useEffect, useRef } from 'react';

/**
 * AuraParticleBackground
 * Fondo cinético suave y amigable con sutiles destellos y burbujas flotantes
 * en tonos suaves y relajantes (verde salvia, menta suave, ámbar cálido y celeste).
 * Agradable a la vista, no invasivo y respetuoso con la legibilidad del contenido.
 */
export default function AuraParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.getContext !== 'function') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const mouse = { x: null, y: null, radius: 120 };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Paleta suave, cálida y amigable para clínicas veterinarias
    const colors = [
      'rgba(13, 148, 136, 0.25)',  // Verde azulado clínico suave
      'rgba(16, 185, 129, 0.22)',  // Esmeralda suave
      'rgba(245, 158, 11, 0.20)',  // Ámbar miel cálido
      'rgba(56, 189, 248, 0.20)',  // Celeste cielo
      'rgba(99, 102, 241, 0.16)',  // Lavanda relajante
    ];

    const count = Math.min(45, Math.floor((width * height) / 22000));

    class Bubble {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = Math.random() * 8 + 4;
        this.speedY = -(Math.random() * 0.4 + 0.15); // Flotan suavemente hacia arriba
        this.speedX = (Math.random() - 0.5) * 0.25;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.alpha = Math.random() * 0.4 + 0.2;
        this.wobble = Math.random() * Math.PI * 2;
      }

      update() {
        this.y += this.speedY;
        this.wobble += 0.02;
        this.x += Math.sin(this.wobble) * 0.35 + this.speedX;

        // Si sube por arriba, reaparece abajo suavemente
        if (this.y < -20) {
          this.y = height + 20;
          this.x = Math.random() * width;
        }
        if (this.x < -20) this.x = width + 20;
        if (this.x > width + 20) this.x = -20;

        // Reacción suave con el mouse
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.hypot(dx, dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            this.x -= (dx / dist) * force * 1.5;
            this.y -= (dy / dist) * force * 1.5;
          }
        }
      }

      draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Pequeño reflejo de luz interior
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const bubbles = Array.from({ length: count }, () => new Bubble());

    let isRunning = true;
    const animate = () => {
      if (!isRunning) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < bubbles.length; i++) {
        bubbles[i].update();
        bubbles[i].draw();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      isRunning = false;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="aura-particles-canvas"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.85,
      }}
    />
  );
}
