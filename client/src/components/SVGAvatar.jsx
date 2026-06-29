/**
 * SVGAvatar v5 — Arms properly attached inside SVG
 *
 * FINAL ARM FIX:
 *   Keep arms INSIDE the SVG (so they're part of the same coordinate space
 *   as the body), but animate them with React state → SVG transform attribute
 *   string: "rotate(angle, cx, cy)" — this ALWAYS works in every browser
 *   because it's native SVG, not CSS.
 *
 *   No Framer Motion on <g>. No transformBox. No transformOrigin.
 *   Just: useEffect interval → setState → transform={`rotate(${angle},14,40)`}
 *
 *   Shoulder joints:
 *     Left shoulder:  cx=14, cy=40  (top of left arm, matches body rect)
 *     Right shoulder: cx=26, cy=40  (top of right arm)
 */
import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAvatar } from '../context/AvatarContext';

// ── Mouth shapes ──────────────────────────────────────────────────────────
const MOUTH = {
  closed: { d:'M14,30 Q20,32.5 26,30',       open:false },
  smile:  { d:'M13,29.5 Q20,35.5 27,29.5',   open:false },
  small:  { d:'M16,30.5 Q20,33.5 24,30.5',   open:true,  ry:2.5, cx:20, cy:32   },
  wide:   { d:'M13,30 Q20,36 27,30',          open:true,  ry:4.5, cx:20, cy:32.5 },
  round:  { d:'M16,29.5 Q20,35.5 24,29.5',   open:true,  ry:5.5, cx:20, cy:32   },
  sad:    { d:'M14,33 Q20,28 26,33',          open:false },
  think:  { d:'M15.5,30.5 Q18,29.5 21,30.5 Q24,31.5 26.5,29.5', open:false },
};
const SPEECH_SEQ = ['small','wide','small','round','closed','wide','round','small','closed','small','wide'];

function pickVoice(voices, pref = 'female') {
  if (!voices.length) return null;
  const eng  = voices.filter(v => v.lang.startsWith('en'));
  const pool = eng.length ? eng : voices;
  const femKw = ['female','woman','girl','zira','susan','victoria','karen','samantha','moira','fiona'];
  const malKw = ['male','man','david','james','daniel','mark','alex','george','lee','fred'];
  const kws   = pref === 'female' ? femKw : malKw;
  return pool.find(v => kws.some(k => v.name.toLowerCase().includes(k))) || pool[0];
}

// ── useArmAngle hook — pure JS angle driven by state ─────────────────────
// Returns current angle for each arm, updated via requestAnimationFrame lerp
function useArmAngle(targetAngle, speed = 0.14) {
  const [angle, setAngle] = useState(targetAngle);
  const current = useRef(targetAngle);
  const rafRef  = useRef(null);

  useEffect(() => {
    const lerp = (a, b, t) => a + (b - a) * t;
    const tick = () => {
      const diff = targetAngle - current.current;
      if (Math.abs(diff) > 0.05) {
        current.current = lerp(current.current, targetAngle, speed);
        setAngle(current.current);
        rafRef.current = requestAnimationFrame(tick);
      } else {
        current.current = targetAngle;
        setAngle(targetAngle);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetAngle, speed]);

  return angle;
}

export default function SVGAvatar({
  size = 130,
  state = 'idle',
  expression = 'happy',
  headRotation = null,
  mirrorSmile = false,
  keywords = [],
  containerRef,
}) {
  const { selectedAvatar } = useAvatar();
  const av     = selectedAvatar;
  const accent = av?.color || '#7c3aed';

  const [pupils,     setPupils]    = useState({ l:{x:0,y:0}, r:{x:0,y:0} });
  const [blink,      setBlink]     = useState(false);
  const [mouth,      setMouth]     = useState('smile');
  const [headTilt,   setHeadTilt]  = useState({ x:0, y:0, z:0 });
  const [introAnim,  setIntroAnim] = useState(false);
  const [waving,     setWaving]    = useState(false);
  const [introText,  setIntroText] = useState('');
  const [floatKw,    setFloatKw]   = useState([]);

  // Arm target angles — these drive the lerp hooks
  const [leftTarget,  setLeftTarget]  = useState(0);
  const [rightTarget, setRightTarget] = useState(0);

  // Speaking oscillation
  const [speakTick, setSpeakTick] = useState(0);

  const svgRef      = useRef(null);
  const animFrameRef = useRef(null);
  const targetRef   = useRef({ l:{x:0,y:0}, r:{x:0,y:0} });
  const idleTimer   = useRef(null);
  const isIdle      = useRef(false);
  const blinkTimer  = useRef(null);
  const speechTimer = useRef(null);
  const speakCycle  = useRef(null);
  const waveCycle   = useRef(null);
  const speechIdx   = useRef(0);
  const prevAvId    = useRef(null);

  // Smooth arm angles via lerp
  const leftAngle  = useArmAngle(leftTarget,  0.12);
  const rightAngle = useArmAngle(rightTarget, 0.12);

  // ── Arm angle controller ───────────────────────────────────────────────
  useEffect(() => {
    clearInterval(speakCycle.current);
    clearInterval(waveCycle.current);

    if (waving) {
      // Wave: oscillate left arm between -15 and -65 deg, 3 cycles
      let tick = 0;
      const waveAngles = [-15, -65, -35, -65, -35, -65, -15];
      let idx = 0;
      waveCycle.current = setInterval(() => {
        if (idx < waveAngles.length) {
          setLeftTarget(waveAngles[idx]);
          idx++;
        } else {
          clearInterval(waveCycle.current);
          setLeftTarget(0); // return to neutral
        }
        setRightTarget(tick % 2 === 0 ? 8 : -5);
        tick++;
      }, 260);

    } else if (state === 'speaking') {
      // Expressive alternating gestures
      const leftSeq  = [-12, -28, 8, -18, 14, -8, 20, -5];
      const rightSeq = [15, -5, -18, 12, -10, 20, -6, 16];
      let idx = 0;
      speakCycle.current = setInterval(() => {
        setLeftTarget(leftSeq[idx % leftSeq.length]);
        setRightTarget(rightSeq[(idx + 3) % rightSeq.length]); // offset for asymmetry
        idx++;
        setSpeakTick(idx);
      }, 550);

    } else if (state === 'thinking') {
      setLeftTarget(10);   // left arm slightly down
      setRightTarget(-32); // right arm raised — chin-rest pose

    } else if (state === 'listening') {
      setLeftTarget(-8);
      setRightTarget(8);

    } else {
      // Idle: gentle breathing sway
      let t = 0;
      speakCycle.current = setInterval(() => {
        setLeftTarget(Math.sin(t * 0.08) * 6);
        setRightTarget(Math.sin(t * 0.08 + Math.PI) * 6);
        t++;
      }, 80);
    }

    return () => {
      clearInterval(speakCycle.current);
      clearInterval(waveCycle.current);
    };
  }, [waving, state]);

  // ── Eye tracking ──────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      if (!svgRef.current) return;
      isIdle.current = false;
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => { isIdle.current = true; }, 2000);
      const rect = svgRef.current.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width  / 2);
      const dy = e.clientY - (rect.top  + rect.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const nx = (dx / dist) * Math.min(4.5, dist * 0.07);
      const ny = (dy / dist) * Math.min(3.5, dist * 0.06);
      targetRef.current = { l:{x:nx-0.5,y:ny}, r:{x:nx+0.5,y:ny} };
    };
    window.addEventListener('mousemove', onMove, { passive:true });
    let run = true;
    const L = (a, b, t) => a + (b - a) * t;
    const tick = () => {
      if (!run) return;
      const tgt = isIdle.current ? {l:{x:0,y:0},r:{x:0,y:0}} : targetRef.current;
      setPupils(p => ({
        l: { x:L(p.l.x,tgt.l.x,0.09), y:L(p.l.y,tgt.l.y,0.09) },
        r: { x:L(p.r.x,tgt.r.x,0.09), y:L(p.r.y,tgt.r.y,0.09) },
      }));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      run = false;
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('mousemove', onMove);
      clearTimeout(idleTimer.current);
    };
  }, []);

  // ── Blinking ──────────────────────────────────────────────────────────
  useEffect(() => {
    const sched = () => {
      blinkTimer.current = setTimeout(() => {
        setBlink(true);
        setTimeout(() => { setBlink(false); sched(); }, 120);
      }, 2500 + Math.random() * 3800);
    };
    sched();
    return () => clearTimeout(blinkTimer.current);
  }, []);

  // ── Lip-sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(speechTimer.current);
    if (state === 'speaking') {
      speechIdx.current = 0;
      speechTimer.current = setInterval(() => {
        speechIdx.current = (speechIdx.current + 1) % SPEECH_SEQ.length;
        setMouth(SPEECH_SEQ[speechIdx.current]);
      }, 105);
    } else if (state === 'thinking') {
      setMouth('think');
    } else if (waving) {
      setMouth('smile');
    } else {
      const em = { happy:'smile', excited:'wide', surprised:'round', sad:'sad', thinking:'think' };
      setMouth(mirrorSmile ? 'wide' : (em[expression] || 'smile'));
    }
    return () => clearInterval(speechTimer.current);
  }, [state, expression, mirrorSmile, waving]);

  // ── Head tilt from FaceMirror ─────────────────────────────────────────
  useEffect(() => {
    if (!headRotation) {
      setHeadTilt(p => ({ x:p.x*0.85, y:p.y*0.85, z:p.z*0.85 }));
      return;
    }
    const clamp = (v, mx) => Math.max(-mx, Math.min(mx, v));
    setHeadTilt({
      x: clamp(headRotation.x * 0.45, 0.16),
      y: clamp(headRotation.y * 0.45, 0.20),
      z: clamp(headRotation.z * 0.35, 0.12),
    });
  }, [headRotation]);

  // ── Floating keywords ─────────────────────────────────────────────────
  useEffect(() => {
    if (keywords?.length) {
      setFloatKw(keywords.slice(0, 4));
      const t = setTimeout(() => setFloatKw([]), 6000);
      return () => clearTimeout(t);
    }
  }, [keywords]);

  // ── Avatar intro: wave + TTS ──────────────────────────────────────────
  useEffect(() => {
    if (!av) return;
    if (prevAvId.current === av.id) return;
    prevAvId.current = av.id;

    const greetings = {
      woman:     "Hi! I'm Aria! I'm here to help you! 👋",
      man:       "Hey, I'm Axel. Let's get things done.",
      muslimgirl:"As-salamu alaykum! I'm Layla. How can I help?",
      fox:       "YO! Foxy in the house! What's up?! 🦊",
      robot:     "Greetings. I am NOVA. Systems online. 🤖",
      sage:      "...I am Sage. Wisdom flows here. 🧙",
      spark:     "YOOO! Spark's HERE! LET'S GOOOO! ⚡",
    };
    const txt = greetings[av.id] || `Hi! I'm ${av.name}!`;
    setIntroText(txt);
    setIntroAnim(true);
    setWaving(true);

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const doSpeak = () => {
        const u = new SpeechSynthesisUtterance(txt);
        const voices = window.speechSynthesis.getVoices();
        const picked = pickVoice(voices, av.voice?.voiceName || 'female');
        if (picked) u.voice = picked;
        u.pitch  = av.voice?.pitch || 1.0;
        u.rate   = av.voice?.rate  || 0.95;
        u.volume = 0.9;
        window.speechSynthesis.speak(u);
      };
      if (window.speechSynthesis.getVoices().length) doSpeak();
      else window.speechSynthesis.onvoiceschanged = doSpeak;
    }

    const t1 = setTimeout(() => setIntroAnim(false), 2800);
    const t2 = setTimeout(() => setWaving(false), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [av?.id]);

  // ── Derived ───────────────────────────────────────────────────────────
  const isRobot  = av?.id === 'robot';
  const isFox    = av?.id === 'fox';
  const isSage   = av?.id === 'sage';
  const isSpark  = av?.id === 'spark';
  const isMuslim = av?.id === 'muslimgirl';
  const skin     = av?.skin      || '#f5c5a0';
  const hair     = av?.hair      || '#2c0f02';
  const iris     = av?.irisColor || '#5c3015';
  const cloth    = av?.clothDefault || accent;
  const mShp     = MOUTH[mouth] || MOUTH.smile;

  const browO = mirrorSmile
    ? { l:-2, r:-2, lR:0.05, rR:-0.05 }
    : ({ happy:{l:-1,r:-1,lR:0.10,rR:-0.10}, excited:{l:-3,r:-3,lR:0.04,rR:-0.04},
        surprised:{l:-5,r:-5,lR:0,rR:0}, sad:{l:2,r:2,lR:-0.22,rR:0.22},
        thinking:{l:1,r:-1,lR:0.28,rR:-0.05},
       }[expression] || {l:-1,r:-1,lR:0.10,rR:-0.10});

  const headTf = `rotate(${(headTilt.z*57.3).toFixed(1)},20,23) skewX(${(headTilt.y*9).toFixed(1)}) skewY(${(headTilt.x*5).toFixed(1)})`;

  // SVG rotate(angle, cx, cy) strings — pivot at shoulder joints
  const L_SHOULDER = '14,40'; // left shoulder x,y in viewBox coords
  const R_SHOULDER = '26,40'; // right shoulder x,y
  const leftRotate  = `rotate(${leftAngle.toFixed(1)},${L_SHOULDER})`;
  const rightRotate = `rotate(${rightAngle.toFixed(1)},${R_SHOULDER})`;

  const bodyV = {
    idle:     { y:[0,-2,0],          transition:{ duration:3.8, repeat:Infinity, ease:'easeInOut' } },
    listening:{ y:[0,-2.5,0],        transition:{ duration:1.6, repeat:Infinity, ease:'easeInOut' } },
    thinking: { rotate:[-2,2,-2],    transition:{ duration:1.1, repeat:Infinity, ease:'easeInOut' } },
    speaking: { y:[0,-2.5,0,-1.5,0], transition:{ duration:0.5, repeat:Infinity, ease:'easeInOut' } },
  };

  return (
    <div style={{
      position:'relative', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      userSelect:'none', width:'100%', height:'100%',
    }}>

      {/* ── Floating keywords ──────────────────────────────────── */}
      <AnimatePresence>
        {floatKw.length > 0 && (
          <div style={{
            position:'absolute', top:'-56px', left:'50%',
            transform:'translateX(-50%)', display:'flex', gap:'5px',
            flexWrap:'wrap', justifyContent:'center', width:'210px', zIndex:10,
          }}>
            {floatKw.map((kw, i) => (
              <motion.div key={`${kw}-${i}`}
                initial={{ opacity:0, y:8, scale:0.8 }}
                animate={{ opacity:1, y:[0,-5,0], scale:1 }}
                exit={{ opacity:0, y:-8 }}
                transition={{ duration:0.4, delay:i*0.08,
                  y:{ duration:2.5, repeat:Infinity, ease:'easeInOut', delay:i*0.3 } }}
                style={{
                  background:`${accent}22`, border:`1.5px solid ${accent}88`,
                  borderRadius:'20px', padding:'2px 9px', fontSize:'0.60rem',
                  fontFamily:'Orbitron,sans-serif', fontWeight:'700', color:accent,
                  whiteSpace:'nowrap', backdropFilter:'blur(8px)',
                  boxShadow:`0 0 10px ${accent}44`,
                }}>
                {kw}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* ── Intro speech bubble ────────────────────────────────── */}
      <AnimatePresence>
        {introAnim && (
          <motion.div
            initial={{ opacity:0, scale:0.7, y:10 }}
            animate={{ opacity:1, scale:1,   y:0  }}
            exit={{ opacity:0, scale:0.8, y:-6 }}
            style={{
              position:'absolute', top:'-50px', left:'50%',
              transform:'translateX(-50%)', whiteSpace:'nowrap',
              background:'var(--bg-card)', border:`1.5px solid ${accent}55`,
              borderRadius:'20px', padding:'5px 14px',
              fontFamily:'Syne,sans-serif', fontSize:'0.72rem',
              color:accent, fontWeight:'600', zIndex:12,
              boxShadow:`0 4px 18px ${accent}33`,
            }}>
            {introText}
            <div style={{
              position:'absolute', bottom:'-8px', left:'50%',
              transform:'translateX(-50%)', width:0, height:0,
              borderLeft:'7px solid transparent', borderRight:'7px solid transparent',
              borderTop:`8px solid ${accent}55`,
            }}/>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Speaking glow ──────────────────────────────────────── */}
      {state === 'speaking' && (
        <motion.div
          animate={{ scale:[1,1.22,1], opacity:[0.4,0.10,0.4] }}
          transition={{ duration:0.55, repeat:Infinity }}
          style={{
            position:'absolute', inset:'-12px', borderRadius:'50%',
            background:`radial-gradient(circle,${accent}44,transparent)`,
            pointerEvents:'none',
          }}/>
      )}

      {/* ── Body wrapper ───────────────────────────────────────── */}
      <motion.div
        variants={bodyV}
        animate={waving ? 'idle' : state}
        style={{
          width:'100%', flex:'1 1 0', minHeight:0,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>

        {/*
          SINGLE SVG containing everything: arms + body + head.
          Arms are SVG <g> elements with transform="rotate(angle, cx, cy)".
          This is pure SVG geometry — cross-browser perfect.
          Shoulder left = (14,40), right = (26,40).
        */}
        <svg ref={svgRef}
          width="100%" height="100%"
          viewBox="0 0 40 52"
          preserveAspectRatio="xMidYMid meet"
          style={{ display:'block', overflow:'visible', maxWidth:size, maxHeight:size*1.3 }}>

          {/* ══════════════════════════════════════════════════════
              LEFT ARM — pivot at (14, 40) = left shoulder
              Arm hangs downward by default (angle=0 → straight down)
              Negative angle = swings left/up, positive = swings right
          ══════════════════════════════════════════════════════ */}
          <g transform={leftRotate}>
            {/* Upper arm sleeve */}
            <rect x="11.5" y="40" width="5" height="8" rx="2.5"
              fill={cloth} opacity="0.90"/>
            {/* Elbow */}
            <circle cx="14" cy="48" r="2.8" fill={cloth} opacity="0.80"/>
            {/* Forearm skin */}
            <rect x="12" y="47" width="4" height="7" rx="2"
              fill={skin} opacity="0.93"/>
            {/* Hand */}
            <ellipse cx="14" cy="56" rx="3" ry="3.5"
              fill={skin} opacity="0.97"/>
            {/* Thumb */}
            <ellipse cx="11.2" cy="54.5" rx="1.4" ry="1.1"
              fill={skin} opacity="0.85"/>
          </g>

          {/* ══════════════════════════════════════════════════════
              RIGHT ARM — pivot at (26, 40) = right shoulder
          ══════════════════════════════════════════════════════ */}
          <g transform={rightRotate}>
            {/* Upper arm sleeve */}
            <rect x="23.5" y="40" width="5" height="8" rx="2.5"
              fill={cloth} opacity="0.90"/>
            {/* Elbow */}
            <circle cx="26" cy="48" r="2.8" fill={cloth} opacity="0.80"/>
            {/* Forearm skin */}
            <rect x="24" y="47" width="4" height="7" rx="2"
              fill={skin} opacity="0.93"/>
            {/* Hand */}
            <ellipse cx="26" cy="56" rx="3" ry="3.5"
              fill={skin} opacity="0.97"/>
            {/* Thumb */}
            <ellipse cx="28.8" cy="54.5" rx="1.4" ry="1.1"
              fill={skin} opacity="0.85"/>
          </g>

          {/* ══════════════════════════════════════════════════════
              BODY (torso) — drawn AFTER arms so it overlaps arm tops
          ══════════════════════════════════════════════════════ */}
          <rect x="13" y="37" width="14" height="12" rx="3.5"
            fill={isRobot ? '#1e3040' : cloth} opacity="0.88"/>
          <rect x="11" y="41" width="18" height="8" rx="3.5"
            fill={isRobot ? '#162530' : cloth} opacity="0.65"/>
          {/* Collar */}
          <ellipse cx="20" cy="38" rx="4.5" ry="2"
            fill={isRobot ? '#243550' : 'rgba(255,255,255,0.12)'}/>
          {/* Chest detail */}
          {!isRobot && (
            <ellipse cx="20" cy="42" rx="3.5" ry="2"
              fill="rgba(255,255,255,0.07)"/>
          )}

          {/* ══════════════════════════════════════════════════════
              HEAD GROUP — animated with headTf
          ══════════════════════════════════════════════════════ */}
          <g transform={headTf}>

            {/* Neck */}
            <rect x="17" y="34" width="6" height="5" rx="2"
              fill={skin} opacity="0.85"/>

            {/* Head shadow */}
            <ellipse cx="20" cy="36" rx="7" ry="1.5" fill="rgba(0,0,0,0.09)"/>

            {/* Head base */}
            <ellipse cx="20" cy="22" rx={isRobot?10.5:11.5} ry={isRobot?10:12}
              fill={isRobot ? '#1a2d42' : skin}
              stroke={isRobot ? accent : 'none'}
              strokeWidth={isRobot ? '0.7' : '0'}/>

            {/* HAIR */}
            {!isRobot && !isFox && !isSpark && (
              <>
                <path d="M8.5,18 Q8,9 20,6.5 Q32,9 31.5,18 Q29,11 20,10.5 Q11,11 8.5,18Z"
                  fill={hair} opacity="0.95"/>
                <path d="M10,16 Q9.5,11 20,9 Q30.5,11 30,16 Q28,13 20,12.5 Q12,13 10,16Z"
                  fill={hair} opacity="0.35"/>
                <path d="M8.5,18 Q7,23 8.5,31 Q9,26 11.5,22Z"  fill={hair} opacity="0.85"/>
                <path d="M31.5,18 Q33,23 31.5,31 Q31,26 28.5,22Z" fill={hair} opacity="0.85"/>
                <path d="M14,11 Q20,8.5 25,11 Q21,9.5 14,11Z" fill="rgba(255,255,255,0.12)"/>
              </>
            )}
            {isMuslim && (
              <>
                <ellipse cx="20" cy="18" rx="12.5" ry="13.5" fill={hair} opacity="0.92"/>
                <path d="M7.5,25 Q7,38 20,39 Q33,38 32.5,25 Q28,34 20,33 Q12,34 7.5,25Z"
                  fill={hair} opacity="0.90"/>
                <path d="M12,11 Q20,7 28,11 Q22,8.5 12,11Z" fill="rgba(255,255,255,0.08)"/>
              </>
            )}
            {isSage && (
              <>
                <polygon points="20,5 13.5,21 26.5,21" fill="#065f46" opacity="0.93"/>
                <polygon points="20,5 13.5,21 26.5,21" fill="rgba(255,255,255,0.05)"/>
                <rect x="11" y="21" width="18" height="3.5" rx="1.8" fill="#064e3b" opacity="0.9"/>
                <text x="20" y="18" fontSize="4" textAnchor="middle" fill="#fbbf24" opacity="0.9">★</text>
              </>
            )}
            {isFox && (
              <>
                <path d="M10,17 Q12,5 16,13Z"  fill={skin} stroke={skin} strokeWidth="0.5"/>
                <path d="M30,17 Q28,5 24,13Z"  fill={skin} stroke={skin} strokeWidth="0.5"/>
                <path d="M11,16 Q12.5,7 15.5,13Z" fill="#ffd0a8"/>
                <path d="M29,16 Q27.5,7 24.5,13Z" fill="#ffd0a8"/>
                <ellipse cx="20" cy="26.5" rx="5.5" ry="4" fill="#fff8f0" opacity="0.88"/>
              </>
            )}
            {isSpark && (
              <>
                {[[20,6],[15,8.5],[25,8.5],[11.5,12.5],[28.5,12.5],[13,10],[27,10]].map(([x,y],i)=>(
                  <path key={i} d={`M${x},${y} L${x-3},${y+7} L${x+3},${y+7}Z`}
                    fill="#f59e0b" opacity="0.92"/>
                ))}
                <path d="M8,18 Q8,12 20,10 Q32,12 32,18 Q30,14 20,13 Q10,14 8,18Z"
                  fill="#92400e" opacity="0.7"/>
              </>
            )}
            {isRobot && (
              <>
                <rect x="10.5" y="14.5" width="19" height="15" rx="3.5" fill="#1e2d3e" opacity="0.8"/>
                <path d="M11.5,15.5 Q13,14.5 15,15.5 Q13,16 11.5,15.5Z" fill="rgba(255,255,255,0.12)"/>
                <rect x="19" y="7.5" width="2" height="6.5" rx="1" fill="#3a5870"/>
                <circle cx="20" cy="7" r="2.2" fill={accent} opacity="0.92"/>
                <circle cx="20" cy="7" r="1.2" fill={accent}
                  style={{ filter:`drop-shadow(0 0 3px ${accent})` }}/>
              </>
            )}

            {/* EYEBROWS */}
            <line x1="12.5" y1={18.5+browO.l} x2="18" y2={18.5+browO.l-0.5}
              stroke={isRobot?accent:'#1a0c00'} strokeWidth={isRobot?'0.9':'1.4'}
              strokeLinecap="round"
              transform={`rotate(${((browO.lR||0)*57.3).toFixed(1)},15,${18.5+browO.l})`}/>
            <line x1="22" y1={18.5+browO.r-0.5} x2="27.5" y2={18.5+browO.r}
              stroke={isRobot?accent:'#1a0c00'} strokeWidth={isRobot?'0.9':'1.4'}
              strokeLinecap="round"
              transform={`rotate(${((browO.rR||0)*57.3).toFixed(1)},24.5,${18.5+browO.r})`}/>

            {/* EYES */}
            <ellipse cx="15.5" cy="22.5" rx="4.2" ry={blink?0.3:4.8}
              fill="white" opacity="0.97"/>
            <ellipse cx="24.5" cy="22.5" rx="4.2" ry={blink?0.3:4.8}
              fill="white" opacity="0.97"/>
            {!blink && (
              <>
                <circle cx={15.5+pupils.l.x} cy={22.5+pupils.l.y} r="2.8"
                  fill={isRobot?accent:iris} opacity={isRobot?0.9:1}/>
                <circle cx={24.5+pupils.r.x} cy={22.5+pupils.r.y} r="2.8"
                  fill={isRobot?accent:iris} opacity={isRobot?0.9:1}/>
                {!isRobot && (
                  <>
                    <circle cx={15.5+pupils.l.x} cy={22.5+pupils.l.y} r="1.5" fill="#080308"/>
                    <circle cx={24.5+pupils.r.x} cy={22.5+pupils.r.y} r="1.5" fill="#080308"/>
                  </>
                )}
                <circle cx={15.5+pupils.l.x+1}   cy={21.3+pupils.l.y} r="0.75" fill="white"/>
                <circle cx={24.5+pupils.r.x+1}   cy={21.3+pupils.r.y} r="0.75" fill="white"/>
                <circle cx={15.5+pupils.l.x-0.8} cy={23.5+pupils.l.y} r="0.40" fill="rgba(255,255,255,0.5)"/>
                <circle cx={24.5+pupils.r.x-0.8} cy={23.5+pupils.r.y} r="0.40" fill="rgba(255,255,255,0.5)"/>
              </>
            )}

            {/* NOSE */}
            {!isRobot && !isFox && (
              <path d="M18.5,26.5 Q20,28 21.5,26.5" stroke={skin} strokeWidth="0.9"
                fill="none" strokeLinecap="round" opacity="0.65"/>
            )}
            {isFox   && <circle cx="20" cy="25.5" r="1.8" fill="#1a0808"/>}
            {isRobot && <rect x="18.5" y="25" width="3" height="2.5" rx="0.8" fill="#1e2d3e" opacity="0.8"/>}

            {/* MOUTH */}
            {isRobot ? (
              <g>
                {[0,1,2,3,4].map(i => (
                  <rect key={i} x={14.5+i*2.5} y={29.5} width="2"
                    height={mShp.open ? 2.5+Math.sin(i*1.2)*1.5 : 1.8}
                    rx="0.5" fill={accent} opacity={mShp.open?0.92:0.55}/>
                ))}
              </g>
            ) : mShp.open ? (
              <>
                <ellipse cx={mShp.cx||20} cy={(mShp.cy||32)-1}
                  rx="4.5" ry={mShp.ry||3.5} fill="#3a0a10"/>
                <path d={mShp.d} stroke="#c04060" strokeWidth="1.5" fill="none"/>
                <ellipse cx={mShp.cx||20} cy={(mShp.cy||32)-2}
                  rx="3.8" ry="1.4" fill="white" opacity="0.94"/>
              </>
            ) : (
              <path d={mShp.d} stroke={isFox?'#1a0808':'#c04060'}
                strokeWidth="1.6" fill="none" strokeLinecap="round"/>
            )}

            {/* CHEEKS */}
            {(expression==='happy'||expression==='excited'||mirrorSmile||waving||state==='speaking') &&
              ['woman','muslimgirl','spark'].includes(av?.id) && !blink && (
              <>
                <ellipse cx="10.5" cy="26.5" rx="3.8" ry="2.3" fill="#f4a0b0" opacity="0.28"/>
                <ellipse cx="29.5" cy="26.5" rx="3.8" ry="2.3" fill="#f4a0b0" opacity="0.28"/>
              </>
            )}

            {/* THINKING BUBBLES */}
            {state === 'thinking' && (
              <>
                <motion.circle cx="32" cy="15" r="1.1" fill={accent}
                  animate={{ opacity:[0.3,0.9,0.3] }}
                  transition={{ duration:0.6, repeat:Infinity, delay:0 }}/>
                <motion.circle cx="34.5" cy="12" r="1.5" fill={accent}
                  animate={{ opacity:[0.3,0.9,0.3] }}
                  transition={{ duration:0.6, repeat:Infinity, delay:0.22 }}/>
                <motion.circle cx="37" cy="8.5" r="2.2" fill={accent}
                  animate={{ opacity:[0.2,0.7,0.2] }}
                  transition={{ duration:0.6, repeat:Infinity, delay:0.44 }}/>
              </>
            )}

          </g>{/* end head */}
        </svg>
      </motion.div>

      {/* ── State badge ─────────────────────────────────────────── */}
      <div style={{
        marginTop:'4px', background:`${accent}18`,
        border:`1px solid ${accent}33`, borderRadius:'12px',
        padding:'2px 10px', fontFamily:'Orbitron,sans-serif',
        fontSize:'0.52rem', fontWeight:'700', color:accent,
        letterSpacing:'0.07em', flexShrink:0,
      }}>
        {waving           ? '👋 INTRO'
          : state==='speaking'  ? '💬 SPEAKING'
          : state==='thinking'  ? '🤔 THINKING'
          : state==='listening' ? '👂 LISTENING'
          : `${av?.emoji||'🤖'} ${av?.name?.toUpperCase()||'AI'}`}
      </div>
    </div>
  );
}
