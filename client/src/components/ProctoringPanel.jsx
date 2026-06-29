import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ProctoringPanel — AI proctoring / malpractice detection
 * Reads data from FaceMoodMirror's MediaPipe detections
 * ALL detection logic stays in FaceMoodMirror — this only displays + logs
 */

function timeNow() {
  return new Date().toLocaleTimeString('en-IN', { hour12: false });
}

const SEVERITY = {
  low:    { color:'#f59e0b', bg:'rgba(245,158,11,0.10)', border:'rgba(245,158,11,0.3)', icon:'⚠️' },
  medium: { color:'#f97316', bg:'rgba(249,115,22,0.10)', border:'rgba(249,115,22,0.3)', icon:'🔶' },
  high:   { color:'#ef4444', bg:'rgba(239,68,68,0.10)',  border:'rgba(239,68,68,0.3)',  icon:'🚨' },
};

export default function ProctoringPanel({ proctoringEvents, isEnabled, onToggle, accentColor = '#7c3aed' }) {
  const [expanded, setExpanded] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [proctoringEvents]);

  const violations = proctoringEvents.filter(e => e.severity !== 'info');
  const highCount  = violations.filter(e => e.severity === 'high').length;

  return (
    <div style={{
      background:'var(--bg-card)',
      border:`1px solid ${isEnabled ? (highCount > 0 ? '#ef4444' : accentColor) : 'var(--border-color)'}44`,
      borderRadius:'14px',
      padding:'10px 14px',
      flexShrink: 0,
    }}>
      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ fontSize:'0.9rem' }}>🎓</span>
        <span style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.60rem', fontWeight:'700',
          color: isEnabled ? (highCount > 0 ? '#ef4444' : accentColor) : 'var(--text-muted)',
          letterSpacing:'0.08em' }}>
          TEST MODE
        </span>

        {/* Violation badge */}
        {isEnabled && violations.length > 0 && (
          <span style={{ background:'rgba(239,68,68,0.15)', border:'1px solid #ef444455',
            borderRadius:'10px', padding:'1px 8px', fontSize:'0.58rem',
            fontFamily:'Orbitron,sans-serif', color:'#ef4444', fontWeight:'700' }}>
            {violations.length} violation{violations.length>1?'s':''}
          </span>
        )}
        {isEnabled && violations.length === 0 && (
          <span style={{ background:'rgba(34,197,94,0.12)', border:'1px solid #22c55e44',
            borderRadius:'10px', padding:'1px 8px', fontSize:'0.58rem',
            fontFamily:'Orbitron,sans-serif', color:'#22c55e', fontWeight:'700' }}>
            ✅ Clean
          </span>
        )}

        {/* Toggle */}
        <div style={{ marginLeft:'auto', display:'flex', gap:'6px', alignItems:'center' }}>
          {isEnabled && proctoringEvents.length > 0 && (
            <button onClick={() => setExpanded(!expanded)}
              style={{ background:'transparent', border:'none', cursor:'pointer',
                fontFamily:'Orbitron,sans-serif', fontSize:'0.55rem', color:'var(--text-muted)',
                padding:'2px 6px' }}>
              {expanded ? '▲ HIDE' : '▼ LOG'}
            </button>
          )}
          <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
            onClick={onToggle}
            style={{
              background: isEnabled ? 'rgba(239,68,68,0.15)' : `${accentColor}22`,
              border:`1px solid ${isEnabled ? '#ef444455' : accentColor+'55'}`,
              borderRadius:'8px', padding:'4px 12px', cursor:'pointer',
              fontFamily:'Orbitron,sans-serif', fontSize:'0.58rem', fontWeight:'700',
              color: isEnabled ? '#ef4444' : accentColor,
              transition:'all 0.2s',
            }}>
            {isEnabled ? '⏹ Disable' : '▶ Enable'}
          </motion.button>
        </div>
      </div>

      {/* What it monitors */}
      {isEnabled && !expanded && (
        <div style={{ marginTop:'8px', display:'flex', flexWrap:'wrap', gap:'5px' }}>
          {[
            { icon:'👥', label:'Multi-face', active:false },
            { icon:'👀', label:'Head turn', active:false },
            { icon:'🚫', label:'Look-away', active:false },
            { icon:'📵', label:'Distraction', active:false },
          ].map(m => (
            <span key={m.label} style={{ background:`${accentColor}14`, border:`1px solid ${accentColor}33`,
              borderRadius:'8px', padding:'2px 8px', fontSize:'0.58rem',
              fontFamily:'Syne,sans-serif', color:'var(--text-muted)' }}>
              {m.icon} {m.label}
            </span>
          ))}
        </div>
      )}

      {/* Violation log */}
      <AnimatePresence>
        {isEnabled && expanded && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            style={{ overflow:'hidden' }}>
            <div ref={logRef} style={{ maxHeight:'160px', overflowY:'auto', marginTop:'8px',
              display:'flex', flexDirection:'column', gap:'4px' }}>
              {proctoringEvents.length === 0 ? (
                <p style={{ fontFamily:'Syne,sans-serif', fontSize:'0.68rem', color:'var(--text-muted)',
                  textAlign:'center', padding:'8px 0', margin:0 }}>No events recorded</p>
              ) : (
                [...proctoringEvents].reverse().map((evt, i) => {
                  const sev = SEVERITY[evt.severity] || SEVERITY.low;
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'6px',
                      background:sev.bg, border:`1px solid ${sev.border}`,
                      borderRadius:'8px', padding:'5px 8px' }}>
                      <span style={{ fontSize:'0.75rem', flexShrink:0 }}>{sev.icon}</span>
                      <div style={{ flex:1 }}>
                        <p style={{ fontFamily:'Syne,sans-serif', fontSize:'0.66rem',
                          color:sev.color, fontWeight:'600', margin:'0 0 1px' }}>{evt.message}</p>
                        <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.55rem',
                          color:'var(--text-muted)', margin:0 }}>{evt.time}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
