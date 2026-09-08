import { useEffect, useRef } from 'react';

const COLORS = ['#f6f0e4', '#e8c07a', '#d45b3c', '#f2d39a', '#fff8ec', '#c9784f'];

export default function Fireworks() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return undefined;

    const ctx = canvas.getContext('2d');
    const sparks = [];
    let frame = 0;
    let running = true;
    let lastBurst = 0;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function burst() {
      const x = canvas.width * (0.18 + Math.random() * 0.64);
      const y = canvas.height * (0.12 + Math.random() * 0.42);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const count = 36 + Math.floor(Math.random() * 20);
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = 1.6 + Math.random() * 3.8;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.01 + Math.random() * 0.014,
          color,
          size: 1.8 + Math.random() * 2.6,
        });
      }
    }

    function tick(now) {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (now - lastBurst > 280 || sparks.length < 18) {
        burst();
        lastBurst = now;
      }
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const spark = sparks[i];
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vy += 0.028;
        spark.life -= spark.decay;
        if (spark.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(spark.life, 0);
        ctx.fillStyle = spark.color;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      frame = window.requestAnimationFrame(tick);
    }

    resize();
    burst();
    burst();
    window.addEventListener('resize', resize);
    frame = window.requestAnimationFrame(tick);
    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas className="fireworks" ref={canvasRef} aria-hidden="true" />;
}
