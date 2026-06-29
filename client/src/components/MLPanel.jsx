import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmotionGraph from './EmotionGraph';

/**
 * ML Panel — shows all ML insights in real time
 * Features: personality, emotion, hidden emotion, sarcasm, game profile, keywords
 */
export default function MLPanel({ mlData, emotionHistory, accentColor }) {
  const [open, setOpen] = useState(false);
  if (!mlData) return null;

  const {
    personality, emotions, hiddenEmotion, sarcasm,
    gameProfile, emotionScore, userKeywords
  } = mlData;

  const personalityIcons = { formal:'🎩', casual:'😎', expressive:'🎉', neutral:'😐' };
  const emotionColors    = { happy:'#22c55e', sad:'#60a5fa', angry:'#ef4444', fear:'#a78bfa', surprise:'#f59e0b', joy:'#22c55e', neutral:'#94a3b8', anticipation:'#f97316', trust:'#14b8a6', disgust:'#84cc16' };

  return (
    <div style={{ marginBottom:'8px' }}>
      {/* Toggle button */}
      <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
        onClick={()=>setOpen(!open)}
        style={{ width:'100%', background:`${accentColor}14`, border:`1px solid ${accentColor}44`, borderRadius:'10px', padding:'8px 14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', fontFamily:'Orbitron,sans-serif', fontSize:'0.60rem', color:accentColor, fontWeight:'700', letterSpacing:'0.06em' }}>
        <span>🧠 ML INSIGHTS</span>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          {hiddenEmotion && <span style={{ background:'rgba(239,68,68,0.15)', border:'1px solid #ef444450', borderRadius:'10px', padding:'1px 7px', fontSize:'0.55rem', color:'#ef4444' }}>🎭 HIDDEN</span>}
          {sarcasm       && <span style={{ background:'rgba(245,158,11,0.15)', border:'1px solid #f59e0b50', borderRadius:'10px', padding:'1px 7px', fontSize:'0.55rem', color:'#f59e0b' }}>😏 SARCASM</span>}
          <span>{open?'▲':'▼'}</span>
        </div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
            style={{ overflow:'hidden' }}>
            <div style={{ paddingTop:'8px', display:'flex', flexDirection:'column', gap:'8px' }}>

              {/* Emotion Graph */}
              <EmotionGraph history={emotionHistory} accentColor={accentColor}/>

              {/* Row 1: Personality + Emotion */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {/* Personality */}
                <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'12px', padding:'10px' }}>
                  <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.55rem', color:'var(--text-muted)', marginBottom:'6px', letterSpacing:'0.08em' }}>PERSONALITY</p>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ fontSize:'1.2rem' }}>{personalityIcons[personality]||'😐'}</span>
                    <span style={{ fontFamily:'Syne,sans-serif', fontSize:'0.78rem', color:'var(--text-primary)', fontWeight:'600', textTransform:'capitalize' }}>{personality}</span>
                  </div>
                </div>

                {/* Dual Emotions */}
                <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'12px', padding:'10px' }}>
                  <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.55rem', color:'var(--text-muted)', marginBottom:'6px', letterSpacing:'0.08em' }}>EMOTIONS</p>
                  <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                    {emotions.slice(0,2).map((e,i)=>(
                      <span key={e} style={{ background:(emotionColors[e]||'#94a3b8')+'22', border:`1px solid ${emotionColors[e]||'#94a3b8'}55`, borderRadius:'10px', padding:'2px 8px', fontSize:'0.65rem', fontFamily:'Syne,sans-serif', color:emotionColors[e]||'#94a3b8', fontWeight:'600' }}>
                        {i===0?'●':'○'} {e}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Hidden Emotion + Sarcasm alerts */}
              {(hiddenEmotion||sarcasm) && (
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  {hiddenEmotion && (
                    <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'10px', padding:'8px 12px', display:'flex', alignItems:'center', gap:'8px' }}>
                      <span style={{ fontSize:'1rem' }}>🎭</span>
                      <div>
                        <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.58rem', color:'#ef4444', fontWeight:'700', margin:0 }}>HIDDEN EMOTION DETECTED</p>
                        <p style={{ fontFamily:'Syne,sans-serif', fontSize:'0.68rem', color:'var(--text-muted)', margin:0 }}>User may be masking negative feelings</p>
                      </div>
                    </div>
                  )}
                  {sarcasm && (
                    <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'10px', padding:'8px 12px', display:'flex', alignItems:'center', gap:'8px' }}>
                      <span style={{ fontSize:'1rem' }}>😏</span>
                      <div>
                        <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.58rem', color:'#f59e0b', fontWeight:'700', margin:0 }}>SARCASM DETECTED</p>
                        <p style={{ fontFamily:'Syne,sans-serif', fontSize:'0.68rem', color:'var(--text-muted)', margin:0 }}>Response tone adjusted automatically</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* User Keywords */}
              {userKeywords?.length>0 && (
                <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'12px', padding:'10px' }}>
                  <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.55rem', color:'var(--text-muted)', marginBottom:'7px', letterSpacing:'0.08em' }}>KEY TERMS (TF-IDF)</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                    {userKeywords.map(kw=>(
                      <span key={kw} style={{ background:accentColor+'18', border:`1px solid ${accentColor}44`, borderRadius:'10px', padding:'2px 9px', fontSize:'0.65rem', fontFamily:'JetBrains Mono,monospace', color:accentColor }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Game Profile */}
              {gameProfile && (
                <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'12px', padding:'10px' }}>
                  <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.55rem', color:'var(--text-muted)', marginBottom:'8px', letterSpacing:'0.08em' }}>GAMIFICATION</p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'8px' }}>
                    {[
                      { label:'SCORE',   value:gameProfile.score,     color:'#f59e0b' },
                      { label:'LEVEL',   value:`L${gameProfile.level}`,color:accentColor },
                      { label:'STREAK',  value:`${gameProfile.streak}🔥`,color:'#ef4444' },
                      { label:'ACCURACY',value:gameProfile.totalAnswers>0?`${Math.round((gameProfile.correctAnswers/gameProfile.totalAnswers)*100)}%`:'—', color:'#22c55e' },
                    ].map(s=>(
                      <div key={s.label} style={{ textAlign:'center', background:'var(--bg-secondary)', borderRadius:'8px', padding:'6px' }}>
                        <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.85rem', color:s.color, fontWeight:'700', margin:0 }}>{s.value}</p>
                        <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.48rem', color:'var(--text-muted)', margin:0, letterSpacing:'0.06em' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Difficulty badge */}
                  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.55rem', color:'var(--text-muted)' }}>QUIZ DIFFICULTY:</span>
                    <span style={{ background:gameProfile.quizDifficulty==='hard'?'rgba(239,68,68,0.15)':gameProfile.quizDifficulty==='medium'?'rgba(245,158,11,0.15)':'rgba(34,197,94,0.15)', border:`1px solid ${gameProfile.quizDifficulty==='hard'?'#ef4444':gameProfile.quizDifficulty==='medium'?'#f59e0b':'#22c55e'}55`, borderRadius:'10px', padding:'2px 9px', fontSize:'0.60rem', fontFamily:'Orbitron,sans-serif', fontWeight:'700', color:gameProfile.quizDifficulty==='hard'?'#ef4444':gameProfile.quizDifficulty==='medium'?'#f59e0b':'#22c55e', textTransform:'uppercase' }}>
                      {gameProfile.quizDifficulty}
                    </span>
                  </div>
                  {/* Badges */}
                  {gameProfile.badges?.length>0&&(
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'8px' }}>
                      {gameProfile.badges.map(b=>(
                        <span key={b.id} title={b.desc} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid var(--border-color)', borderRadius:'10px', padding:'2px 8px', fontSize:'0.65rem', fontFamily:'Syne,sans-serif', color:'var(--text-secondary)' }}>{b.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
