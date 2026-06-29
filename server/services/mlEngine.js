/**
 * ML ENGINE — All 11 features, pure JavaScript NLP
 * No external libraries needed
 */

// ── Feature 1: Personality Learning ──────────────────────────────────────
const userProfiles = new Map();

export function updatePersonalityProfile(sessionId, message) {
  const p = userProfiles.get(sessionId) || {
    messageCount:0, totalChars:0, avgLength:0,
    emojiCount:0, formalWords:0, casualWords:0,
    exclamationCount:0, questionCount:0, personality:'neutral'
  };

  const emojiRe  = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu;
  const formal   = ['please','however','therefore','regarding','furthermore','consequently','assistance','inquire','provide','request'];
  const casual   = ['hey','lol','omg','btw','yeah','gonna','wanna','kinda','idk','bruh','dude','cool','awesome'];

  p.messageCount++;
  p.totalChars += message.length;
  p.avgLength   = p.totalChars / p.messageCount;
  p.emojiCount += (message.match(emojiRe)||[]).length;
  p.formalWords+= formal.filter(w=>message.toLowerCase().includes(w)).length;
  p.casualWords+= casual.filter(w=>message.toLowerCase().includes(w)).length;
  p.exclamationCount += (message.match(/!/g)||[]).length;
  p.questionCount    += (message.match(/\?/g)||[]).length;

  const emojiRate  = p.emojiCount    / p.messageCount;
  const formalRate = p.formalWords   / p.messageCount;
  const casualRate = p.casualWords   / p.messageCount;
  const exclamRate = p.exclamationCount / p.messageCount;

  if      (formalRate>0.3 && p.avgLength>60) p.personality = 'formal';
  else if (emojiRate>0.5  || exclamRate>1.0) p.personality = 'expressive';
  else if (casualRate>0.3 || p.avgLength<30) p.personality = 'casual';
  else                                        p.personality = 'neutral';

  userProfiles.set(sessionId, p);
  return p;
}

export function getPersonalityPrompt(sessionId) {
  const p = userProfiles.get(sessionId);
  if (!p) return '';
  const map = {
    formal:     'The user is formal. Use professional language and structured answers.',
    casual:     'The user is casual. Keep responses short and friendly.',
    expressive: 'The user is enthusiastic. Match their energy with engaging responses.',
    neutral:    ''
  };
  return map[p.personality] || '';
}

// ── Feature 2,9,10: Dual Emotion + Score + History ───────────────────────
const EMOTIONS = {
  joy:         { words:['happy','great','love','fantastic','excited','glad','awesome','best','wonderful','yay'],  score:0.9  },
  trust:       { words:['trust','believe','confident','sure','reliable','safe','honest'],                          score:0.6  },
  fear:        { words:['scared','afraid','worried','nervous','anxious','terrified','panic'],                       score:-0.6 },
  surprise:    { words:['wow','whoa','shocked','unexpected','unbelievable','incredible'],                           score:0.3  },
  sadness:     { words:['sad','unhappy','depressed','lonely','hopeless','crying','disappointed'],                   score:-0.8 },
  anger:       { words:['angry','furious','hate','frustrated','annoyed','irritated','upset'],                       score:-0.7 },
  disgust:     { words:['disgusting','awful','terrible','horrible','nasty','worst'],                                score:-0.5 },
  anticipation:{ words:['waiting','hoping','excited','looking forward','planning','ready','wonder'],                score:0.5  },
};

const emotionHistoryStore = new Map();

export function detectEmotions(text) {
  const lower = text.toLowerCase();
  const wordCount = lower.split(/\s+/).length;
  const scores = {};

  for (const [emotion, data] of Object.entries(EMOTIONS)) {
    const matches = data.words.filter(w => lower.includes(w)).length;
    if (matches > 0) scores[emotion] = matches;
  }

  const sorted = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  const top2   = sorted.slice(0,2).map(([e])=>e);

  let numericScore = 0;
  for (const [emotion, count] of sorted) {
    numericScore += EMOTIONS[emotion].score * count;
  }
  numericScore = parseFloat(Math.max(-1, Math.min(1, numericScore / Math.max(wordCount*0.15,1))).toFixed(3));

  const moodMap = {
    joy:'happy', trust:'nodding', fear:'thinking',
    surprise:'surprised', sadness:'sad', anger:'thinking',
    disgust:'sad', anticipation:'excited'
  };

  return {
    emotions:    top2.length>0 ? top2 : ['neutral'],
    primaryMood: top2[0] ? moodMap[top2[0]] : 'happy',
    numericScore,
    rawScores:   scores
  };
}

export function recordEmotionHistory(sessionId, score, emotions) {
  const h = emotionHistoryStore.get(sessionId) || [];
  h.push({ timestamp:Date.now(), score, emotions });
  if (h.length>20) h.shift();
  emotionHistoryStore.set(sessionId, h);
  return h;
}

export function getEmotionHistory(sessionId) {
  return emotionHistoryStore.get(sessionId) || [];
}

// ── Feature 3: Hidden Emotion Detection ──────────────────────────────────
const MASKING = ['i\'m fine','im fine','i am fine','i\'m okay','im okay','no worries','never mind','it\'s nothing','i\'m alright','forget it','doesn\'t matter'];

export function detectHiddenEmotion(text, emotionResult) {
  const lower = text.toLowerCase();
  const masked = MASKING.some(p=>lower.includes(p));
  const negEmotion = ['fear','sadness','anger','disgust'].some(e=>emotionResult.emotions.includes(e));
  const negScore   = emotionResult.numericScore < -0.2;
  const hidden     = masked && (negEmotion || negScore);
  return {
    hiddenEmotion: hidden,
    hint: hidden ? 'User may be masking negative feelings — be extra empathetic' : null
  };
}

// ── Feature 4: Response Style Generator ──────────────────────────────────
export function getStylePrompt(style) {
  const styles = {
    funny:        'Use light humor and witty remarks. Be helpful but fun.',
    teacher:      'Explain like a teacher — use examples, analogies, step-by-step.',
    motivational: 'Be uplifting and inspiring. Use positive, encouraging language.',
    casual:       'Talk like a friend. Keep it relaxed, short, conversational.',
    formal:       'Be professional and precise. Use structured language.',
    empathetic:   'Be warm and gentle. Acknowledge feelings before giving advice.',
  };
  return styles[style] || '';
}

// ── Feature 5: Smart Reply Ranking ───────────────────────────────────────
export function rankResponses(responses, userMessage, emotionResult) {
  const userWords = new Set(userMessage.toLowerCase().split(/\s+/));
  const scored = responses.map(resp => {
    let score = 0;
    const rWords = resp.toLowerCase().split(/\s+/);
    const overlap = rWords.filter(w=>userWords.has(w)).length;
    score += (overlap/Math.max(userWords.size,1))*40;
    const len = resp.length;
    if (len>=80&&len<=300) score+=30;
    else if (len>=300&&len<=500) score+=20;
    else if (len<50) score-=10;
    const p = emotionResult.emotions[0];
    if (p==='sadness'&&/understand|sorry|here for you/i.test(resp)) score+=30;
    if (p==='joy'&&/great|wonderful|glad/i.test(resp)) score+=20;
    if (p==='fear'&&/calm|safe|help|relax/i.test(resp)) score+=25;
    return { response:resp, score:Math.round(score) };
  });
  scored.sort((a,b)=>b.score-a.score);
  return scored[0]?.response || responses[0];
}

// ── Feature 6: Sarcasm Detection ─────────────────────────────────────────
const SARCASM_PATTERNS = [
  /oh (sure|yeah|right|great|wonderful|perfect|absolutely)/i,
  /yeah (right|sure|obviously)/i,
  /totally (not|fine|great|helpful)/i,
  /wow (thanks|helpful|brilliant)/i,
  /great job/i, /nice going/i, /as if/i,
  /oh how (helpful|useful|clever)/i,
  /right\.\.\./i, /sure\.\.\./i, /obviously/i,
];

export function detectSarcasm(text) {
  const matches = SARCASM_PATTERNS.filter(p=>p.test(text)).length;
  const posWithNeg = /great|perfect|wonderful/.test(text.toLowerCase()) && /\.\.\.|😒|🙄|😑/.test(text);
  const sarcasm = matches>=1||posWithNeg;
  return { sarcasm, confidence: matches>=2?'high':matches===1?'medium':'low' };
}

// ── Feature 7: Predictive Avatar Emotion ─────────────────────────────────
export function predictEarlyEmotion(partialText) {
  if (!partialText||partialText.length<3) return { mood:'happy', confidence:'low' };
  const result = detectEmotions(partialText);
  return {
    mood:       result.primaryMood,
    emotions:   result.emotions,
    numericScore: result.numericScore,
    confidence: partialText.length>15 ? 'medium' : 'low'
  };
}

// ── Feature 8: Gamification Engine ───────────────────────────────────────
const gameProfiles = new Map();

export function updateGameProfile(sessionId, event) {
  const g = gameProfiles.get(sessionId) || {
    score:0, streak:0, totalAnswers:0, correctAnswers:0,
    engagementScore:0, level:1, badges:[], quizDifficulty:'easy',
    totalResponseMs:0, avgResponseMs:0
  };

  if (event.type==='quiz_answer') {
    g.totalAnswers++;
    if (event.correct) {
      g.correctAnswers++;
      g.streak++;
      const pts = event.difficulty==='hard'?30:event.difficulty==='medium'?20:10;
      g.score += pts + (g.streak>=3 ? 5*g.streak : 0);
    } else {
      g.streak=0;
      g.score=Math.max(0,g.score-5);
    }
    const acc = g.correctAnswers/g.totalAnswers;
    g.quizDifficulty = acc>=0.8&&g.totalAnswers>=3?'hard':acc>=0.6&&g.totalAnswers>=3?'medium':'easy';
  }

  if (event.type==='message') {
    g.engagementScore += event.messageLength>50?2:1;
    if (event.responseMs) {
      g.totalResponseMs += event.responseMs;
      g.avgResponseMs = Math.round(g.totalResponseMs / (g.totalAnswers||1));
    }
  }

  g.level = Math.floor(g.score/100)+1;
  g.badges = [];
  if (g.streak>=5)           g.badges.push({id:'hot_streak', name:'🔥 Hot Streak',  desc:'5 correct in a row'});
  if (g.correctAnswers>=10)  g.badges.push({id:'quiz_master',name:'🎓 Quiz Master', desc:'10 correct answers'});
  if (g.score>=500)          g.badges.push({id:'high_scorer',name:'⭐ High Scorer', desc:'500+ points'});
  if (g.engagementScore>=20) g.badges.push({id:'engaged',    name:'💬 Engaged',    desc:'20+ messages'});

  gameProfiles.set(sessionId, g);
  return g;
}

export function getGameProfile(sessionId) {
  return gameProfiles.get(sessionId)||null;
}

// ── Feature 11: TF-IDF Keyword Extraction ────────────────────────────────
const STOP = new Set(['a','an','the','is','it','in','on','at','to','for','of','and','or','but','i','you','we','they','he','she','my','your','this','that','are','was','be','do','did','has','have','had','not','can','will','with','from','by','what','how','why','when','where','who','which','as','so','if','then','just','get','got','its','into','about','than','more','also','been','were','im','its','am','me','us','our']);

export function extractKeywords(text, topN=6) {
  const words    = text.toLowerCase().match(/\b[a-z]{3,}\b/g)||[];
  const filtered = words.filter(w=>!STOP.has(w));
  const tf       = {};
  filtered.forEach(w=>{ tf[w]=(tf[w]||0)+1; });
  const scored   = Object.entries(tf).map(([word,freq])=>({
    word, score: freq*(1+Math.log(word.length))
  }));
  scored.sort((a,b)=>b.score-a.score);
  return scored.slice(0,topN).map(s=>s.word);
}
