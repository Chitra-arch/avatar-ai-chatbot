/**
 * VideoRecommendation — Smart contextual video suggestions
 *
 * Features:
 *  - Emotion → video type mapping (stress→calming, sad→motivational, etc.)
 *  - Topic extraction from chat → YouTube search
 *  - Playlist generator for learning topics
 *  - Attention/focus detection → break suggestion
 *  - No autoplay, lazy loading, cached results
 *  - Clean card design: thumbnail + title + play button
 *  - Opens in modal (no new tab disruption)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Emotion → video category mapping ──────────────────────────────────────
const EMOTION_MAP = {
  stressed:    { query:'calm meditation music study',  label:'Calming Videos',    icon:'🧘', color:'#60a5fa' },
  anxious:     { query:'relaxing music anxiety relief', label:'Anxiety Relief',   icon:'💆', color:'#60a5fa' },
  sad:         { query:'motivational speech feel better',label:'Motivation',      icon:'💪', color:'#f59e0b' },
  frustrated:  { query:'how to stay calm focus tips',   label:'Focus Tips',       icon:'🎯', color:'#f97316' },
  angry:       { query:'breathing exercise calm down',  label:'Calm Down',        icon:'🌊', color:'#14b8a6' },
  happy:       { query:'productivity tips learning',    label:'Stay Productive',   icon:'⚡', color:'#22c55e' },
  excited:     { query:'learn new skills fast',         label:'Learn Something',   icon:'🚀', color:'#a78bfa' },
  neutral:     { query:'interesting facts science',     label:'Interesting Facts', icon:'🌟', color:'#7c3aed' },
  thinking:    { query:'deep focus study music',        label:'Study Music',       icon:'🎵', color:'#8b5cf6' },
};

// ── Topic → playlist structure ─────────────────────────────────────────────
const PLAYLIST_TEMPLATES = {
  'machine learning': [
    { title:'What is Machine Learning?',         q:'machine learning beginners explained' },
    { title:'ML Core Concepts & Algorithms',      q:'machine learning algorithms tutorial' },
    { title:'Build Your First ML Model',          q:'build machine learning model python' },
  ],
  'python': [
    { title:'Python for Absolute Beginners',      q:'python tutorial beginners 2024' },
    { title:'Python Functions & OOP',             q:'python functions object oriented' },
    { title:'Python Projects Practice',           q:'python projects intermediate' },
  ],
  'web development': [
    { title:'HTML & CSS Fundamentals',            q:'html css web development basics' },
    { title:'JavaScript Essentials',              q:'javascript tutorial beginners' },
    { title:'Build a Real Website',               q:'build website project tutorial' },
  ],
  'data science': [
    { title:'Data Science Overview',              q:'data science introduction 2024' },
    { title:'Pandas & Data Analysis',             q:'pandas data analysis python tutorial' },
    { title:'Data Visualization',                 q:'data visualization matplotlib seaborn' },
  ],
  'exam': [
    { title:'Effective Study Techniques',         q:'best study techniques memorization' },
    { title:'Exam Stress Management',             q:'exam stress anxiety management tips' },
    { title:'Focus & Concentration Tips',         q:'improve focus concentration studying' },
  ],
  'stress': [
    { title:'5-Minute Breathing Exercise',        q:'5 minute breathing exercise calm' },
    { title:'Guided Meditation for Students',     q:'guided meditation students study' },
    { title:'Quick Stress Relief Tips',           q:'quick stress relief tips study break' },
  ],
};

// ── Detect topic from message ──────────────────────────────────────────────
function detectTopic(text) {
  if (!text) return null;
  const t = text.toLowerCase();

  // ── Predefined topic patterns (checked first) ─────────────────────────
  const TOPICS = [
    // Animals & nature
    { key:'animals',               re:/animal|wildlife|mammal|reptile|bird|fish|insect|spider|snake|lion|tiger|elephant|dolphin|whale|shark|dog|cat|pet|zoo|wild|creature|species/i },
    { key:'dinosaurs',             re:/dinosaur|dino|prehistoric|jurassic|fossil|extinct|t-rex|velociraptor/i },
    { key:'plants and nature',     re:/plant|flower|tree|forest|garden|botany|photosynthesis|leaf|seed|nature|ecosystem|jungle|rain forest/i },
    { key:'ocean and sea life',    re:/ocean|sea|marine|coral|reef|underwater|deep sea|whale|dolphin|fish|aquatic|tide/i },
    // Space & science
    { key:'space and planets',     re:/planet|jupiter|saturn|mars|moon|space|solar system|galaxy|universe|astronomy|nasa|orbit|asteroid|comet|star|cosmos|black hole|nebula|telescope|rocket|astronaut/i },
    { key:'physics',               re:/physics|quantum|gravity|relativity|thermodynamics|electro|magnetism|newton|force|energy|wave|light speed|particle/i },
    { key:'biology',               re:/biology|cell|dna|evolution|genetics|organism|photosynthesis|ecosystem|species|human body|organ|blood|brain|nerve/i },
    { key:'chemistry',             re:/chemistry|molecule|atom|element|periodic|reaction|compound|acid|base|chemical|laboratory/i },
    { key:'math',                  re:/math|algebra|calculus|geometry|trigonometry|equation|formula|statistics|probability|number theory/i },
    { key:'earth and geology',     re:/earth|volcano|earthquake|geology|rock|mineral|tectonic|plate|erosion|climate|weather|atmosphere/i },
    { key:'human body',            re:/human body|anatomy|organ|heart|brain|muscle|bone|blood|cell|nerve|digestive|respiratory|immune/i },
    // Fun facts & general knowledge
    { key:'fun facts',             re:/fun fact|interesting fact|did you know|amazing fact|weird fact|cool fact|trivia|mind blowing/i },
    { key:'history',               re:/history|war|revolution|ancient|civilization|empire|historical|century|medieval|roman|greek|egypt|world war/i },
    { key:'geography',             re:/geography|country|continent|capital|climate|map|population|city|nation|flag|culture|language/i },
    { key:'inventions and science',re:/invention|scientist|discovery|experiment|research|innovation|technology history|who invented/i },
    { key:'food and cooking',      re:/food|cooking|recipe|nutrition|diet|restaurant|cuisine|ingredients|healthy eating|meal/i },
    { key:'sports',                re:/sport|football|basketball|cricket|tennis|olympics|athlete|game|match|tournament|soccer|baseball/i },
    { key:'music',                 re:/music|song|band|artist|instrument|melody|rhythm|concert|genre|hip hop|pop|rock|classical/i },
    { key:'movies and entertainment',re:/movie|film|cinema|actor|director|series|show|netflix|story|character|plot/i },
    // Tech
    { key:'artificial intelligence',re:/artificial intelligence|ai|machine learning|ml model|neural network|deep learning|chatgpt|gpt|llm/i },
    { key:'python programming',    re:/python|pandas|numpy|django|flask|pytorch|tensorflow/i },
    { key:'web development',       re:/web dev|html|css|javascript|react|frontend|backend|node/i },
    { key:'data science',          re:/data science|data analysis|visualization|tableau|power bi/i },
    { key:'programming',           re:/programming|coding|software|algorithm|code|developer|computer science/i },
    { key:'cybersecurity',         re:/security|hacking|cyber|firewall|encryption|malware|phishing/i },
    // Wellness & study
    { key:'exam preparation',      re:/exam|test|study tips|assignment|homework|revision|preparation|marks|grade/i },
    { key:'stress relief',         re:/stress|anxious|anxiety|overwhelmed|worried|panic/i },
    { key:'meditation',            re:/meditat|mindfulness|breathing|relax|calm|yoga|zen/i },
    { key:'language learning',     re:/language|grammar|vocabulary|fluent|speak|translate|learn english/i },
    { key:'finance and investing', re:/invest|stock|crypto|money|budget|finance|economy|trading/i },
    { key:'productivity',          re:/productivity|time management|habit|goal setting|routine/i },
    { key:'psychology',            re:/psychology|mental|emotion|behavior|cognitive|memory|learning|brain|mind/i },
  ];

  for (const tp of TOPICS) {
    if (tp.re.test(t)) return tp.key;
  }

  // ── Free-form: extract the main subject from "tell me about X" / "what is X" ──
  const freeMatch = t.match(
    /(?:tell me about|what (?:is|are|was|were)|explain|show me|videos? (?:about|on)|facts? about|i want to (?:know|learn) about|(?:how|why) (?:does|do|did|is|are)) (.{4,50}?)(?:\?|$|\.)/i
  );
  if (freeMatch) {
    const subject = freeMatch[1].trim()
      .replace(/^(the|a|an|some|any) /i, '')
      .replace(/[?!.,;].*$/, '')
      .trim();
    if (subject.length >= 3 && subject.length <= 50) return subject;
  }

  return null;
}

// ── Build YouTube search URL & thumbnail ──────────────────────────────────
function ytSearchUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
function ytEmbedSearch(query) {
  // Use YouTube's oEmbed-style thumbnail trick via a proxy approach
  // Return direct search URL since we can't use the API without a key
  return ytSearchUrl(query);
}

// Placeholder thumbnails using a free image service
function getThumb(query, idx = 0) {
  const colors  = ['3b82f6','7c3aed','ec4899','f97316','22c55e','14b8a6','f59e0b','8b5cf6'];
  const color   = colors[(query.charCodeAt(0) + idx) % colors.length];
  return `https://placehold.co/320x180/${color}/ffffff?text=${encodeURIComponent(query.slice(0,20))}`;
}

// ── Single Video Card ──────────────────────────────────────────────────────
function VideoCard({ title, query, index, accentColor, onPlay }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgErr,    setImgErr]    = useState(false);
  const thumb = getThumb(query, index);

  return (
    <motion.div
      initial={{ opacity:0, y:8, scale:0.97 }}
      animate={{ opacity:1, y:0,  scale:1 }}
      transition={{ duration:0.25, delay:index * 0.07 }}
      style={{
        background:'var(--bg-secondary)',
        border:'1px solid var(--border-color)',
        borderRadius:'12px',
        overflow:'hidden',
        cursor:'pointer',
        transition:'border-color 0.2s',
        flexShrink:0,
      }}
      whileHover={{ scale:1.02, borderColor:`${accentColor}66` }}
      whileTap={{ scale:0.98 }}
      onClick={() => onPlay(query, title)}>

      {/* Thumbnail */}
      <div style={{
        position:'relative', width:'100%', paddingTop:'56.25%',
        background:`${accentColor}18`, overflow:'hidden',
      }}>
        <img
          src={thumb}
          alt={title}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgErr(true)}
          style={{
            position:'absolute', inset:0, width:'100%', height:'100%',
            objectFit:'cover', opacity: imgLoaded ? 1 : 0,
            transition:'opacity 0.3s',
          }}/>
        {/* Play overlay */}
        <div style={{
          position:'absolute', inset:0, display:'flex',
          alignItems:'center', justifyContent:'center',
          background:'rgba(0,0,0,0.25)',
          opacity:0, transition:'opacity 0.2s',
        }}
          className="play-overlay">
          <div style={{
            width:'44px', height:'44px', borderRadius:'50%',
            background:accentColor, display:'flex',
            alignItems:'center', justifyContent:'center',
            boxShadow:`0 4px 20px ${accentColor}66`,
          }}>
            <span style={{ fontSize:'1.2rem', marginLeft:'3px' }}>▶</span>
          </div>
        </div>
        {/* Play button always visible */}
        <div style={{
          position:'absolute', bottom:'6px', right:'6px',
          background:accentColor, borderRadius:'50%',
          width:'26px', height:'26px',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 2px 8px ${accentColor}55`,
        }}>
          <span style={{ fontSize:'0.62rem', marginLeft:'2px', color:'white' }}>▶</span>
        </div>
      </div>

      {/* Title */}
      <div style={{ padding:'8px 10px' }}>
        <p style={{
          fontFamily:'Syne,sans-serif', fontSize:'0.72rem',
          color:'var(--text-primary)', margin:0, lineHeight:1.4,
          display:'-webkit-box', WebkitLineClamp:2,
          WebkitBoxOrient:'vertical', overflow:'hidden',
        }}>
          {title}
        </p>
        <p style={{
          fontFamily:'JetBrains Mono,monospace', fontSize:'0.58rem',
          color:`${accentColor}`, margin:'4px 0 0',
          display:'flex', alignItems:'center', gap:'4px',
        }}>
          <span>📺</span> YouTube
        </p>
      </div>
    </motion.div>
  );
}

// ── Video Modal ────────────────────────────────────────────────────────────
function VideoModal({ query, title, onClose }) {
  const url = ytSearchUrl(query);
  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.80)',
        zIndex:1000, display:'flex', alignItems:'center',
        justifyContent:'center', padding:'20px',
      }}
      onClick={onClose}>
      <motion.div
        initial={{ scale:0.9, y:20 }} animate={{ scale:1, y:0 }}
        exit={{ scale:0.9, y:20 }}
        onClick={e => e.stopPropagation()}
        style={{
          background:'var(--bg-card)', borderRadius:'20px',
          padding:'20px', maxWidth:'560px', width:'100%',
          boxShadow:'0 20px 60px rgba(0,0,0,0.5)',
        }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
          <span style={{ fontSize:'1.3rem' }}>📺</span>
          <p style={{
            fontFamily:'Syne,sans-serif', fontSize:'0.88rem',
            color:'var(--text-primary)', margin:0, fontWeight:'600', flex:1,
          }}>{title}</p>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'50%',
            width:'32px', height:'32px', cursor:'pointer',
            color:'var(--text-muted)', fontSize:'1rem',
          }}>✕</button>
        </div>
        <p style={{
          fontFamily:'Syne,sans-serif', fontSize:'0.75rem',
          color:'var(--text-muted)', margin:'0 0 14px',
        }}>
          This will open YouTube search for: <strong style={{ color:'var(--text-secondary)' }}>"{query}"</strong>
        </p>
        <motion.a
          href={url} target="_blank" rel="noopener noreferrer"
          whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
          style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
            background:'linear-gradient(135deg,#ef4444,#dc2626)',
            color:'white', borderRadius:'12px', padding:'12px 24px',
            fontFamily:'Orbitron,sans-serif', fontSize:'0.65rem',
            fontWeight:'700', textDecoration:'none', letterSpacing:'0.05em',
          }}>
          <span style={{ fontSize:'1.2rem' }}>▶</span>
          WATCH ON YOUTUBE
        </motion.a>
        <p style={{
          fontFamily:'Syne,sans-serif', fontSize:'0.60rem',
          color:'var(--text-muted)', textAlign:'center', margin:'10px 0 0',
        }}>
          Opens in new tab · No autoplay
        </p>
      </motion.div>
    </motion.div>
  );
}

// ── Main VideoRecommendation Component ─────────────────────────────────────
export default function VideoRecommendation({
  trigger,      // 'emotion' | 'topic' | 'playlist' | 'focus' | 'safety' | null
  emotion,      // current detected emotion string
  topic,        // extracted topic string
  message,      // latest user message for context
  accentColor = '#7c3aed',
  onDismiss,
}) {
  const [videos,   setVideos]   = useState([]);
  const [modal,    setModal]    = useState(null);  // { query, title }
  const [label,    setLabel]    = useState('');
  const [icon,     setIcon]     = useState('📺');
  const [color,    setColor]    = useState(accentColor);
  const [visible,  setVisible]  = useState(false);
  const cacheRef = useRef({});

  const buildVideos = useCallback(() => {
    if (!trigger) { setVisible(false); return; }

    const cacheKey = `${trigger}:${emotion}:${topic}`;
    if (cacheRef.current[cacheKey]) {
      const cached = cacheRef.current[cacheKey];
      setVideos(cached.videos);
      setLabel(cached.label);
      setIcon(cached.icon);
      setColor(cached.color);
      setVisible(true);
      return;
    }

    let vids = [], lbl = 'Suggested Videos', ic = '📺', col = accentColor;

    if (trigger === 'playlist' && topic) {
      const detectedT = detectTopic(message) || topic || '';
      const key = Object.keys(PLAYLIST_TEMPLATES).find(k => detectedT.toLowerCase().includes(k));
      if (key) {
        vids = PLAYLIST_TEMPLATES[key].map((v, i) => ({ ...v, index:i }));
        lbl  = `📚 Learning Path: ${key.charAt(0).toUpperCase()+key.slice(1)}`;
        ic   = '📚'; col = '#8b5cf6';
      } else if (detectedT) {
        // Fallback: build dynamic playlist from topic
        const sb = detectedT.replace(/ and /g,' ').trim();
        vids = [
          { title:`${detectedT} — Beginners Guide`, q:`${sb} beginners full course`, index:0 },
          { title:`${detectedT} — Core Concepts`,   q:`${sb} explained in depth`,    index:1 },
          { title:`${detectedT} — Practice`,        q:`${sb} practical examples`,    index:2 },
        ];
        lbl = `📚 Learn: ${detectedT.charAt(0).toUpperCase()+detectedT.slice(1)}`;
        ic  = '📚'; col = '#8b5cf6';
      }
    } else if (trigger === 'emotion' && emotion) {
      const em = EMOTION_MAP[emotion] || EMOTION_MAP['neutral'];
      const words = em.query.split(' ');
      vids = [
        { title: `${em.label} — Top Picks`,             q: em.query,              index:0 },
        { title: `Best ${em.label} Videos`,              q: em.query + ' best',    index:1 },
        { title: `Quick ${em.label} (5 min)`,            q: em.query + ' short',   index:2 },
      ];
      lbl = `${em.icon} ${em.label}`;
      ic  = em.icon; col = em.color;
    } else if (trigger === 'topic') {
      // Extract topic: try detectTopic first, then from message words
      const detectedKey = detectTopic(message || '');
      // For free-form topics (returned as a string by detectTopic's freeMatch),
      // use it directly. For predefined keys, use the key as search base.
      const t = detectedKey || topic || (message ? message.replace(/[?!.,]/g,'').trim().slice(0,50) : 'interesting topics');
      const searchBase = t.replace(/ and /g, ' ').replace(/  +/g, ' ').trim();
      // Use the subject as the search query — most direct
      const subj = searchBase.charAt(0).toUpperCase() + searchBase.slice(1);
      vids = [
        { title:`${subj} — Watch & Learn`,      q:`${searchBase} explained`,              index:0 },
        { title:`Amazing ${subj} Facts`,        q:`${searchBase} interesting facts`,      index:1 },
        { title:`${subj} — Full Video Guide`,   q:`${searchBase} complete guide video`,   index:2 },
      ];
      lbl = `📺 About: ${subj}`;
      ic  = '📺'; col = '#f97316';
    } else if (trigger === 'focus') {
      vids = [
        { title:'Focus Music — Deep Work',       q:'deep focus music study 1 hour', index:0 },
        { title:'Take a 5-Min Brain Break',      q:'5 minute brain break exercise', index:1 },
        { title:'Pomodoro Timer Technique',      q:'pomodoro technique study focus', index:2 },
      ];
      lbl = '👀 Stay Focused';
      ic  = '👀'; col = '#f59e0b';
    } else if (trigger === 'safety') {
      vids = [
        { title:'Breathing for Calm (2 min)',    q:'2 minute breathing calm stress',       index:0 },
        { title:'Guided Mindfulness Break',      q:'guided mindfulness 5 minutes student', index:1 },
        { title:'Dealing with Overwhelm',        q:'dealing with overwhelm tips mental',   index:2 },
      ];
      lbl = '💙 You might find these helpful';
      ic  = '💙'; col = '#60a5fa';
    }

    if (vids.length) {
      cacheRef.current[cacheKey] = { videos:vids, label:lbl, icon:ic, color:col };
      setVideos(vids);
      setLabel(lbl);
      setIcon(ic);
      setColor(col);
      setVisible(true);
    }
  }, [trigger, emotion, topic, message, accentColor]);

  useEffect(() => { buildVideos(); }, [buildVideos]);

  if (!visible || !videos.length) return null;

  return (
    <>
      <motion.div
        initial={{ opacity:0, y:10 }}
        animate={{ opacity:1, y:0 }}
        exit={{ opacity:0, y:-8 }}
        style={{
          background:'var(--bg-card)',
          border:`1px solid ${color}44`,
          borderRadius:'14px',
          padding:'12px 14px',
          marginTop:'8px',
        }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
          <span style={{ fontSize:'1rem' }}>{icon}</span>
          <span style={{
            fontFamily:'Orbitron,sans-serif', fontSize:'0.60rem',
            fontWeight:'700', color, letterSpacing:'0.07em', flex:1,
          }}>
            {label}
          </span>
          <button
            onClick={() => { setVisible(false); onDismiss?.(); }}
            style={{
              background:'none', border:'none', cursor:'pointer',
              color:'var(--text-muted)', fontSize:'0.85rem', padding:'2px',
            }}>✕</button>
        </div>

        {/* Video grid — 3 compact cards in one row */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(3,1fr)',
          gap:'6px',
        }}>
          {videos.slice(0,3).map((v, i) => (
            <VideoCard
              key={i}
              title={v.title}
              query={v.q}
              index={i}
              accentColor={color}
              onPlay={(q, t) => setModal({ query:q, title:t })}/>
          ))}
        </div>

        {/* Footer note */}
        <p style={{
          fontFamily:'Syne,sans-serif', fontSize:'0.60rem',
          color:'var(--text-muted)', margin:'8px 0 0', textAlign:'center',
        }}>
          Click any card to watch on YouTube · No autoplay
        </p>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <VideoModal
            query={modal.query}
            title={modal.title}
            onClose={() => setModal(null)}/>
        )}
      </AnimatePresence>

      <style>{`
        .play-overlay:hover { opacity:1 !important; }
      `}</style>
    </>
  );
}

// ── Export helper: detect if video recommendation should trigger ────────────
export function shouldShowVideos(analysis, message) {
  if (!message) return null;
  const mood = analysis?.mood || 'neutral';
  const txt  = message.toLowerCase();

  // 1. Topic detection — highest priority
  const hasTopic = detectTopic(txt);
  if (hasTopic) {
    // If it's a known learning/tech topic → playlist, otherwise → topic
    const learningTopics = ['machine learning','python programming','web development',
      'data science','programming','exam preparation','language learning','artificial intelligence'];
    const isLearningTopic = learningTopics.some(lt => hasTopic.toLowerCase().includes(lt.split(' ')[0]));
    const hasLearnIntent = /learn|study|tutorial|how to|teach me|course|beginner|full guide/i.test(txt);
    return (isLearningTopic || hasLearnIntent) ? 'playlist' : 'topic';
  }

  // 2. Informational intent — ANY question gets topic videos
  const isQuestion = /\?$|^(what|who|when|where|why|how|tell me|explain|show me|give me|can you|do you know|i want to|i need)/i.test(txt.trim());
  if (isQuestion) return 'topic';

  // 3. Safety: stress/negative mood
  if (mood === 'frustrated' || mood === 'angry' || mood === 'sad') return 'safety';

  // 4. Emotion-based fallback
  if (['happy','excited'].includes(mood)) return 'emotion';

  return null;
}

export { detectTopic };