import express from 'express';
import { getChatResponse }        from '../services/geminiService.js';
import { analyzeText }            from '../services/datasetML.js';  // Dataset ML
import {
  updatePersonalityProfile,
  getPersonalityPrompt,
  getStylePrompt,
  updateGameProfile,
  recordEmotionHistory,
  predictEarlyEmotion,
} from '../services/mlEngine.js'; // Keep existing for personality + game

const router = express.Router();
const requestTimes = new Map();

// Feature 7: Predict emotion from partial input (uses dataset ML)
router.post('/predict-emotion', (req, res) => {
  const { text } = req.body;
  const emotion = analyzeText(text || '');
  res.json({
    prediction: {
      mood:         emotion.primaryMood,
      emotions:     emotion.dualEmotion,
      score:        emotion.sentimentScore,
      confidence:   text?.length > 15 ? 'medium' : 'low',
    }
  });
});

router.get('/emotion-history/:sessionId', (req, res) => {
  const { getEmotionHistory } = require('../services/mlEngine.js');
  res.json(getEmotionHistory(req.params.sessionId));
});

router.get('/game-profile/:sessionId', (req, res) => {
  const { getGameProfile } = require('../services/mlEngine.js');
  res.json(getGameProfile(req.params.sessionId) || {});
});

router.post('/game-event', (req, res) => {
  const { sessionId, event } = req.body;
  const profile = updateGameProfile(sessionId, event);
  res.json(profile);
});

// ── Main chat endpoint ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    message, avatarPersonality, avatarName,
    history = [], imageBase64, imageMimeType,
    sessionId = 'default', responseStyle, startTime
  } = req.body;

  if (!message?.trim() && !imageBase64) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here' || key.length < 10) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not set.' });
  }

  // Rate limiting
  const now = Date.now();
  if (now - (requestTimes.get(sessionId) || 0) < 2000) {
    return res.status(429).json({ error: '__RATELIMIT__' });
  }
  requestTimes.set(sessionId, now);

  try {
    const msgText = message || '';

    // ── RUN ALL DATASET-BACKED ML MODELS ────────────────────────────────
    // Single call → runs GoEmotions + Sarcasm V2 + Sentiment140 + AG News
    const mlResult = analyzeText(msgText);

    const {
      emotion,            // GoEmotions: probability map per emotion
      dualEmotion,        // GoEmotions: top 2 ["joy","anticipation"]
      primaryMood,        // for avatar expression update
      sentimentScore,     // Sentiment140: -1 to +1
      sarcasm,            // Sarcasm V2: true/false
      sarcasmScore,       // Sarcasm V2: Naive Bayes score
      sarcasmConf,        // "high"/"medium"/"low"
      keywords,           // AG News TF-IDF: ["machine","learning","model"]
      hiddenEmotion,      // Mismatch detection
      hiddenEmotionHint,  // Prompt modifier
    } = mlResult;

    // ── EXISTING ML (personality + game) ────────────────────────────────
    const personality       = updatePersonalityProfile(sessionId, msgText);
    const personalityPrompt = getPersonalityPrompt(sessionId);
    const responseMs        = startTime ? Date.now() - startTime : 0;
    const gameProfile       = updateGameProfile(sessionId, {
      type: 'message', messageLength: msgText.length, responseMs
    });

    // Record sentiment score history for emotion graph
    const emHistory = recordEmotionHistory(sessionId, sentimentScore, dualEmotion);

    // ── BUILD ENHANCED GEMINI SYSTEM PROMPT ─────────────────────────────
    const parts = [avatarPersonality || 'You are a helpful AI assistant.'];

    // Personality adaptation
    if (personalityPrompt) parts.push(personalityPrompt);

    // Response style (Feature 4)
    if (responseStyle) parts.push(getStylePrompt(responseStyle));

    // Dataset ML enhancements to prompt:
    if (hiddenEmotion) {
      parts.push('IMPORTANT: The user may be masking negative feelings. Be extra warm, empathetic, and gentle.');
    }
    if (sarcasm && sarcasmConf !== 'low') {
      parts.push('The user seems to be using sarcasm. Acknowledge it warmly without being defensive.');
    }
    if (dualEmotion.length > 0 && dualEmotion[0] !== 'neutral') {
      parts.push(`Detected user emotion: ${dualEmotion.join(' + ')}. Adapt your tone accordingly.`);
    }
    if (sentimentScore < -0.5) {
      parts.push('User is expressing quite negative feelings. Be extra supportive and constructive.');
    } else if (sentimentScore > 0.6) {
      parts.push('User is in a positive mood. Match their energy with enthusiasm!');
    }
    if (keywords.length > 0) {
      parts.push(`Key topics from user (TF-IDF extracted): ${keywords.join(', ')}. Focus your response on these.`);
    }

    const systemPrompt = parts.join('\n\n');

    // ── CALL GEMINI ──────────────────────────────────────────────────────
    const reply = await getChatResponse(
      msgText, systemPrompt, history, imageBase64, imageMimeType,
      { emotions: dualEmotion, numericScore: sentimentScore },
      msgText.length > 20 // generate 2 responses and rank if message is long
    );

    // ── RETURN FULL RESPONSE WITH ML METADATA ───────────────────────────
    res.json({
      reply,
      avatarName: avatarName || 'AI',
      ml: {
        // Dataset-backed ML results:
        emotion,                          // GoEmotions probability map
        dualEmotion,                      // ["joy", "trust"]
        primaryMood,                      // avatar mood
        emotions: dualEmotion,            // alias for frontend compatibility
        emotionScore: sentimentScore,     // Sentiment140 score
        sarcasm,                          // Sarcasm V2 boolean
        sarcasmScore,                     // Naive Bayes confidence
        hiddenEmotion,                    // mismatch detection
        userKeywords: keywords,           // TF-IDF keywords

        // Existing ML results:
        personality:    personality.personality,
        gameProfile,
        emotionHistory: emHistory.slice(-10),
      }
    });

  } catch (err) {
    console.error('Chat error:', err.message);
    const msg = err.message || '';
    if (msg.includes('API_KEY_INVALID'))       return res.status(401).json({ error: '❌ Invalid API key' });
    if (msg.includes('RESOURCE_EXHAUSTED'))    return res.status(429).json({ error: '__RATELIMIT__' });
    res.status(500).json({ error: msg });
  }
});

export default router;
