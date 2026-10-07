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
    const view = { w: window.innerWidth, h: window.innerHeight };
    let frame = 0;
    let resizeRaf = 0;
    let running = true;
    let lastBurst = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      view.w = window.innerWidth;
      view.h = window.innerHeight;
      canvas.width = Math.round(view.w * dpr);
      canvas.height = Math.round(view.h * dpr);
      canvas.style.width = `${view.w}px`;
      canvas.style.height = `${view.h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function burst() {
      const x = view.w * (0.18 + Math.random() * 0.64);
      const y = view.h * (0.12 + Math.random() * 0.42);
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
      ctx.clearRect(0, 0, view.w, view.h);
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
    const onResize = () => {
      if (resizeRaf) return;
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0;
        resize();
      });
    };
    window.addEventListener('resize', onResize);
    frame = window.requestAnimationFrame(tick);
    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas className="fireworks" ref={canvasRef} aria-hidden="true" />;
}
