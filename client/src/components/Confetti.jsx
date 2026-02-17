import { useEffect, useRef } from 'react';

export default function Confetti({ active, onComplete }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    const colors = ['#0071bc', '#02bfe7', '#2e8540', '#fdb81e'];
    const count = 80;
    const dpr = window.devicePixelRatio || 1;
    const particles = Array.from({ length: count }, () => {
      const size = Math.random() * 8 + 3;
      return {
        x: Math.random() * window.innerWidth,
        y: -Math.random() * window.innerHeight * 0.4,
        size,
        speed: Math.random() * 2.5 + 1,
        drift: (Math.random() - 0.5) * 2,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() > 0.45 ? 'square' : 'circle',
        opacity: 1,
      };
    });

    const mount = containerRef.current;
    if (!mount) return;
    mount.appendChild(canvas);

    const setSize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setSize();
    const resize = () => setSize();
    window.addEventListener('resize', resize);

    const start = performance.now();
    let raf = 0;
    const duration = 3000;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      context.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.y += particle.speed;
        particle.x += particle.drift;
        particle.rotation += particle.spin;
        particle.opacity = 1 - progress;

        if (particle.x > window.innerWidth + 20) particle.x = -20;
        if (particle.x < -20) particle.x = window.innerWidth + 20;
        if (particle.y > window.innerHeight + 40) particle.y = -20;

        context.save();
        context.globalAlpha = Math.max(0, particle.opacity);
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.fillStyle = particle.color;

        if (particle.shape === 'circle') {
          context.beginPath();
          context.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        }
        context.restore();
      });

      if (elapsed < duration) {
        raf = requestAnimationFrame(tick);
      } else {
        context.clearRect(0, 0, canvas.width, canvas.height);
        window.removeEventListener('resize', resize);
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        onComplete?.();
      }
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [active, onComplete]);

  return <div ref={containerRef} className="pointer-events-none fixed inset-0 z-[100]" />;
}
