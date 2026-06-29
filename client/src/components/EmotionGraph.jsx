import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * Feature 9: Real-Time Emotion Graph
 * Displays emotion score history as a live line chart
 * Score range: -1 (very negative) to +1 (very positive)
 */
export default function EmotionGraph({ history = [], accentColor = '#7c3aed' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || history.length < 2) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pad = 20;

    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    // Zero line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.setLineDash([4, 4]);
    ctx.moveTo(pad, H/2);
    ctx.lineTo(W-pad, H/2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Plot emotion scores
    const pts = history.slice(-15); // last 15 points
    const stepX = (W - pad*2) / Math.max(pts.length-1, 1);

    // Gradient fill under line
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, accentColor + '44');
    grad.addColorStop(1, accentColor + '00');

    ctx.beginPath();
    pts.forEach((pt, i) => {
      const x = pad + i * stepX;
      const y = H/2 - (pt.score * (H/2 - pad));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    // Close path for fill
    const lastX = pad + (pts.length-1)*stepX;
    ctx.lineTo(lastX, H/2);
    ctx.lineTo(pad, H/2);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    pts.forEach((pt, i) => {
      const x = pad + i * stepX;
      const y = H/2 - (pt.score * (H/2 - pad));
      if (i===0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw dots at each point
    pts.forEach((pt, i) => {
      const x = pad + i * stepX;
      const y = H/2 - (pt.score * (H/2 - pad));
      const dotColor = pt.score>=0 ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI*2);
      ctx.fillStyle = dotColor;
      ctx.fill();
      ctx.strokeStyle = 'var(--bg-card, #1a1a2e)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

  }, [history, accentColor]);

  const latest    = history[history.length-1];
  const score     = latest?.score || 0;
  const emotions  = latest?.emotions || ['neutral'];
  const scoreColor= score>0.3?'#22c55e':score<-0.3?'#ef4444':'#f59e0b';

  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'14px', padding:'12px', marginBottom:'8px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
        <span style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.60rem', fontWeight:'700', color:accentColor, letterSpacing:'0.08em' }}>
          📈 EMOTION GRAPH
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.65rem', color:scoreColor, fontWeight:'700' }}>
            {score>=0?'+':''}{score.toFixed(2)}
          </span>
          <div style={{ display:'flex', gap:'4px' }}>
            {emotions.slice(0,2).map(e=>(
              <span key={e} style={{ background:accentColor+'22', border:`1px solid ${accentColor}55`, borderRadius:'10px', padding:'1px 7px', fontSize:'0.58rem', color:accentColor, fontFamily:'Syne,sans-serif' }}>{e}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas graph */}
      <canvas ref={canvasRef} width={320} height={80}
        style={{ width:'100%', height:'80px', borderRadius:'8px', background:'rgba(0,0,0,0.2)' }}/>

      {/* Labels */}
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
        <span style={{ fontSize:'0.55rem', color:'#22c55e', fontFamily:'JetBrains Mono,monospace' }}>+1 positive</span>
        <span style={{ fontSize:'0.55rem', color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace' }}>last {Math.min(history.length,15)} messages</span>
        <span style={{ fontSize:'0.55rem', color:'#ef4444', fontFamily:'JetBrains Mono,monospace' }}>-1 negative</span>
      </div>
    </div>
  );
}
