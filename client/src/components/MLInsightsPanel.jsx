import { motion, AnimatePresence } from 'framer-motion';

// ── Language detection patterns ───────────────────────────────────────────
const LANG_DETECT = [
  { code:'ta', label:'Tamil',    flag:'🇮🇳', re:/[஀-௿]/ },
  { code:'te', label:'Telugu',   flag:'🇮🇳', re:/[ఀ-౿]/ },
  { code:'hi', label:'Hindi',    flag:'🇮🇳', re:/[ऀ-ॿ]/ },
  { code:'ar', label:'Arabic',   flag:'🇸🇦', re:/[؀-ۿ]/ },
  { code:'ja', label:'Japanese', flag:'🇯🇵', re:/[぀-ヿ]/ },
  { code:'zh', label:'Chinese',  flag:'🇨🇳', re:/[一-鿿]/ },
  { code:'ko', label:'Korean',   flag:'🇰🇷', re:/[가-힯]/ },
  { code:'de', label:'German',   flag:'🇩🇪', re:/\b(ich|und|ist|das|der|die|nicht)\b/i },
  { code:'fr', label:'French',   flag:'🇫🇷', re:/\b(je|tu|est|une|les|pour|avec)\b/i },
  { code:'es', label:'Spanish',  flag:'🇪🇸', re:/\b(yo|tú|pero|para|con|que|como)\b/i },
];
function detectLang(text) {
  for (const p of LANG_DETECT) { if (p.re.test(text)) return p; }
  return null;
}

/**
 * MLInsightsPanel — real-time text analysis after every user message
 * Features: Mood detection, Sarcasm detection, Behavioral pattern
 * Pure client-side NLP — no extra API calls
 */

// ── Lightweight lexicon-based mood classifier ─────────────────────────────
const MOOD_LEXICON = {
  happy:      { words:['happy','great','love','amazing','wonderful','fantastic','joy','yay','awesome','excellent','perfect','glad','thanks','thank','good','nice','brilliant','enjoy','fun','😊','😄','❤️','🎉'], score: 1 },
  excited:    { words:['excited','thrilled','incredible','wow','omg','unbelievable','cant wait','so cool','epic','woot','yesss','lets go','amazing','pumped','hyped','🤩','🔥','⚡'], score: 1 },
  sad:        { words:['sad','unhappy','depressed','crying','tears','lonely','hopeless','miserable','disappointed','hurt','miss','grief','broken','😢','😭','💔'], score: -1 },
  angry:      { words:['angry','mad','furious','hate','rage','frustrated','annoyed','irritated','upset','outraged','terrible','awful','worst','😠','😤','🤬'], score: -1 },
  frustrated: { words:['frustrated','stuck','confused','cant figure','not working','broken','why wont','ugh','argh','help','problem','issue','error','doesnt work'], score: -0.7 },
  neutral:    { words:['okay','fine','alright','whatever','maybe','perhaps','think','know','need','want'], score: 0 },
};

// Sarcasm patterns (from Sarcasm Corpus V2)
const SARCASM_PATTERNS = [
  /oh (sure|yeah|right|great|wonderful|perfect|absolutely)/i,
  /yeah (right|sure|obviously)/i,
  /totally (not|fine|great|helpful)/i,
  /wow (thanks|helpful|brilliant|genius)/i,
  /great job/i, /nice going/i, /as if/i,
  /oh how (helpful|useful|clever|convenient)/i,
  /right\.\.\./i, /sure\.\.\./i, /obviously\./i,
  /thanks for nothing/i, /what a surprise/i, /no way\./i,
];

export function analyzeText(text) {
  if (!text || text.trim().length < 3) return null;
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  // Mood scoring
  const scores = {};
  for (const [mood, data] of Object.entries(MOOD_LEXICON)) {
    let count = 0;
    for (const w of data.words) {
      if (lower.includes(w)) count++;
    }
    if (count > 0) scores[mood] = count;
  }

  const sorted = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  const topMood = sorted[0]?.[0] || 'neutral';
  const topCount = sorted[0]?.[1] || 1;
  const totalMatches = sorted.reduce((s,[,c])=>s+c, 0) || 1;
  const confidence = Math.min(99, Math.round((topCount / totalMatches) * 100 * (1 + topCount * 0.1)));

  // Sarcasm
  const sarcasmMatches = SARCASM_PATTERNS.filter(p => p.test(text)).length;
  const hasEllipsisPositive = /great\.\.\.|perfect\.\.\.|wonderful\.\.\.|amazing\.\.\./.test(lower);
  const hasEmojiSarcasm = /😒|🙄|😑/.test(text);
  const hasCapsPositive = /GREAT|PERFECT|WONDERFUL|BRILLIANT|THANKS/.test(text);
  const sarcasmScore = sarcasmMatches * 0.35 + (hasEllipsisPositive?0.3:0) + (hasEmojiSarcasm?0.4:0) + (hasCapsPositive?0.25:0);
  const isSarcastic = sarcasmScore > 0.35;
  const sarcasmConf = Math.min(97, Math.round(sarcasmScore * 100));

  // Sentiment score -1 to +1
  const moodObj = MOOD_LEXICON[topMood];
  const sentimentScore = moodObj ? moodObj.score : 0;

  // Message style
  const style = words.length < 5 ? 'short' : words.length > 30 ? 'long' : 'medium';
  const hasQuestion = text.includes('?');
  const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(text);

  // Language detection
  const detectedLang = detectLang(text);

  return {
    mood: topMood,
    confidence,
    sentimentScore,
    isSarcastic,
    sarcasmConf,
    messageStyle: style,
    hasQuestion,
    hasEmoji,
    wordCount: words.length,
    detectedLang,  // { code, label, flag } or null
  };
}

// ── Color mapping ─────────────────────────────────────────────────────────
const MOOD_COLORS = {
  happy:     '#22c55e',
  excited:   '#f59e0b',
  sad:       '#60a5fa',
  angry:     '#ef4444',
  frustrated:'#f97316',
  neutral:   '#94a3b8',
};
const MOOD_ICONS = {
  happy:'😊', excited:'🤩', sad:'😢', angry:'😠', frustrated:'😤', neutral:'😐'
};

function ConfidenceBar({ value, color, label, sublabel }) {
  return (
    <div style={{ marginBottom:'8px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
        <span style={{ fontFamily:'Syne,sans-serif', fontSize:'0.70rem', color:'var(--text-secondary)', fontWeight:'600' }}>{label}</span>
        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.65rem', color }}>
          {sublabel}
        </span>
      </div>
      <div style={{ height:'5px', background:'rgba(255,255,255,0.08)', borderRadius:'3px', overflow:'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ height:'100%', background: color, borderRadius:'3px', boxShadow:`0 0 6px ${color}66` }}
        />
      </div>
    </div>
  );
}

export default function MLInsightsPanel({ analysis, behaviorData, isVisible, accentColor = '#7c3aed' }) {
  if (!isVisible) return null;

  const moodColor = analysis ? MOOD_COLORS[analysis.mood] || '#94a3b8' : '#94a3b8';
  const moodIcon  = analysis ? MOOD_ICONS[analysis.mood]  || '😐'     : '😐';
  const sentLabel = analysis?.sentimentScore > 0.3 ? 'Positive' : analysis?.sentimentScore < -0.3 ? 'Negative' : 'Neutral';
  const sentColor = analysis?.sentimentScore > 0.3 ? '#22c55e'  : analysis?.sentimentScore < -0.3 ? '#ef4444'  : '#f59e0b';

  return (
    <motion.div
      initial={{ opacity:0, y:10 }}
      animate={{ opacity:1, y:0 }}
      style={{
        background:'var(--bg-card)',
        border:`1px solid ${accentColor}44`,
        borderRadius:'14px',
        padding:'12px 14px',
        flexShrink: 0,
      }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
        <span style={{ fontSize:'0.9rem' }}>🧠</span>
        <span style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.60rem', fontWeight:'700',
          color:accentColor, letterSpacing:'0.08em' }}>ML INSIGHTS</span>
        <span style={{ fontFamily:'Syne,sans-serif', fontSize:'0.58rem', color:'var(--text-muted)', marginLeft:'auto' }}>
          Real-time text analysis
        </span>
      </div>

      {!analysis ? (
        <p style={{ fontFamily:'Syne,sans-serif', fontSize:'0.70rem', color:'var(--text-muted)', textAlign:'center', margin:0, padding:'8px 0' }}>
          Send a message to see insights
        </p>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>

          {/* LEFT: Mood + Sentiment */}
          <div>
            {/* Mood card */}
            <div style={{ background:`${moodColor}12`, border:`1px solid ${moodColor}44`,
              borderRadius:'10px', padding:'8px 10px', marginBottom:'8px' }}>
              <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.52rem', color:'var(--text-muted)',
                letterSpacing:'0.08em', margin:'0 0 5px' }}>DETECTED MOOD</p>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'5px' }}>
                <span style={{ fontSize:'1.3rem' }}>{moodIcon}</span>
                <span style={{ fontFamily:'Syne,sans-serif', fontSize:'0.82rem', fontWeight:'700',
                  color:moodColor, textTransform:'capitalize' }}>{analysis.mood}</span>
              </div>
              <ConfidenceBar value={analysis.confidence} color={moodColor}
                label="Confidence" sublabel={`${analysis.confidence}%`}/>
            </div>

            {/* Sentiment */}
            <div style={{ background:`${sentColor}12`, border:`1px solid ${sentColor}44`,
              borderRadius:'10px', padding:'8px 10px' }}>
              <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.52rem', color:'var(--text-muted)',
                letterSpacing:'0.08em', margin:'0 0 4px' }}>SENTIMENT</p>
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:sentColor,
                  boxShadow:`0 0 8px ${sentColor}` }}/>
                <span style={{ fontFamily:'Syne,sans-serif', fontSize:'0.78rem', fontWeight:'600', color:sentColor }}>
                  {sentLabel}
                </span>
                <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.62rem', color:'var(--text-muted)', marginLeft:'auto' }}>
                  {analysis.sentimentScore > 0 ? '+' : ''}{analysis.sentimentScore.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Sarcasm + Style */}
          <div>
            {/* Sarcasm */}
            <div style={{ background: analysis.isSarcastic ? 'rgba(245,158,11,0.10)' : 'rgba(255,255,255,0.04)',
              border:`1px solid ${analysis.isSarcastic?'#f59e0b':'rgba(255,255,255,0.08)'}`,
              borderRadius:'10px', padding:'8px 10px', marginBottom:'8px' }}>
              <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.52rem', color:'var(--text-muted)',
                letterSpacing:'0.08em', margin:'0 0 5px' }}>SARCASM</p>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'5px' }}>
                <span style={{ fontSize:'1.1rem' }}>{analysis.isSarcastic ? '😏' : '😶'}</span>
                <span style={{ fontFamily:'Syne,sans-serif', fontSize:'0.80rem', fontWeight:'700',
                  color: analysis.isSarcastic ? '#f59e0b' : '#94a3b8' }}>
                  {analysis.isSarcastic ? 'YES' : 'NO'}
                </span>
              </div>
              {analysis.isSarcastic && (
                <ConfidenceBar value={analysis.sarcasmConf} color="#f59e0b"
                  label="Detected" sublabel={`${analysis.sarcasmConf}%`}/>
              )}
            </div>

            {/* Message style stats */}
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:'10px', padding:'8px 10px' }}>
              <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.52rem', color:'var(--text-muted)',
                letterSpacing:'0.08em', margin:'0 0 6px' }}>MESSAGE STYLE</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                {[
                  { label: analysis.messageStyle.toUpperCase(), color: accentColor },
                  ...(analysis.hasQuestion ? [{ label:'QUESTION', color:'#60a5fa' }] : []),
                  ...(analysis.hasEmoji ? [{ label:'EMOJI', color:'#f59e0b' }] : []),
                ].map((tag,i) => (
                  <span key={i} style={{ background:`${tag.color}20`, border:`1px solid ${tag.color}55`,
                    borderRadius:'8px', padding:'1px 7px', fontSize:'0.58rem',
                    fontFamily:'Orbitron,sans-serif', fontWeight:'700', color:tag.color }}>
                    {tag.label}
                  </span>
                ))}
              </div>
              <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.58rem', color:'var(--text-muted)', margin:'5px 0 0' }}>
                {analysis.wordCount} words
              </p>
            </div>
          </div>

          {/* Language + mic mood row */}
          {analysis.detectedLang && (
            <div style={{ gridColumn:'1/-1', background:'rgba(99,102,241,0.10)',
              border:'1px solid rgba(99,102,241,0.3)', borderRadius:'9px',
              padding:'6px 10px', display:'flex', alignItems:'center', gap:'8px', marginTop:'4px' }}>
              <span style={{ fontSize:'1.0rem' }}>{analysis.detectedLang.flag}</span>
              <span style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.52rem',
                fontWeight:'700', color:'#818cf8', letterSpacing:'0.08em' }}>
                DETECTED LANGUAGE
              </span>
              <span style={{ fontFamily:'Syne,sans-serif', fontSize:'0.72rem',
                color:'#a5b4fc', fontWeight:'600', marginLeft:'4px' }}>
                {analysis.detectedLang.label}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Behavior pattern row */}
      {behaviorData && behaviorData.messageCount > 1 && (
        <div style={{ marginTop:'8px', padding:'7px 10px', background:'rgba(255,255,255,0.04)',
          border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px' }}>
          <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:'0.52rem', color:'var(--text-muted)',
            letterSpacing:'0.08em', margin:'0 0 5px' }}>BEHAVIORAL PATTERN</p>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            <span style={{ fontFamily:'Syne,sans-serif', fontSize:'0.65rem', color:'var(--text-secondary)' }}>
              📊 {behaviorData.messageCount} msgs
            </span>
            <span style={{ fontFamily:'Syne,sans-serif', fontSize:'0.65rem', color:'var(--text-secondary)' }}>
              💬 Avg: {behaviorData.avgWords} words
            </span>
            <span style={{ fontFamily:'Syne,sans-serif', fontSize:'0.65rem', color:
              behaviorData.dominantMood==='happy'||behaviorData.dominantMood==='excited'?'#22c55e':
              behaviorData.dominantMood==='neutral'?'#94a3b8':'#ef4444' }}>
              {MOOD_ICONS[behaviorData.dominantMood]||'😐'} Mostly {behaviorData.dominantMood}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
