import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const themes = [
  { id: 'cyber',  label: 'Cyber',  icon: '⚡', color: '#7c3aed' },
  { id: 'dark',   label: 'Dark',   icon: '🌑', color: '#22c55e' },
  { id: 'light',  label: 'Light',  icon: '☀️', color: '#7c3aed' },
  { id: 'sunset', label: 'Sunset', icon: '🌅', color: '#f97316' },
  { id: 'ocean',  label: 'Ocean',  icon: '🌊', color: '#00d4ff' },
  { id: 'matrix', label: 'Matrix', icon: '💻', color: '#00ff41' },
  { id: 'solar',  label: 'Solar',  icon: '🌌', color: '#ffcc00' },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const current = themes.find(t => t.id === theme) || themes[0];

  return (
    <div style={{ position: 'relative' }}>
      <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
        onClick={() => setOpen(!open)}
        style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'8px', padding:'8px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', color:'var(--text-primary)', fontFamily:'Orbitron, sans-serif', fontSize:'0.7rem', fontWeight:'600', letterSpacing:'0.05em', transition:'all 0.3s' }}
      >
        <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:current.color, boxShadow:`0 0 6px ${current.color}`, flexShrink:0 }} />
        <span>{current.icon}</span>
        <span style={{ color:'var(--text-secondary)' }}>{current.label}</span>
        <span style={{ color:'var(--text-muted)', fontSize:'0.6rem' }}>{open?'▲':'▼'}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity:0, y:-8, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-8, scale:0.95 }} transition={{ duration:0.15 }}
            style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'12px', overflow:'hidden', minWidth:'155px', backdropFilter:'blur(20px)', boxShadow:'var(--shadow-card)', zIndex:999 }}
          >
            {themes.map(t => (
              <motion.button key={t.id} whileHover={{ background:'var(--accent-glow)' }}
                onClick={() => { setTheme(t.id); setOpen(false); }}
                style={{ width:'100%', padding:'9px 14px', background:theme===t.id?'var(--accent-glow)':'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', color:theme===t.id?'var(--accent-1)':'var(--text-secondary)', fontFamily:'Orbitron, sans-serif', fontSize:'0.68rem', fontWeight:'600', letterSpacing:'0.05em', textAlign:'left', transition:'all 0.2s' }}
              >
                <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:t.color, flexShrink:0, boxShadow:theme===t.id?`0 0 6px ${t.color}`:'none' }} />
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {theme===t.id && <span style={{ marginLeft:'auto', fontSize:'0.6rem' }}>✓</span>}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
