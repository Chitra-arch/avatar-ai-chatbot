import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/*
 * Avatar Introduction Animation
 * Plays a 3-second animated intro when an avatar is selected
 * Shows: avatar name slide-in, description, a quick action pose description
 */

const INTRO_LINES = {
  woman:      { action:"waves hello ✋",    line:"I'm friendly, helpful, and always here for you!", color:'#ec4899' },
  man:        { action:"gives a confident nod 💼", line:"Let's get straight to business.",          color:'#3b82f6' },
  muslimgirl: { action:"smiles gently 🌙",   line:"Ask me anything. I'll think it through with you.",color:'#8b5cf6' },
  fox:        { action:"does a little spin 🦊", line:"Let's have some fun, shall we? Heheh!",       color:'#f97316' },
  robot:      { action:"boots up ⚡",         line:"System online. All modules operational.",         color:'#00d4ff' },
  sage:       { action:"raises a wise hand 🌿", line:"The journey of a thousand questions begins.",  color:'#10b981' },
  spark:      { action:"crackles with energy ⚡", line:"WOOO! Let's GOOOO! Maximum HYPE!",           color:'#eab308' },
};

export default function AvatarIntro({ avatar, onDone }) {
  const [phase, setPhase] = useState(0); // 0=slide-in, 1=show desc, 2=exit
  const synth = useRef(window.speechSynthesis);

  const info = INTRO_LINES[avatar?.id] || INTRO_LINES.woman;

  useEffect(() => {
    if (!avatar) return;
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => {
      // Speak the intro line with avatar's voice
      if (synth.current) {
        synth.current.cancel();
        const u = new SpeechSynthesisUtterance(info.line);
        u.pitch = avatar.voice?.pitch || 1.0;
        u.rate  = avatar.voice?.rate  || 0.95;
        u.lang  = 'en-US';
        u.volume = 0.9;
        synth.current.speak(u);
      }
    }, 700);
    const t3 = setTimeout(() => setPhase(2), 3200);
    const t4 = setTimeout(() => onDone?.(), 3800);
    return () => { [t1,t2,t3,t4].forEach(clearTimeout); synth.current?.cancel(); };
  }, [avatar?.id]);

  if (!avatar) return null;

  return (
    <motion.div
      initial={{ opacity:0 }}
      animate={{ opacity:1 }}
      exit={{ opacity:0 }}
      style={{
        position:'absolute', inset:0, zIndex:100,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:`radial-gradient(circle at center, ${info.color}22 0%, rgba(0,0,0,0.85) 70%)`,
        backdropFilter:'blur(8px)',
        pointerEvents:'none',
      }}>

      {/* Avatar emoji big */}
      <motion.div
        initial={{ scale:0, rotate:-180 }}
        animate={{ scale:phase>=0?1.4:0, rotate:0 }}
        transition={{ type:'spring', stiffness:200, damping:15 }}
        style={{ fontSize:'4rem', marginBottom:'16px', filter:`drop-shadow(0 0 20px ${info.color})` }}>
        {avatar.emoji}
      </motion.div>

      {/* Name */}
      <motion.div
        initial={{ x:-80, opacity:0 }}
        animate={{ x:0, opacity:phase>=0?1:0 }}
        transition={{ delay:0.2, type:'spring', stiffness:150 }}
        style={{
          fontFamily:'Orbitron,sans-serif', fontSize:'1.8rem', fontWeight:'900',
          color:info.color, letterSpacing:'0.12em', marginBottom:'4px',
          textShadow:`0 0 30px ${info.color}`,
        }}>
        {avatar.name.toUpperCase()}
      </motion.div>

      {/* Description */}
      <motion.div
        initial={{ opacity:0 }}
        animate={{ opacity:phase>=0?0.7:0 }}
        transition={{ delay:0.4 }}
        style={{ fontFamily:'Syne,sans-serif', fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'20px', letterSpacing:'0.04em' }}>
        {avatar.description}
      </motion.div>

      {/* Action description */}
      <AnimatePresence>
        {phase>=1 && (
          <motion.div
            initial={{ y:20, opacity:0 }}
            animate={{ y:0, opacity:1 }}
            exit={{ y:-10, opacity:0 }}
            transition={{ type:'spring', stiffness:120 }}
            style={{
              background:`${info.color}22`,
              border:`1.5px solid ${info.color}66`,
              borderRadius:'30px',
              padding:'8px 22px',
              fontFamily:'Syne,sans-serif',
              fontSize:'0.82rem',
              color:'white',
              textAlign:'center',
              marginBottom:'14px',
              maxWidth:'280px',
            }}>
            <span style={{ color:info.color, fontWeight:'700' }}>{avatar.name}</span> {info.action}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro line */}
      <AnimatePresence>
        {phase>=1 && (
          <motion.p
            initial={{ opacity:0, scale:0.95 }}
            animate={{ opacity:1, scale:1 }}
            exit={{ opacity:0 }}
            style={{
              fontFamily:'Syne,sans-serif', fontSize:'0.90rem',
              color:'white', textAlign:'center', maxWidth:'260px',
              lineHeight:1.5, fontStyle:'italic',
            }}>
            "{info.line}"
          </motion.p>
        )}
      </AnimatePresence>

      {/* Animated ring */}
      <motion.div
        animate={{ scale:[1, 1.3, 1], opacity:[0.3, 0.6, 0.3] }}
        transition={{ duration:1.5, repeat:Infinity, ease:'easeInOut' }}
        style={{
          position:'absolute', width:'200px', height:'200px',
          borderRadius:'50%', border:`2px solid ${info.color}`,
          pointerEvents:'none',
        }}/>
      <motion.div
        animate={{ scale:[1, 1.6, 1], opacity:[0.15, 0.35, 0.15] }}
        transition={{ duration:1.5, repeat:Infinity, ease:'easeInOut', delay:0.3 }}
        style={{
          position:'absolute', width:'280px', height:'280px',
          borderRadius:'50%', border:`1px solid ${info.color}`,
          pointerEvents:'none',
        }}/>
    </motion.div>
  );
}
