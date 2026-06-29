import { motion } from 'framer-motion';

/**
 * Feature 4: Response Style Selector
 * User picks a style → modifies Gemini system prompt dynamically
 */
const STYLES = [
  { id:'default',      icon:'💬', label:'Default'     },
  { id:'funny',        icon:'😂', label:'Funny'        },
  { id:'teacher',      icon:'📚', label:'Teacher'      },
  { id:'motivational', icon:'🚀', label:'Motivate'     },
  { id:'casual',       icon:'😎', label:'Casual'       },
  { id:'empathetic',   icon:'🤗', label:'Empathetic'   },
];

export default function StyleSelector({ selected, onChange, accentColor }) {
  return (
    <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', alignItems:'center', padding:'6px 0' }}>
      <span style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.55rem', color:'var(--text-muted)', letterSpacing:'0.08em', flexShrink:0 }}>STYLE:</span>
      {STYLES.map(s=>(
        <motion.button key={s.id} whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
          onClick={()=>onChange(s.id==='default'?null:s.id)}
          style={{
            background: selected===s.id||(s.id==='default'&&!selected) ? `${accentColor}25` : 'var(--bg-secondary)',
            border: `1px solid ${selected===s.id||(s.id==='default'&&!selected) ? accentColor : 'var(--border-color)'}`,
            borderRadius:'20px', padding:'3px 10px', cursor:'pointer',
            fontFamily:'Syne,sans-serif', fontSize:'0.68rem',
            color: selected===s.id||(s.id==='default'&&!selected) ? accentColor : 'var(--text-muted)',
            display:'flex', alignItems:'center', gap:'4px', transition:'all 0.2s', whiteSpace:'nowrap'
          }}>
          {s.icon} {s.label}
        </motion.button>
      ))}
    </div>
  );
}
