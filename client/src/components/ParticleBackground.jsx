import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ParticleBackground() {
  const canvasRef = useRef(null);
  const { theme }  = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // ── theme config ────────────────────────────────────────────────────────
    const isSolar  = theme === 'solar';
    const isMatrix = theme === 'matrix';
    const isOcean  = theme === 'ocean';

    const accentHex = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-1').trim() || '#7c3aed';

    // ── Stars ────────────────────────────────────────────────────────────────
    const NUM_STARS = isSolar ? 220 : isMatrix ? 0 : 120;
    const stars = Array.from({ length: NUM_STARS }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.008 + 0.003,
      color: isSolar
        ? `hsl(${40 + Math.random()*40},100%,${75+Math.random()*25}%)`
        : accentHex,
    }));

    // ── Matrix rain ──────────────────────────────────────────────────────────
    const cols = Math.floor(canvas.width / 18);
    const drops = Array.from({ length: cols }, () => Math.random() * -canvas.height);

    // ── Planets (solar only) ─────────────────────────────────────────────────
    const planets = isSolar ? [
      { x: canvas.width * 0.12, y: canvas.height * 0.22, r: 28, color: '#c0a060', ring: true,  speed: 0.00018 },
      { x: canvas.width * 0.80, y: canvas.height * 0.15, r: 18, color: '#7090d0', ring: false, speed: 0.00030 },
      { x: canvas.width * 0.88, y: canvas.height * 0.75, r: 12, color: '#d06040', ring: false, speed: 0.00045 },
      { x: canvas.width * 0.05, y: canvas.height * 0.80, r: 8,  color: '#80c0e0', ring: false, speed: 0.00060 },
    ] : [];

    // ── Shooting stars ───────────────────────────────────────────────────────
    const shoots = [];
    const addShoot = () => {
      if (shoots.length > 3) return;
      shoots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.5,
        len: 80 + Math.random() * 120,
        speed: 6 + Math.random() * 8,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.4,
        life: 1.0,
      });
    };

    // ── Ocean bubbles ────────────────────────────────────────────────────────
    const bubbles = isOcean ? Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * canvas.height,
      r: Math.random() * 5 + 2,
      speed: Math.random() * 0.4 + 0.2,
      phase: Math.random() * Math.PI * 2,
    })) : [];

    // ── Floating particles (cyber/dark/light/sunset) ─────────────────────────
    const NUM_P = isSolar || isMatrix || isOcean ? 0 : 70;
    const particles = Array.from({ length: NUM_P }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.4 + 0.4,
      phase: Math.random() * Math.PI * 2,
    }));

    let shootTimer = 0;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      const t = frame * 0.016;

      // ── draw stars / twinkle ──────────────────────────────────────────────
      stars.forEach(s => {
        s.phase += s.speed;
        const alpha = 0.35 + 0.55 * Math.abs(Math.sin(s.phase));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ── draw planets (solar) ──────────────────────────────────────────────
      planets.forEach(p => {
        // slow drift
        p.x += Math.sin(t * p.speed * 1000) * 0.08;
        p.y += Math.cos(t * p.speed * 900) * 0.05;

        // atmosphere glow
        const grd = ctx.createRadialGradient(p.x, p.y, p.r * 0.5, p.x, p.y, p.r * 2.2);
        grd.addColorStop(0, p.color + '60');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // planet body
        const bodyGrd = ctx.createRadialGradient(p.x - p.r*0.3, p.y - p.r*0.3, p.r*0.1, p.x, p.y, p.r);
        bodyGrd.addColorStop(0, lighten(p.color, 40));
        bodyGrd.addColorStop(1, darken(p.color, 40));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrd;
        ctx.fill();

        // ring
        if (p.ring) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(1, 0.35);
          ctx.beginPath();
          ctx.arc(0, 0, p.r * 1.85, 0, Math.PI * 2);
          ctx.strokeStyle = p.color + '88';
          ctx.lineWidth = 5;
          ctx.stroke();
          ctx.restore();
        }
      });

      // ── shooting stars ────────────────────────────────────────────────────
      if (isSolar || theme === 'cyber' || theme === 'dark') {
        shootTimer += 0.016;
        if (shootTimer > 3.5 + Math.random() * 4) { addShoot(); shootTimer = 0; }
        for (let i = shoots.length - 1; i >= 0; i--) {
          const s = shoots[i];
          s.x += Math.cos(s.angle) * s.speed;
          s.y += Math.sin(s.angle) * s.speed;
          s.life -= 0.025;
          if (s.life <= 0) { shoots.splice(i, 1); continue; }
          const ex = s.x - Math.cos(s.angle) * s.len;
          const ey = s.y - Math.sin(s.angle) * s.len;
          const grad = ctx.createLinearGradient(ex, ey, s.x, s.y);
          grad.addColorStop(0, 'transparent');
          grad.addColorStop(1, `rgba(255,255,255,${s.life * 0.9})`);
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(s.x, s.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // ── matrix rain ───────────────────────────────────────────────────────
      if (isMatrix) {
        ctx.fillStyle = 'rgba(0,8,0,0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00ff41';
        ctx.font = '14px JetBrains Mono, monospace';
        drops.forEach((y, i) => {
          const ch = String.fromCharCode(0x30a0 + Math.random() * 96);
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = `hsl(120, 100%, ${50 + Math.random()*30}%)`;
          ctx.fillText(ch, i * 18, y);
          drops[i] = y > canvas.height + Math.random() * 10000 ? 0 : y + 18;
        });
        ctx.globalAlpha = 1;
      }

      // ── ocean bubbles ─────────────────────────────────────────────────────
      bubbles.forEach(b => {
        b.y -= b.speed;
        b.x += Math.sin(t * 0.5 + b.phase) * 0.3;
        if (b.y < -20) { b.y = canvas.height + 20; b.x = Math.random() * canvas.width; }
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // ── particles + connection lines ──────────────────────────────────────
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.phase += 0.008;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        const alpha = 0.2 + 0.3 * Math.abs(Math.sin(p.phase));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = accentHex;
        ctx.shadowBlur = 4;
        ctx.shadowColor = accentHex;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // connection lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < 110) {
            ctx.save();
            ctx.globalAlpha = (1 - d/110) * 0.07;
            ctx.strokeStyle = accentHex;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [theme]);

  return <canvas ref={canvasRef} style={{ position:'fixed', top:0, left:0, pointerEvents:'none', zIndex:0 }} />;
}

// ── helpers ───────────────────────────────────────────────────────────────────
function lighten(hex, amt) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, (n>>16)+amt);
  const g = Math.min(255, ((n>>8)&0xff)+amt);
  const b = Math.min(255, (n&0xff)+amt);
  return `rgb(${r},${g},${b})`;
}
function darken(hex, amt) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.max(0, (n>>16)-amt);
  const g = Math.max(0, ((n>>8)&0xff)-amt);
  const b = Math.max(0, (n&0xff)-amt);
  return `rgb(${r},${g},${b})`;
}
