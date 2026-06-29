/**
 * ChatBox — Redesigned
 * - Emoji avatar beside every bot message (synced instantly)
 * - Animated emoji avatar in header with eye tracking
 * - STYLE moved into overlay dropdown next to Quiz Me
 * - Toolbar grouped into primary + secondary dropdowns
 * - Speaking: pulse + bounce + glow animation
 * - Thinking: spin expression
 * - All existing features (ML, quiz, voice, image, wake word) preserved
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import TypingIndicator from './TypingIndicator';
import MLPanel from './MLPanel';
import { useAvatar } from '../context/AvatarContext';
import VideoRecommendation, { shouldShowVideos, detectTopic } from './VideoRecommendation';
import { useChat } from '../context/ChatContext';

// ── Constants (all preserved) ─────────────────────────────────────────────
const LANGUAGES = [
  { code:'en-US', label:'English',  flag:'🇺🇸' },
  { code:'hi-IN', label:'Hindi',    flag:'🇮🇳' },
  { code:'ta-IN', label:'Tamil',    flag:'🇮🇳', noTTS:true },
  { code:'te-IN', label:'Telugu',   flag:'🇮🇳', noTTS:true },
  { code:'ar-SA', label:'Arabic',   flag:'🇸🇦', noTTS:true },
  { code:'fr-FR', label:'French',   flag:'🇫🇷' },
  { code:'es-ES', label:'Spanish',  flag:'🇪🇸' },
  { code:'de-DE', label:'German',   flag:'🇩🇪' },
  { code:'ja-JP', label:'Japanese', flag:'🇯🇵' },
];
const VOICE_TYPES = [
  { id:'default', label:'Default', pitch:1.0, rate:0.95 },
  { id:'deep',    label:'Deep',    pitch:0.6, rate:0.85 },
  { id:'high',    label:'High',    pitch:1.6, rate:1.00 },
  { id:'robot',   label:'Robotic', pitch:0.5, rate:0.80 },
  { id:'fast',    label:'Fast',    pitch:1.0, rate:1.40 },
];
const BUBBLE_COLORS = [
  { id:'purple', label:'Purple', color:'linear-gradient(135deg,#7c3aed,#4f46e5)' },
  { id:'pink',   label:'Pink',   color:'linear-gradient(135deg,#ec4899,#db2777)' },
  { id:'blue',   label:'Blue',   color:'linear-gradient(135deg,#3b82f6,#2563eb)' },
  { id:'green',  label:'Green',  color:'linear-gradient(135deg,#22c55e,#16a34a)' },
  { id:'orange', label:'Orange', color:'linear-gradient(135deg,#f97316,#ea580c)' },
  { id:'teal',   label:'Teal',   color:'linear-gradient(135deg,#14b8a6,#0d9488)' },
];
const STYLE_OPTIONS = [
  { id:null,         label:'Default',    icon:'💬' },
  { id:'funny',      label:'Funny',      icon:'😄' },
  { id:'teacher',    label:'Teacher',    icon:'📚' },
  { id:'motivate',   label:'Motivate',   icon:'🚀' },
  { id:'casual',     label:'Casual',     icon:'😎' },
  { id:'empathetic', label:'Empathetic', icon:'🤗' },
];
const SUGGESTED = {
  woman:      ['Tell me a fun fact 🌟','How do I stay motivated?','What should I learn today?'],
  man:        ['Explain quantum physics','Best productivity tips?','How does AI work?'],
  muslimgirl: ['Share some wisdom 🌙','How to be more patient?','What brings inner peace?'],
  fox:        ['Tell me a joke 🦊','Give me a riddle!','Weirdest fact ever?'],
  robot:      ['Explain machine learning','Future of AI?','How do computers think?'],
  sage:       ['Share ancient wisdom 🌿','Meaning of life?','Tell me a fable'],
  spark:      ['Hype me up! ⚡','Give me a challenge!','Most exciting thing ever?'],
};
const REACTIONS = ['👍','❤️','😂','😮','🔥','👏'];

// ── Language detection ─────────────────────────────────────────────────────
const LANG_PATTERNS = [
  { code:'ta-IN', label:'Tamil',    flag:'🇮🇳', noTTS:true,  re:/[\u0B80-\u0BFF]/ },
  { code:'te-IN', label:'Telugu',   flag:'🇮🇳', noTTS:true,  re:/[\u0C00-\u0C7F]/ },
  { code:'hi-IN', label:'Hindi',    flag:'🇮🇳', noTTS:false, re:/[\u0900-\u097F]/ },
  { code:'ar-SA', label:'Arabic',   flag:'🇸🇦', noTTS:true,  re:/[\u0600-\u06FF]/ },
  { code:'ja-JP', label:'Japanese', flag:'🇯🇵', noTTS:false, re:/[\u3040-\u30FF]/ },
  { code:'de-DE', label:'German',   flag:'🇩🇪', noTTS:false, re:/\b(ich|und|ist|das|der|die)\b/i },
  { code:'fr-FR', label:'French',   flag:'🇫🇷', noTTS:false, re:/\b(je|tu|est|une|les|pour)\b/i },
  { code:'es-ES', label:'Spanish',  flag:'🇪🇸', noTTS:false, re:/\b(yo|tú|pero|para|con|que)\b/i },
];
function detectLanguage(text) {
  for (const p of LANG_PATTERNS) { if (p.re.test(text)) return p; }
  return null;
}

// Quick mood analysis for voice input
function analyzeVoiceText(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/happy|great|amazing|love|awesome|yes|yay|wonderful/.test(t)) return { mood:'happy' };
  if (/excited|wow|incredible|omg|fantastic|perfect/.test(t)) return { mood:'excited' };
  if (/sad|unhappy|depressed|crying|miss|lonely/.test(t)) return { mood:'sad' };
  if (/angry|mad|hate|frustrated|annoyed|ugh|argh/.test(t)) return { mood:'angry' };
  if (/why|how|what|confused|dont know|help|stuck/.test(t)) return { mood:'thinking' };
  return null;
}

// ── Text helpers (all preserved) ──────────────────────────────────────────
function extractKeywords(text) {
  const m = text.match(/\[keywords:\s*([^\]]+)\]/i);
  return m ? m[1].split(',').map(k=>k.trim()).filter(Boolean).slice(0,6) : [];
}
function extractMood(text) {
  const m = text.match(/\[mood:(happy|excited|thinking|surprised|sad|explaining|nodding)\]/);
  return m ? m[1] : null;
}
function extractConfidence(text) {
  const m = text.match(/\[confidence:(high|medium|low)\]/i);
  return m ? m[1].toLowerCase() : null;
}
function cleanText(text) {
  return text
    .replace(/\[mood:[^\]]+\]/g,'')
    .replace(/\[keywords:[^\]]+\]/gi,'')
    .replace(/\[confidence:[^\]]+\]/gi,'')
    .replace(/^[\s{}\]\[]+\n?/,'')
    .replace(/^[\s]*[}\]]\s*\n/gm,'')
    .trim();
}
function parseError(err) {
  if (!err.response) return '🔌 Server not running!\n\nRun:\n  cd server\n  npm run dev';
  const msg = err.response?.data?.error||'';
  if (err.response.status===503) return '🔑 Add API key to server/.env';
  if (err.response.status===401) return '❌ Wrong API key';
  if (err.response.status===429) return '__RATELIMIT__';
  return msg||'⚠️ Check server terminal.';
}
function playChime() {
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    o.frequency.setValueAtTime(880,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1200,ctx.currentTime+0.08);
    g.gain.setValueAtTime(0.10,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.28);
    o.start();o.stop(ctx.currentTime+0.28);
  }catch{}
}

// ── Typewriter ────────────────────────────────────────────────────────────
function TypewriterText({ text, speed=14 }) {
  const [shown,setShown]=useState('');
  const [done,setDone]=useState(false);
  useEffect(()=>{
    let i=0; setShown(''); setDone(false);
    const iv=setInterval(()=>{ i++; setShown(text.slice(0,i)); if(i>=text.length){clearInterval(iv);setDone(true);} },speed);
    return()=>clearInterval(iv);
  },[text]);
  return <span>{shown}{!done&&<span style={{animation:'twc .7s step-end infinite'}}>▌</span>}<style>{`@keyframes twc{0%,100%{opacity:1}50%{opacity:0}}`}</style></span>;
}

// ── Animated Emoji Avatar — with eye tracking ─────────────────────────────
function EmojiAvatar({ avatar, isSpeaking, isThinking, size=38, containerRef }) {
  const eyeRef = useRef(null);
  const [pupils, setPupils] = useState({l:{x:0,y:0},r:{x:0,y:0}});
  const animRef = useRef(null);
  const targetRef = useRef({l:{x:0,y:0},r:{x:0,y:0}});
  const idleTimer = useRef(null);
  const isIdle = useRef(false);

  useEffect(()=>{
    const container = containerRef?.current || document.body;
    const handleMove = (e)=>{
      if(!eyeRef.current) return;
      isIdle.current = false;
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(()=>{ isIdle.current=true; }, 2000);

      const rect = eyeRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top  + rect.height/2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx,dy) || 1;
      const maxMove = 3.5;
      const nx = (dx/dist)*Math.min(maxMove, dist*0.12);
      const ny = (dy/dist)*Math.min(maxMove, dist*0.10);
      // Left eye offset slightly left, right eye slightly right
      targetRef.current = { l:{x:nx-0.5,y:ny}, r:{x:nx+0.5,y:ny} };
    };
    window.addEventListener('mousemove', handleMove, {passive:true});

    // Smooth lerp animation
    let running = true;
    const lerp = (a,b,t)=>a+(b-a)*t;
    const tick = ()=>{
      if(!running) return;
      const tgt = isIdle.current
        ? {l:{x:0,y:0},r:{x:0,y:0}}
        : targetRef.current;
      setPupils(p=>({
        l:{ x:lerp(p.l.x,tgt.l.x,0.12), y:lerp(p.l.y,tgt.l.y,0.12) },
        r:{ x:lerp(p.r.x,tgt.r.x,0.12), y:lerp(p.r.y,tgt.r.y,0.12) },
      }));
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return ()=>{
      running=false;
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('mousemove', handleMove);
      clearTimeout(idleTimer.current);
    };
  },[containerRef]);

  const ac = avatar?.color || '#7c3aed';
  const isRobot = avatar?.id === 'robot';
  const isFox   = avatar?.id === 'fox';

  return (
    <motion.div
      animate={
        isThinking ? { rotate:[0,-8,8,-8,0], scale:1.0 } :
        isSpeaking ? { scale:[1,1.08,1,1.06,1], y:[0,-2,0,-1,0] } :
        { scale:1, rotate:0, y:0 }
      }
      transition={
        isThinking ? { duration:0.6, repeat:Infinity, ease:'easeInOut' } :
        isSpeaking ? { duration:0.5, repeat:Infinity, ease:'easeInOut' } :
        { duration:0.3 }
      }
      style={{ position:'relative', display:'flex', alignItems:'center',
               justifyContent:'center', flexShrink:0 }}>

      {/* Glow ring when speaking */}
      {isSpeaking && (
        <motion.div
          animate={{ scale:[1,1.3,1], opacity:[0.6,0.2,0.6] }}
          transition={{ duration:0.6, repeat:Infinity }}
          style={{ position:'absolute', inset:'-4px', borderRadius:'50%',
            background:`radial-gradient(circle,${ac}55,transparent)`,
            pointerEvents:'none' }}/>
      )}

      {/* Avatar face SVG */}
      <svg ref={eyeRef} width={size} height={size} viewBox="0 0 40 40"
        style={{ display:'block', borderRadius:'50%',
                 filter:isSpeaking?`drop-shadow(0 0 6px ${ac}88)`:'none',
                 transition:'filter 0.3s' }}>

        {/* Background circle */}
        <circle cx="20" cy="20" r="19" fill={ac} opacity="0.15"/>
        <circle cx="20" cy="20" r="18"
          fill={isRobot?'#1e2d42':isFox?'#e8622a':avatar?.skin||'#f5c5a0'}
          stroke={ac} strokeWidth="1.5"/>

        {/* Hair/head decoration */}
        {!isRobot && !isFox && avatar?.hair && (
          <path d="M4,18 Q4,4 20,3 Q36,4 36,18 Q34,8 20,7 Q6,8 4,18Z"
            fill={avatar.hair} opacity="0.9"/>
        )}
        {/* Hijab for muslimgirl */}
        {avatar?.id==='muslimgirl' && (
          <>
            <ellipse cx="20" cy="14" rx="14" ry="12" fill={avatar.hair||'#4c1d95'} opacity="0.9"/>
            <path d="M6,22 Q6,36 20,37 Q34,36 34,22 Q30,30 20,30 Q10,30 6,22Z"
              fill={avatar.hair||'#4c1d95'} opacity="0.9"/>
          </>
        )}
        {/* Sage hat */}
        {avatar?.id==='sage' && (
          <path d="M11,18 L20,4 L29,18Z" fill="#065f46" opacity="0.9"/>
        )}
        {/* Robot panel */}
        {isRobot && (
          <>
            <rect x="7" y="8" width="26" height="18" rx="4" fill="#2a4060" opacity="0.8"/>
            <rect x="17" y="4" width="6" height="5" rx="2" fill="#3a5870"/>
          </>
        )}
        {/* Fox ears */}
        {isFox && (
          <>
            <polygon points="8,16 13,6 18,16" fill={avatar.skin||'#e8622a'}/>
            <polygon points="22,16 27,6 32,16" fill={avatar.skin||'#e8622a'}/>
            <polygon points="10,15 13,8 16,15" fill="#ffd0a8"/>
            <polygon points="24,15 27,8 30,15" fill="#ffd0a8"/>
          </>
        )}
        {/* Spark spiky hair */}
        {avatar?.id==='spark' && (
          <g fill="#f59e0b" opacity="0.9">
            {[[20,3,1],[14,6,0.8],[26,6,0.8],[10,11,0.7],[30,11,0.7]].map(([x,y,s],i)=>(
              <polygon key={i} points={`${x},${y} ${x-3*s},${y+7*s} ${x+3*s},${y+7*s}`}/>
            ))}
          </g>
        )}

        {/* EYES */}
        {/* Left eye white */}
        <ellipse cx="14" cy="22" rx="4.5" ry="5" fill="white" opacity="0.95"/>
        {/* Right eye white */}
        <ellipse cx="26" cy="22" rx="4.5" ry="5" fill="white" opacity="0.95"/>

        {/* Left iris */}
        <circle cx={14+pupils.l.x} cy={22+pupils.l.y} r="2.8"
          fill={avatar?.irisColor||'#5c3015'}/>
        {/* Right iris */}
        <circle cx={26+pupils.r.x} cy={22+pupils.r.y} r="2.8"
          fill={avatar?.irisColor||'#5c3015'}/>

        {/* Pupils */}
        <circle cx={14+pupils.l.x} cy={22+pupils.l.y} r="1.5" fill="#0a0608"/>
        <circle cx={26+pupils.r.x} cy={22+pupils.r.y} r="1.5" fill="#0a0608"/>

        {/* Eye highlights */}
        <circle cx={14+pupils.l.x+1} cy={21+pupils.l.y} r="0.8" fill="white"/>
        <circle cx={26+pupils.r.x+1} cy={21+pupils.r.y} r="0.8" fill="white"/>

        {/* Robot eyes — glowing */}
        {isRobot && (
          <>
            <ellipse cx="14" cy="22" rx="4" ry="4" fill={ac} opacity="0.7"/>
            <ellipse cx="26" cy="22" rx="4" ry="4" fill={ac} opacity="0.7"/>
            <circle cx="14" cy="22" r="2" fill="white" opacity="0.9"/>
            <circle cx="26" cy="22" r="2" fill="white" opacity="0.9"/>
          </>
        )}

        {/* Blink animation */}
        {isThinking && (
          <g>
            <rect x="9.5" y="21" width="9" height="2" rx="1" fill={isRobot?ac:'#2a1200'}/>
            <rect x="21.5" y="21" width="9" height="2" rx="1" fill={isRobot?ac:'#2a1200'}/>
          </g>
        )}

        {/* Nose */}
        {!isRobot && !isFox && (
          <circle cx="20" cy="27" r="1.5" fill={avatar?.skin||'#e8a888'} opacity="0.7"/>
        )}
        {isFox && <circle cx="20" cy="27" r="2" fill="#1a0808"/>}

        {/* Mouth — changes with state */}
        {isThinking ? (
          <path d="M15,32 Q20,30 25,32" stroke="#2a1200" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        ) : isSpeaking ? (
          <ellipse cx="20" cy="32" rx="4" ry="2.5"
            fill={isRobot?ac:'#e06070'} opacity="0.9"/>
        ) : (
          <path d="M15,32 Q20,35 25,32" stroke={isRobot?ac:'#e06070'}
            strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        )}

        {/* Cheeks (for girl avatars) */}
        {(avatar?.id==='woman'||avatar?.id==='muslimgirl'||avatar?.id==='spark') && !isThinking && (
          <>
            <ellipse cx="11" cy="28" rx="3.5" ry="2" fill="#f4a0b0" opacity="0.35"/>
            <ellipse cx="29" cy="28" rx="3.5" ry="2" fill="#f4a0b0" opacity="0.35"/>
          </>
        )}

        {/* Robot LED strip */}
        {isRobot && isSpeaking && (
          <>
            {[0,1,2,3,4].map(i=>(
              <rect key={i} x={13+i*3} y={30} width="2" height="3" rx="1"
                fill={ac} opacity={0.5+Math.sin(i)*0.5}/>
            ))}
          </>
        )}
      </svg>

      {/* Thinking spinner */}
      {isThinking && (
        <motion.div
          animate={{ rotate:360 }}
          transition={{ duration:1, repeat:Infinity, ease:'linear' }}
          style={{ position:'absolute', top:'-4px', right:'-4px',
            width:'12px', height:'12px', borderRadius:'50%',
            border:`2px solid ${ac}44`, borderTopColor:ac }}/>
      )}
    </motion.div>
  );
}

// ── Confidence badge (preserved) ──────────────────────────────────────────
function ConfidenceBadge({ level }) {
  if (!level) return null;
  const cfg={
    high:  {color:'#22c55e',bg:'rgba(34,197,94,0.12)',icon:'✅',label:'HIGH'},
    medium:{color:'#f59e0b',bg:'rgba(245,158,11,0.12)',icon:'⚠️',label:'MEDIUM'},
    low:   {color:'#ef4444',bg:'rgba(239,68,68,0.12)',icon:'❓',label:'LOW'},
  }[level]||{};
  return (
    <div style={{display:'inline-flex',alignItems:'center',gap:'4px',
      background:cfg.bg,border:`1px solid ${cfg.color}44`,
      borderRadius:'12px',padding:'2px 8px',marginTop:'5px'}}>
      <span style={{fontSize:'0.65rem'}}>{cfg.icon}</span>
      <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.52rem',
        fontWeight:'700',color:cfg.color,letterSpacing:'0.08em'}}>CONFIDENCE: {cfg.label}</span>
    </div>
  );
}

// ── RememberCard (preserved) ──────────────────────────────────────────────
function RememberCard({ keywords, accentColor }) {
  const [dismissed,setDismissed]=useState(false);
  const [copied,setCopied]=useState(false);
  if(dismissed||!keywords?.length) return null;
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
      style={{background:`linear-gradient(135deg,${accentColor}18,${accentColor}08)`,
        border:`1.5px solid ${accentColor}55`,borderRadius:'12px',
        padding:'10px 12px',marginTop:'5px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'7px'}}>
        <span>🧠</span>
        <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.58rem',
          fontWeight:'700',color:accentColor}}>REMEMBER</span>
        <button onClick={()=>setDismissed(true)}
          style={{marginLeft:'auto',background:'none',border:'none',
            cursor:'pointer',color:'var(--text-muted)',fontSize:'0.75rem'}}>✕</button>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:'5px',marginBottom:'7px'}}>
        {keywords.map((kw,i)=>(
          <span key={kw} style={{background:`${accentColor}22`,
            border:`1px solid ${accentColor}55`,borderRadius:'16px',
            padding:'2px 9px',fontSize:'0.68rem',fontFamily:'Orbitron,sans-serif',
            fontWeight:'700',color:accentColor}}>{kw}</span>
        ))}
      </div>
      <button onClick={()=>{navigator.clipboard.writeText(keywords.join(', '));
        setCopied(true);setTimeout(()=>setCopied(false),1600);}}
        style={{background:`${accentColor}18`,border:`1px solid ${accentColor}44`,
          borderRadius:'7px',padding:'2px 9px',cursor:'pointer',
          fontFamily:'Orbitron,sans-serif',fontSize:'0.55rem',color:accentColor}}>
        {copied?'✅ Copied!':'📋 Copy'}
      </button>
    </motion.div>
  );
}

// ── QuizCard (preserved) ──────────────────────────────────────────────────
function QuizCard({ quiz, onFinish, accentColor }) {
  const [idx,setIdx]=useState(0);
  const [score,setScore]=useState(0);
  const [chosen,setChosen]=useState(null);
  const [done,setDone]=useState(false);
  if(!quiz?.length) return null;
  const q=quiz[idx];
  const answer=(opt)=>{
    if(chosen) return;
    setChosen(opt);
    if(opt===q.answer) setScore(s=>s+1);
    setTimeout(()=>{ if(idx<quiz.length-1){setIdx(i=>i+1);setChosen(null);}else setDone(true); },1200);
  };
  if(done){
    const pct=Math.round((score/quiz.length)*100);
    return (
      <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
        style={{background:`linear-gradient(135deg,${accentColor}14,${accentColor}06)`,
          border:`2px solid ${accentColor}55`,borderRadius:'14px',
          padding:'18px',textAlign:'center'}}>
        <div style={{fontSize:'2.2rem',marginBottom:'6px'}}>{pct>=80?'🏆':pct>=50?'👍':'💪'}</div>
        <p style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.75rem',color:accentColor,fontWeight:'700',margin:'0 0 4px'}}>QUIZ COMPLETE!</p>
        <p style={{fontFamily:'Syne,sans-serif',fontSize:'1.0rem',color:'var(--text-primary)',margin:'0 0 12px'}}>{score}/{quiz.length} — {pct}%</p>
        <button onClick={onFinish} style={{background:`${accentColor}`,border:'none',borderRadius:'9px',
          padding:'7px 18px',cursor:'pointer',fontFamily:'Orbitron,sans-serif',
          fontSize:'0.60rem',color:'white',fontWeight:'700'}}>DONE</button>
      </motion.div>
    );
  }
  return (
    <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
      style={{background:`linear-gradient(135deg,${accentColor}12,${accentColor}04)`,
        border:`2px solid ${accentColor}44`,borderRadius:'14px',padding:'14px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'9px'}}>
        <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.56rem',color:accentColor,fontWeight:'700'}}>Q {idx+1}/{quiz.length}</span>
        <div style={{height:'3px',flex:1,margin:'0 8px',background:'var(--bg-secondary)',borderRadius:'2px',overflow:'hidden'}}>
          <div style={{height:'100%',width:`${(idx/quiz.length)*100}%`,background:accentColor,borderRadius:'2px',transition:'width 0.4s'}}/>
        </div>
        <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.56rem',color:'var(--text-muted)'}}>🏆 {score}</span>
      </div>
      <p style={{fontFamily:'Syne,sans-serif',fontSize:'0.85rem',color:'var(--text-primary)',lineHeight:1.5,margin:'0 0 10px',fontWeight:'600'}}>{q.question}</p>
      <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
        {q.options.map((opt,i)=>{
          let bg='var(--bg-secondary)',border=`1px solid var(--border-color)`,color='var(--text-secondary)';
          if(chosen){ if(opt===q.answer){bg='rgba(34,197,94,0.16)';border='1.5px solid #22c55e';color='#22c55e';}
            else if(opt===chosen){bg='rgba(239,68,68,0.10)';border='1.5px solid #ef4444';color='#ef4444';} }
          return (
            <motion.button key={i} whileHover={!chosen?{scale:1.01}:{}} onClick={()=>answer(opt)}
              style={{background:bg,border,borderRadius:'9px',padding:'8px 12px',cursor:chosen?'default':'pointer',
                textAlign:'left',fontFamily:'Syne,sans-serif',fontSize:'0.78rem',color,
                transition:'all 0.2s',display:'flex',alignItems:'center',gap:'7px'}}>
              <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.55rem',color:accentColor,fontWeight:'700',flexShrink:0}}>{String.fromCharCode(65+i)}</span>
              {opt}
              {chosen&&opt===q.answer&&<span style={{marginLeft:'auto'}}>✅</span>}
              {chosen&&opt===chosen&&opt!==q.answer&&<span style={{marginLeft:'auto'}}>❌</span>}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

function RateLimitMessage({ onRetry }) {
  const [secs,setSecs]=useState(60);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const iv=setInterval(()=>{setSecs(s=>{if(s<=1){clearInterval(iv);setReady(true);return 0;}return s-1;});},1000);
    return()=>clearInterval(iv);
  },[]);
  return (
    <div>
      <p style={{margin:'0 0 5px'}}>⏳ Rate limited by Gemini API.</p>
      {!ready?(
        <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'1.2rem',color:'#f59e0b',fontWeight:'700',minWidth:'36px'}}>{secs}s</span>
          <div style={{flex:1,height:'5px',background:'rgba(245,158,11,0.2)',borderRadius:'3px',overflow:'hidden'}}>
            <div style={{height:'100%',width:`${(secs/60)*100}%`,background:'#f59e0b',transition:'width 1s linear'}}/>
          </div>
        </div>
      ):(
        <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={onRetry}
          style={{background:'var(--gradient-1)',border:'none',borderRadius:'7px',padding:'5px 14px',
            color:'white',fontFamily:'Orbitron,sans-serif',fontSize:'0.60rem',fontWeight:'700',cursor:'pointer'}}>
          ✅ Retry
        </motion.button>
      )}
    </div>
  );
}

function WakeToast({ name, color, onDone }) {
  useEffect(()=>{ const t=setTimeout(onDone,2200); return()=>clearTimeout(t); },[]);
  return (
    <motion.div initial={{opacity:0,y:18,scale:0.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-18}}
      style={{position:'fixed',bottom:'90px',left:'50%',transform:'translateX(-50%)',
        background:'var(--bg-card)',border:`2px solid ${color}`,borderRadius:'28px',
        padding:'9px 22px',zIndex:1000,display:'flex',alignItems:'center',gap:'9px',
        boxShadow:`0 4px 28px ${color}44`,backdropFilter:'blur(12px)'}}>
      <div style={{width:'9px',height:'9px',borderRadius:'50%',background:color,
        boxShadow:`0 0 9px ${color}`,animation:'wakePulse 0.6s ease-in-out infinite alternate'}}/>
      <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.70rem',fontWeight:'700',
        color,letterSpacing:'0.1em'}}>{name.toUpperCase()} ACTIVATED</span>
      <style>{`@keyframes wakePulse{from{transform:scale(1)}to{transform:scale(1.5)}}`}</style>
    </motion.div>
  );
}

// ── Dropdown helper ────────────────────────────────────────────────────────
function Dropdown({ trigger, children, isOpen, onClose }) {
  const ref = useRef(null);
  useEffect(()=>{
    if(!isOpen) return;
    const handler=(e)=>{ if(ref.current&&!ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown',handler);
    return()=>document.removeEventListener('mousedown',handler);
  },[isOpen,onClose]);
  return (
    <div ref={ref} style={{position:'relative',flexShrink:0}}>
      {trigger}
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{opacity:0,scale:0.95,y:-4}} animate={{opacity:1,scale:1,y:0}}
            exit={{opacity:0,scale:0.95,y:-4}} transition={{duration:0.12}}
            style={{position:'absolute',top:'calc(100% + 5px)',left:0,
              background:'var(--bg-card)',border:'1px solid var(--border-color)',
              borderRadius:'12px',zIndex:400,overflow:'hidden',
              boxShadow:'0 8px 32px rgba(0,0,0,0.3)',minWidth:'148px'}}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main ChatBox ──────────────────────────────────────────────────────────
export default function ChatBox({ onSpeakingChange, onKeywordsChange, onAvatarChange, onUserMessage, onLoadingChange }) {
  const { selectedAvatar, setSelectedAvatar, aiMode, setAvatarMood, AVATARS } = useAvatar();
  const { messages, addMessage, clearMessages, trackAvatarUsage } = useChat();

  // UI state
  const [input,         setInput]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [listening,     setListening]     = useState(false);
  const [lang,          setLang]          = useState(LANGUAGES[0]);
  const [voice,         setVoice]         = useState(VOICE_TYPES[0]);
  const [voiceOn,       setVoiceOn]       = useState(true);
  const [micOn,         setMicOn]         = useState(true);
  const [imgFile,       setImgFile]       = useState(null);
  const [imgPreview,    setImgPreview]    = useState(null);
  const [bubbleColor,   setBubbleColor]   = useState(BUBBLE_COLORS[0]);
  const [reactions,     setReactions]     = useState({});
  const [showReactions, setShowReactions] = useState(null);
  const [lastError,     setLastError]     = useState(null);
  const [wakeToast,     setWakeToast]     = useState(null);
  const [detectedLang,  setDetectedLang]  = useState(null);
  const [quizData,      setQuizData]      = useState(null);
  const [quizLoading,   setQuizLoading]   = useState(false);
  const [responseStyle, setResponseStyle] = useState(null);
  const [videoTrigger,   setVideoTrigger]  = useState(null);   // 'emotion'|'topic'|'playlist'|'focus'|'safety'
  const [videoEmotion,   setVideoEmotion]  = useState(null);
  const [videoTopic,     setVideoTopic]    = useState(null);
  const [lastUserMsg,    setLastUserMsg]   = useState('');
  const [mlData,        setMlData]        = useState(null);
  const [emotionHistory,setEmotionHistory]= useState([]);

  // Dropdown state — only one open at a time
  const [openDrop,      setOpenDrop]      = useState(null); // 'lang'|'voice'|'bubble'|'style'|'more'

  const endRef     = useRef(null);
  const fileRef    = useRef(null);
  const recRef     = useRef(null);
  const synth      = useRef(window.speechSynthesis);
  const greetedRef = useRef(new Set());
  const prevIdRef  = useRef(null);
  const chatRef    = useRef(null); // for eye tracking container
  const sessionId  = useRef('session_' + Date.now());

  const closeDrop = useCallback(()=>setOpenDrop(null),[]);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}); },[messages,loading]);

  // Avatar switch → fresh greeting
  useEffect(()=>{
    if(!selectedAvatar) return;
    const switched = prevIdRef.current && prevIdRef.current!==selectedAvatar.id;
    prevIdRef.current = selectedAvatar.id;
    if(switched){
      clearMessages(); greetedRef.current.clear();
      setLastError(null); onKeywordsChange?.([]); setQuizData(null);
      setMlData(null); setEmotionHistory([]);
    }
    if(greetedRef.current.has(selectedAvatar.id)) return;
    greetedRef.current.add(selectedAvatar.id);
    const g={
      woman:"Hi, I'm Aria! How can I help?",
      man:"Hey, I'm Axel. What do you need?",
      muslimgirl:"Hello, I'm Layla. What's on your mind?",
      fox:"Hey! I'm Foxy 🦊 What's up?",
      robot:"Hello. I'm NOVA. Ready.",
      sage:"Greetings. I am Sage.",
      spark:"YO! I'm Spark ⚡ Let's GO!",
    };
    setTimeout(()=>addMessage({
      role:'assistant',
      content:g[selectedAvatar.id]||`Hi, I'm ${selectedAvatar.name}!`,
      avatar:selectedAvatar.id, isGreeting:true,
    }),350);
  },[selectedAvatar?.id]);

  // ── Listen for mic input from FaceMirror video chat ───────────────────
  const sendRef = useRef(null);
  useEffect(()=>{
    const handler=(e)=>{
      const txt=e.detail?.text;
      if(txt&&txt.trim()&&sendRef.current) sendRef.current(txt.trim(), true);
    };
    window.addEventListener('facemirror-mic', handler);
    return ()=>window.removeEventListener('facemirror-mic', handler);
  },[]);

  // Pick a voice matching gender preference
  const pickVoice=useCallback((pref='female')=>{
    const voices=synth.current?.getVoices()||[];
    const eng=voices.filter(v=>v.lang.startsWith('en'));
    const pool=eng.length?eng:voices;
    const femKw=['female','woman','girl','zira','susan','victoria','karen','samantha','moira'];
    const malKw=['male','man','david','james','daniel','mark','alex','george'];
    const kws=pref==='female'?femKw:malKw;
    return pool.find(v=>kws.some(k=>v.name.toLowerCase().includes(k)))||pool[0]||null;
  },[]);

  const speak=useCallback((text)=>{
    if(!voiceOn||!synth.current) return;
    const langObj=LANGUAGES.find(l=>l.code===lang.code);
    if(langObj?.noTTS){ onSpeakingChange?.(true); setTimeout(()=>onSpeakingChange?.(false),2000); return; }
    synth.current.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang=lang.code;
    u.rate=selectedAvatar?.voice?.rate||voice.rate;
    u.pitch=selectedAvatar?.voice?.pitch||voice.pitch;
    u.volume=0.9;
    // Pick gender-appropriate voice
    const doSpeak=()=>{
      const picked=pickVoice(selectedAvatar?.voice?.voiceName||'female');
      if(picked) u.voice=picked;
      u.onstart=()=>onSpeakingChange?.(true);
      u.onend=()=>onSpeakingChange?.(false);
      u.onerror=()=>onSpeakingChange?.(false);
      synth.current.speak(u);
    };
    if(synth.current.getVoices().length) doSpeak();
    else synth.current.onvoiceschanged=doSpeak;
  },[voiceOn,lang,voice,selectedAvatar,onSpeakingChange,pickVoice]);

  const handleImg=e=>{
    const f=e.target.files[0]; if(!f) return;
    if(!f.type.startsWith('image/')){ alert('Please select an image file.'); return; }
    if(f.size>5*1024*1024){ alert('Image too large. Max 5MB.'); return; }
    setImgFile(f); setImgPreview(URL.createObjectURL(f));
  };
  const removeImg=()=>{
    if(imgPreview?.startsWith('blob:')) URL.revokeObjectURL(imgPreview);
    setImgFile(null); setImgPreview(null);
    if(fileRef.current) fileRef.current.value='';
  };

  const checkWakeWord=useCallback((text)=>{
    if(!text||!AVATARS) return false;
    const lower=text.toLowerCase().trim();
    for(const avatar of AVATARS){
      const name=avatar.name.toLowerCase();
      if(lower===name||lower===`hey ${name}`||lower.startsWith(`${name} `)){
        setSelectedAvatar(avatar); setWakeToast({name:avatar.name,color:avatar.color}); return true;
      }
    }
    return false;
  },[AVATARS,setSelectedAvatar]);

  // ── Send ────────────────────────────────────────────────────────────────
  const send=async(text,isVoice=false,isRetry=false)=>{
    sendRef.current=send; // keep ref updated
    if(!text.trim()&&!imgFile) return;
    if(loading) return;
    setLastError(null); onKeywordsChange?.([]);
    const detected=detectLanguage(text);
    if(detected&&detected.code!==lang.code){ setDetectedLang(detected); setLang(detected); setTimeout(()=>setDetectedLang(null),3000); }
    const historySnapshot=messages
      .filter(m=>!m.isGreeting&&!m.isError&&m.content?.trim())
      .map(m=>({role:m.role,content:m.content.trim()}))
      .slice(-6);
    const previewToStore=imgFile?imgPreview:null;
    if(!isRetry){
      addMessage({role:'user',content:text.trim()||'(image)',isVoice,imagePreview:previewToStore,hasImage:!!imgFile});
      trackAvatarUsage(selectedAvatar?.id);
      onUserMessage?.(text.trim());
    }
    setInput(''); setImgFile(null); setImgPreview(null);
    if(fileRef.current) fileRef.current.value='';
    setLoading(true); onLoadingChange?.(true);
    try{
      const systemPrompt=[selectedAvatar?.systemPrompt||'',`Mode: ${aiMode?.prompt||''}`,`Always respond in ${lang.label}.`].filter(Boolean).join('\n\n');
      let imageBase64=null,imageMimeType=null;
      if(imgFile){
        imageBase64=await new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(',')[1]);r.readAsDataURL(imgFile);});
        imageMimeType=imgFile.type;
      }
      const {data}=await axios.post('/api/chat',{
        message:text.trim()||'Describe this image.',
        avatarPersonality:systemPrompt, avatarName:selectedAvatar?.name,
        history:historySnapshot, imageBase64, imageMimeType,
        sessionId:sessionId.current, responseStyle, startTime:Date.now(),
      },{timeout:30000});
      const mood=extractMood(data.reply);
      const keywords=extractKeywords(data.reply);
      const confidence=extractConfidence(data.reply);
      const reply=cleanText(data.reply);
      if(data.ml?.primaryMood) setAvatarMood(data.ml.primaryMood);
      else if(mood) setAvatarMood(mood);
      if(data.ml){ setMlData(data.ml); if(data.ml.emotionHistory) setEmotionHistory(data.ml.emotionHistory); }
      if(keywords.length>0) onKeywordsChange?.(keywords);
      addMessage({role:'assistant',content:reply,avatar:selectedAvatar?.id,typewriter:true,keywords,confidence});
      speak(reply);
      playChime();
      // Detect if video recommendation should show
      // Always pass the user's actual message for topic detection
      const userMood = data.ml?.primaryMood || extractMood(data.reply) || 'neutral';
      const vTrigger = shouldShowVideos({ mood: userMood }, text);
      setVideoEmotion(userMood);
      setVideoTopic(detectTopic(text) || null);
      setLastUserMsg(text);
      setVideoTrigger(vTrigger);   // null clears it
    }catch(err){
      const errContent=parseError(err);
      setLastError({text,isVoice});
      addMessage({role:'assistant',content:errContent,isError:true,isRateLimit:errContent==='__RATELIMIT__',avatar:selectedAvatar?.id});
    }finally{
      setLoading(false); onLoadingChange?.(false);
    }
  };

  const handleMicClick=()=>{
    if(!micOn) return;
    if(listening){ try{recRef.current?.stop();}catch{} setListening(false); return; }
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ alert('Voice input requires Chrome or Edge.'); return; }
    const r=new SR(); r.lang='en-US'; r.continuous=false; r.interimResults=false; r.maxAlternatives=1;
    r.onstart=()=>setListening(true);
    r.onresult=e=>{
      const t=e.results[0]?.[0]?.transcript||''; setListening(false);
      if(!t.trim()) return;
      // Analyze mood from mic input
      const micAnalysis=analyzeVoiceText(t);
      if(micAnalysis?.mood) setAvatarMood(micAnalysis.mood);
      const wasWake=checkWakeWord(t); if(!wasWake) send(t.trim(),true);
    };
    r.onerror=e=>{ setListening(false); if(e.error==='not-allowed') alert('Microphone permission denied.'); };
    r.onend=()=>setListening(false);
    recRef.current=r; try{r.start();}catch(err){setListening(false);}
  };

  const startQuiz=async()=>{
    // Collect conversation context — include both user and assistant messages
    const ctx=messages
      .filter(m=>!m.isGreeting&&!m.isError&&m.content?.trim().length>5)
      .slice(-10)
      .map(m=>`${m.role==='user'?'User':'AI'}: ${m.content.trim()}`)
      .join('\n');
    if(!ctx){
      addMessage({role:'assistant',content:'Chat with me about any topic first, then hit Quiz Me! 🎓',avatar:selectedAvatar?.id,isGreeting:true});
      return;
    }
    setQuizLoading(true);
    try{
      const {data}=await axios.post('/api/chat',{
        message:`Based on our conversation below, create 4 multiple-choice quiz questions.
IMPORTANT: Respond with ONLY a raw JSON array. No markdown. No explanation. No code fences.
Start your response with [ and end with ].
Format: [{"question":"...","options":["A text","B text","C text","D text"],"answer":"exact matching option text"}]

Conversation:
${ctx}`,
        avatarPersonality:'You are a quiz generator. Output ONLY a valid JSON array starting with [ and ending with ]. Nothing else.',
        avatarName:'Quiz',history:[],sessionId:sessionId.current,
      },{timeout:35000});
      // Robust JSON extraction — find array boundaries
      let raw=(data.reply||'').replace(/```json|```/gi,'').trim();
      const s=raw.indexOf('['), e=raw.lastIndexOf(']');
      if(s===-1||e===-1||e<=s) throw new Error('No JSON array in response');
      const quiz=JSON.parse(raw.slice(s,e+1));
      const valid=(Array.isArray(quiz)?quiz:[]).filter(q=>q&&q.question&&Array.isArray(q.options)&&q.options.length>=2&&q.answer);
      if(valid.length>0) setQuizData(valid);
      else throw new Error('No valid questions');
    }catch(err){
      console.warn('Quiz err:',err?.message);
      addMessage({role:'assistant',content:'Quiz generation failed — please chat more about a topic, then try Quiz Me again! 🎓',avatar:selectedAvatar?.id,isGreeting:true});
    }
    finally{setQuizLoading(false);}
  };

  const toggleReaction=(msgId,emoji)=>{
    setReactions(p=>({...p,[msgId]:p[msgId]===emoji?null:emoji}));
    setShowReactions(null);
  };

  const accent = selectedAvatar?.color || '#7c3aed';
  const pill = {
    border:'1px solid var(--border-color)',borderRadius:'8px',padding:'5px 10px',
    background:'var(--bg-secondary)',color:'var(--text-secondary)',cursor:'pointer',
    fontFamily:'Orbitron,sans-serif',fontSize:'0.57rem',fontWeight:'600',
    display:'flex',alignItems:'center',gap:'4px',transition:'all 0.2s',whiteSpace:'nowrap',
  };

  return (
    <div ref={chatRef} onClick={()=>{ setShowReactions(null); closeDrop(); }}
      style={{ display:'flex',flexDirection:'column',height:'100%',
        background:'var(--bg-secondary)',borderRadius:'16px',
        border:'1px solid var(--border-color)',overflow:'hidden' }}>

      <AnimatePresence>{wakeToast&&<WakeToast name={wakeToast.name} color={wakeToast.color} onDone={()=>setWakeToast(null)}/>}</AnimatePresence>

      {/* Auto-lang banner */}
      <AnimatePresence>
        {detectedLang&&(
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            style={{background:`${accent}16`,borderBottom:`1px solid ${accent}44`,padding:'4px 14px',
              display:'flex',alignItems:'center',gap:'7px',flexShrink:0}}>
            <span style={{fontSize:'0.63rem'}}>🌍</span>
            <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.56rem',color:accent,fontWeight:'700'}}>
              AUTO-DETECTED: {detectedLang.flag} {detectedLang.label.toUpperCase()}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div style={{ padding:'10px 14px',borderBottom:'1px solid var(--border-color)',
        display:'flex',alignItems:'center',gap:'10px',
        background:'var(--bg-card)',flexShrink:0 }}>

        {/* Animated emoji avatar */}
        <EmojiAvatar avatar={selectedAvatar} isSpeaking={loading===false&&false}
          isThinking={loading} size={40} containerRef={chatRef}/>

        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
            <span style={{ fontFamily:'Orbitron,sans-serif',fontSize:'0.65rem',
              fontWeight:'700',color:accent,letterSpacing:'0.06em' }}>
              {selectedAvatar?.name?.toUpperCase()||'AI'}
            </span>
            <span style={{ fontSize:'0.60rem',color:'var(--text-muted)',
              fontFamily:'Syne,sans-serif' }}>
              {selectedAvatar?.description}
            </span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'5px',marginTop:'2px'}}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',
              background:'#22c55e',boxShadow:'0 0 6px #22c55e'}}/>
            <span style={{fontFamily:'Syne,sans-serif',fontSize:'0.60rem',
              color:'var(--text-muted)'}}>{aiMode?.icon} {aiMode?.label}</span>
          </div>
        </div>

        <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.57rem',
          color:'var(--text-muted)'}}>{messages.length}</span>
        <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
          onClick={()=>{ clearMessages(); greetedRef.current.clear(); setLastError(null);
            onKeywordsChange?.([]); setQuizData(null); setMlData(null); setEmotionHistory([]); }}
          style={{ background:'rgba(239,68,68,0.10)',border:'1px solid rgba(239,68,68,0.28)',
            borderRadius:'7px',padding:'4px 9px',cursor:'pointer',
            fontFamily:'Orbitron,sans-serif',fontSize:'0.56rem',color:'#ef4444',fontWeight:'600' }}>
          🗑️ Clear
        </motion.button>
      </div>

      {/* ── TOOLBAR ────────────────────────────────────────────────── */}
      <div onClick={e=>e.stopPropagation()}
        style={{ padding:'6px 12px',borderBottom:'1px solid var(--border-color)',
          background:'var(--bg-card)',display:'flex',gap:'5px',
          alignItems:'center',flexWrap:'wrap',flexShrink:0 }}>

        {/* Language dropdown */}
        <Dropdown isOpen={openDrop==='lang'} onClose={closeDrop}
          trigger={
            <button style={pill} onClick={()=>setOpenDrop(openDrop==='lang'?null:'lang')}>
              {lang.flag} {lang.label} ▾
            </button>
          }>
          {LANGUAGES.map(l=>(
            <button key={l.code} onClick={()=>{setLang(l);closeDrop();}}
              style={{...pill,border:'none',borderRadius:0,width:'100%',
                justifyContent:'flex-start',
                background:l.code===lang.code?'var(--accent-glow)':'transparent',
                color:l.code===lang.code?'var(--accent-1)':'var(--text-secondary)'}}>
              {l.flag} {l.label}{l.noTTS?' (no voice)':''}
            </button>
          ))}
        </Dropdown>

        {/* More settings dropdown (voice + bubble) */}
        <Dropdown isOpen={openDrop==='more'} onClose={closeDrop}
          trigger={
            <button style={pill} onClick={()=>setOpenDrop(openDrop==='more'?null:'more')}>
              ⚙️ Settings ▾
            </button>
          }>
          <div style={{padding:'10px 12px'}}>
            <p style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.50rem',
              color:'var(--text-muted)',marginBottom:'6px',letterSpacing:'0.08em'}}>VOICE TYPE</p>
            <div style={{display:'flex',flexDirection:'column',gap:'3px',marginBottom:'10px'}}>
              {VOICE_TYPES.map(v=>(
                <button key={v.id} onClick={()=>{setVoice(v);}}
                  style={{...pill,border:'none',borderRadius:'6px',width:'100%',
                    justifyContent:'flex-start',
                    background:v.id===voice.id?'var(--accent-glow)':'transparent',
                    color:v.id===voice.id?'var(--accent-1)':'var(--text-secondary)'}}>
                  🔊 {v.label}
                </button>
              ))}
            </div>
            <p style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.50rem',
              color:'var(--text-muted)',marginBottom:'6px',letterSpacing:'0.08em'}}>BUBBLE COLOR</p>
            <div style={{display:'flex',gap:'7px',flexWrap:'wrap'}}>
              {BUBBLE_COLORS.map(bc=>(
                <motion.button key={bc.id} whileHover={{scale:1.2}} whileTap={{scale:0.9}}
                  onClick={()=>{setBubbleColor(bc);}}
                  style={{width:'24px',height:'24px',borderRadius:'50%',background:bc.color,
                    border:bubbleColor.id===bc.id?'2.5px solid white':'2px solid transparent',
                    cursor:'pointer',transition:'all 0.2s'}}/>
              ))}
            </div>
          </div>
        </Dropdown>

        {/* Image upload */}
        <button style={pill} onClick={()=>fileRef.current?.click()}>📷 Image</button>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImg}/>

        {/* Style dropdown — overlay, next to Quiz Me */}
        <Dropdown isOpen={openDrop==='style'} onClose={closeDrop}
          trigger={
            <button style={{...pill,
              background:responseStyle?`${accent}18`:'var(--bg-secondary)',
              border:`1px solid ${responseStyle?accent:'var(--border-color)'}`,
              color:responseStyle?accent:'var(--text-secondary)'}}
              onClick={()=>setOpenDrop(openDrop==='style'?null:'style')}>
              {STYLE_OPTIONS.find(s=>s.id===responseStyle)?.icon||'💬'} Style ▾
            </button>
          }>
          {STYLE_OPTIONS.map(s=>(
            <button key={String(s.id)} onClick={()=>{setResponseStyle(s.id);closeDrop();}}
              style={{...pill,border:'none',borderRadius:0,width:'100%',
                justifyContent:'flex-start',
                background:responseStyle===s.id?'var(--accent-glow)':'transparent',
                color:responseStyle===s.id?'var(--accent-1)':'var(--text-secondary)'}}>
              {s.icon} {s.label}
            </button>
          ))}
        </Dropdown>

        {/* Quiz Me */}
        <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
          onClick={startQuiz} disabled={quizLoading}
          style={{...pill,background:`${accent}20`,border:`1px solid ${accent}44`,
            color:accent,fontWeight:'700'}}>
          {quizLoading?'⏳':'🧪'} {quizLoading?'Generating...':'Quiz Me!'}
        </motion.button>

        {/* Voice ON/OFF */}
        <button onClick={()=>{setVoiceOn(!voiceOn);if(voiceOn){synth.current?.cancel();onSpeakingChange?.(false);}}}
          style={{...pill,
            background:voiceOn?'var(--accent-glow)':'var(--bg-secondary)',
            color:voiceOn?'var(--accent-1)':'var(--text-muted)',
            border:`1px solid ${voiceOn?'var(--border-glow)':'var(--border-color)'}`}}>
          {voiceOn?'🔊':'🔇'}
        </button>
      </div>

      {/* Image preview */}
      {imgPreview&&(
        <div style={{padding:'7px 12px',background:'var(--bg-card)',
          borderBottom:'1px solid var(--border-color)',
          display:'flex',alignItems:'center',gap:'9px',flexShrink:0}}>
          <img src={imgPreview} alt="upload" style={{width:'42px',height:'42px',
            objectFit:'cover',borderRadius:'7px',border:'1px solid var(--border-color)'}}/>
          <span style={{fontFamily:'Syne,sans-serif',fontSize:'0.70rem',color:'var(--text-secondary)',flex:1}}>
            Image ready
          </span>
          <button onClick={removeImg} style={{background:'rgba(239,68,68,0.12)',
            border:'1px solid #ef444444',borderRadius:'6px',color:'#ef4444',
            cursor:'pointer',padding:'3px 7px',fontSize:'0.68rem'}}>✕</button>
        </div>
      )}

      {/* Quiz panel */}
      <AnimatePresence>
        {quizData&&(
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}}
            exit={{opacity:0,height:0}}
            style={{padding:'10px',borderBottom:'1px solid var(--border-color)',
              background:'var(--bg-card)',flexShrink:0}}>
            <QuizCard quiz={quizData} onFinish={()=>setQuizData(null)} accentColor={accent}/>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MESSAGES ───────────────────────────────────────────────── */}
      <div style={{ flex:1,overflowY:'auto',padding:'14px 12px',
        display:'flex',flexDirection:'column',gap:'12px' }}>
        <AnimatePresence initial={false}>
          {messages.map(msg=>(
            <motion.div key={msg.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
              transition={{duration:0.18}}>
              <div style={{ display:'flex',
                justifyContent:msg.role==='user'?'flex-end':'flex-start',
                alignItems:'flex-end',gap:'8px' }}>

                {/* Bot avatar — emoji, animated */}
                {msg.role==='assistant'&&(
                  <motion.div
                    initial={{scale:0.8,opacity:0}}
                    animate={{scale:1,opacity:1}}
                    transition={{duration:0.2}}>
                    <EmojiAvatar
                      avatar={selectedAvatar}
                      isSpeaking={false}
                      isThinking={false}
                      size={34}
                      containerRef={chatRef}/>
                  </motion.div>
                )}

                <div style={{ display:'flex',flexDirection:'column',gap:'3px',
                  maxWidth:'78%',alignItems:msg.role==='user'?'flex-end':'flex-start' }}>
                  <div className={msg.role==='user'?'user-bubble':'ai-bubble'}
                    style={{
                      ...(msg.role==='user'?{background:bubbleColor.color}:{}),
                      ...(msg.isError?{borderColor:'#ef444444',background:'rgba(239,68,68,0.06)',
                        borderWidth:'1px',borderStyle:'solid'}:{}),
                    }}>
                    {msg.imagePreview&&(
                      <img src={msg.imagePreview} alt="sent"
                        onError={e=>e.target.style.display='none'}
                        style={{maxWidth:'150px',maxHeight:'110px',objectFit:'cover',
                          borderRadius:'7px',marginBottom:'6px',display:'block'}}/>
                    )}
                    {msg.isRateLimit ? (
                      <RateLimitMessage onRetry={()=>{ if(lastError) send(lastError.text,lastError.isVoice,true); }}/>
                    ) : (
                      <p style={{fontFamily:'Syne,sans-serif',fontSize:'0.83rem',
                        lineHeight:'1.6',margin:0,whiteSpace:'pre-wrap'}}>
                        {msg.typewriter&&msg.role==='assistant'
                          ? <TypewriterText text={msg.content}/>
                          : msg.content}
                      </p>
                    )}
                    <ConfidenceBadge level={msg.confidence}/>
                    {msg.isVoice&&<span style={{fontSize:'0.54rem',color:'var(--text-muted)',
                      marginTop:'2px',display:'block'}}>🎤 voice</span>}
                    {msg.isError&&!msg.isRateLimit&&lastError&&(
                      <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                        onClick={()=>send(lastError.text,lastError.isVoice,true)}
                        style={{marginTop:'7px',background:'var(--gradient-1)',border:'none',
                          borderRadius:'7px',padding:'4px 11px',color:'white',
                          fontFamily:'Orbitron,sans-serif',fontSize:'0.58rem',
                          fontWeight:'700',cursor:'pointer'}}>
                        🔁 Retry
                      </motion.button>
                    )}
                  </div>

                  {/* Copy + reactions */}
                  <div style={{display:'flex',gap:'3px',alignItems:'center',opacity:0.6}}>
                    <motion.button whileHover={{scale:1.18,opacity:1}} whileTap={{scale:0.9}}
                      onClick={()=>navigator.clipboard.writeText(msg.content)}
                      style={{background:'transparent',border:'none',cursor:'pointer',
                        fontSize:'0.63rem',padding:'2px 4px',color:'var(--text-muted)'}}>📋</motion.button>
                    <div style={{position:'relative'}}>
                      <motion.button whileHover={{scale:1.18}} whileTap={{scale:0.9}}
                        onClick={e=>{e.stopPropagation();setShowReactions(showReactions===msg.id?null:msg.id);}}
                        style={{background:'transparent',border:'none',cursor:'pointer',
                          fontSize:'0.63rem',padding:'2px 4px',color:'var(--text-muted)'}}>
                        {reactions[msg.id]||'😊'}
                      </motion.button>
                      <AnimatePresence>
                        {showReactions===msg.id&&(
                          <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}}
                            exit={{opacity:0,scale:0.8}} onClick={e=>e.stopPropagation()}
                            style={{position:'absolute',bottom:'calc(100% + 5px)',
                              left:msg.role==='user'?'auto':'0',
                              right:msg.role==='user'?'0':'auto',
                              background:'var(--bg-card)',border:'1px solid var(--border-color)',
                              borderRadius:'18px',padding:'5px 9px',display:'flex',
                              gap:'5px',zIndex:200,boxShadow:'var(--shadow-card)'}}>
                            {REACTIONS.map(emoji=>(
                              <motion.button key={emoji} whileHover={{scale:1.3}} whileTap={{scale:0.9}}
                                onClick={()=>toggleReaction(msg.id,emoji)}
                                style={{background:reactions[msg.id]===emoji?'var(--accent-glow)':'transparent',
                                  border:'none',cursor:'pointer',fontSize:'1.0rem',
                                  padding:'2px',borderRadius:'5px',lineHeight:1}}>
                                {emoji}
                              </motion.button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <AnimatePresence>
                    {msg.role==='assistant'&&msg.keywords?.length>0&&(
                      <div style={{paddingLeft:'2px'}}>
                        <RememberCard keywords={msg.keywords} accentColor={accent}/>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* User avatar */}
                {msg.role==='user'&&(
                  <div style={{width:'30px',height:'30px',borderRadius:'50%',
                    background:'var(--gradient-1)',display:'flex',alignItems:'center',
                    justifyContent:'center',fontSize:'13px',flexShrink:0}}>
                    👤
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Thinking indicator with avatar */}
        {loading&&(
          <div style={{display:'flex',alignItems:'flex-end',gap:'8px'}}>
            <EmojiAvatar avatar={selectedAvatar} isSpeaking={false}
              isThinking={true} size={34} containerRef={chatRef}/>
            <TypingIndicator avatarName={selectedAvatar?.name}/>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* ── Video Recommendations ───────────────────────── */}
      {videoTrigger&&(
        <div style={{padding:'0 12px 4px'}}>
          <VideoRecommendation
            trigger={videoTrigger}
            emotion={videoEmotion}
            topic={videoTopic}
            message={lastUserMsg}
            accentColor={accent}
            onDismiss={()=>setVideoTrigger(null)}/>
        </div>
      )}

      {/* ML Panel */}
      {mlData&&(
        <div style={{padding:'7px 12px',background:'var(--bg-card)',
          borderTop:'1px solid var(--border-color)',flexShrink:0}}>
          <MLPanel mlData={mlData} emotionHistory={emotionHistory} accentColor={accent}/>
        </div>
      )}

      {/* Suggested questions */}
      {messages.length<=2&&(
        <div style={{padding:'6px 12px',background:'var(--bg-card)',
          borderTop:'1px solid var(--border-color)',
          display:'flex',gap:'5px',flexWrap:'wrap',alignItems:'center',flexShrink:0}}>
          <span style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.52rem',
            color:'var(--text-muted)',letterSpacing:'0.08em',flexShrink:0}}>TRY:</span>
          {(SUGGESTED[selectedAvatar?.id]||SUGGESTED.woman).map((q,i)=>(
            <motion.button key={i} whileHover={{scale:1.03}} whileTap={{scale:0.97}}
              onClick={()=>send(q)}
              style={{background:'var(--bg-secondary)',border:'1px solid var(--border-color)',
                borderRadius:'18px',padding:'4px 10px',cursor:'pointer',
                fontFamily:'Syne,sans-serif',fontSize:'0.70rem',
                color:'var(--text-secondary)',transition:'all 0.2s'}}>
              {q}
            </motion.button>
          ))}
        </div>
      )}

      {/* ── INPUT BAR ──────────────────────────────────────────────── */}
      <div style={{ padding:'10px 12px',borderTop:'1px solid var(--border-color)',
        background:'var(--bg-card)',display:'flex',gap:'7px',
        alignItems:'center',flexShrink:0 }}>
        <motion.button whileHover={{scale:micOn?1.1:1}} whileTap={{scale:micOn?0.9:1}}
          onClick={handleMicClick}
          style={{ width:'36px',height:'36px',borderRadius:'50%',
            border:listening?'2px solid #ef4444':'1px solid var(--border-color)',
            background:listening?'rgba(239,68,68,0.14)':'var(--bg-secondary)',
            cursor:micOn?'pointer':'not-allowed',display:'flex',
            alignItems:'center',justifyContent:'center',fontSize:'14px',
            flexShrink:0,opacity:micOn?1:0.4,transition:'all 0.2s' }}>
          {listening?'🔴':'🎤'}
        </motion.button>

        <input value={input}
          onChange={e=>{
            setInput(e.target.value);
            const v=e.target.value;
            if(v.length>5&&v.length%8===0){
              axios.post('/api/predict-emotion',{text:v,sessionId:sessionId.current})
                .then(r=>{ if(r.data?.prediction?.mood) setAvatarMood(r.data.prediction.mood); })
                .catch(()=>{});
            }
          }}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input);}}}
          placeholder={imgFile?'Question about image...':`Message ${selectedAvatar?.name||'AI'}...`}
          style={{ flex:1,background:'var(--bg-secondary)',
            border:'1px solid var(--border-color)',borderRadius:'10px',
            padding:'9px 13px',color:'var(--text-primary)',
            fontFamily:'Syne,sans-serif',fontSize:'0.83rem',
            outline:'none',transition:'border-color 0.3s' }}
          onFocus={e=>e.target.style.borderColor='var(--border-glow)'}
          onBlur={e=>e.target.style.borderColor='var(--border-color)'}/>

        <motion.button whileHover={{scale:1.06}} whileTap={{scale:0.94}}
          onClick={()=>send(input)} disabled={(!input.trim()&&!imgFile)||loading}
          style={{ width:'36px',height:'36px',borderRadius:'10px',border:'none',
            background:(input.trim()||imgFile)&&!loading?'var(--gradient-1)':'var(--bg-secondary)',
            cursor:(input.trim()||imgFile)&&!loading?'pointer':'not-allowed',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:'15px',flexShrink:0,transition:'all 0.3s',
            boxShadow:(input.trim()||imgFile)&&!loading?`0 4px 14px ${accent}44`:'none' }}>
          {loading
            ? <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:'linear'}}
                style={{width:'13px',height:'13px',borderRadius:'50%',
                  border:'2px solid var(--text-muted)',borderTopColor:'var(--accent-1)'}}/>
            : '➤'}
        </motion.button>
      </div>
    </div>
  );
}
