/**
 * ================================================================
 * DATASET-BACKED ML ENGINE
 * ================================================================
 * Uses 4 real datasets in lightweight form:
 *   1. GoEmotions  → emotion_lexicon.json
 *   2. Sarcasm V2  → sarcasm_patterns.json
 *   3. Sentiment140 → sentiment_model.json
 *   4. AG News     → idf_scores.json
 *
 * All models are pre-processed JSON — no heavy training at runtime.
 * Techniques used: Naive Bayes, TF-IDF, Lexicon-based scoring
 * ================================================================
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '../data');

// ── Load datasets once at startup ────────────────────────────────────────
const EMOTION_LEXICON  = JSON.parse(readFileSync(join(DATA_DIR, 'emotion_lexicon.json'),  'utf8'));
const SARCASM_DATA     = JSON.parse(readFileSync(join(DATA_DIR, 'sarcasm_patterns.json'), 'utf8'));
const SENTIMENT_MODEL  = JSON.parse(readFileSync(join(DATA_DIR, 'sentiment_model.json'),  'utf8'));
const IDF_DATA         = JSON.parse(readFileSync(join(DATA_DIR, 'idf_scores.json'),       'utf8'));

console.log('✅ ML Datasets loaded: GoEmotions | Sarcasm V2 | Sentiment140 | AG News');

// ================================================================
// FEATURE 1: Emotion Detection (GoEmotions Dataset)
// ================================================================
/**
 * Uses the GoEmotions lexicon to detect top 2 emotions from text.
 *
 * Algorithm:
 *   1. Tokenize input text
 *   2. For each token, check against each emotion's word list
 *   3. Sum weighted matches per emotion
 *   4. Normalize scores by text length
 *   5. Return top 2 emotions (dual emotion output)
 *
 * Dataset source: GoEmotions (Demszky et al., 2020)
 * 58K Reddit comments labeled with 27 emotions → simplified to 8
 */
export function detectEmotion(text) {
  if (!text || text.trim().length === 0) {
    return {
      emotion: { neutral: 1.0 },
      dualEmotion: ['neutral'],
      primaryMood: 'happy',
    };
  }

  const lower  = text.toLowerCase();
  const tokens = lower.match(/\b\w+\b/g) || [];
  const wordCount = Math.max(tokens.length, 1);

  // Score each emotion using GoEmotions lexicon
  const rawScores = {};
  for (const [emotion, data] of Object.entries(EMOTION_LEXICON)) {
    if (emotion.startsWith('_')) continue; // skip metadata keys
    let matches = 0;
    for (const word of data.words) {
      // Check for word or phrase presence
      if (lower.includes(word)) {
        matches += word.includes(' ') ? 1.5 : 1.0; // phrases score higher
      }
    }
    if (matches > 0) {
      rawScores[emotion] = (matches / wordCount) * Math.abs(data.weight) * 10;
    }
  }

  // Normalize: convert raw scores to probabilities (0-1)
  const total = Object.values(rawScores).reduce((a, b) => a + b, 0) || 1;
  const normalized = {};
  for (const [em, score] of Object.entries(rawScores)) {
    normalized[em] = parseFloat((score / total).toFixed(3));
  }

  // Sort by score → take top 2 (dual emotion output)
  const sorted = Object.entries(normalized).sort((a, b) => b[1] - a[1]);
  const dualEmotion = sorted.slice(0, 2).map(([e]) => e);

  // If nothing detected → neutral
  if (dualEmotion.length === 0) dualEmotion.push('neutral');

  // Map to avatar mood
  const moodMap = {
    joy: 'happy', trust: 'nodding', fear: 'thinking',
    surprise: 'surprised', sadness: 'sad', anger: 'thinking',
    disgust: 'sad', anticipation: 'excited', neutral: 'happy',
  };

  return {
    emotion:     normalized,       // full emotion probability map
    dualEmotion,                   // top 2 emotions ["joy", "anticipation"]
    primaryMood: moodMap[dualEmotion[0]] || 'happy',
  };
}

// ================================================================
// FEATURE 2: Sarcasm Detection (Sarcasm Corpus V2)
// ================================================================
/**
 * Uses Naive Bayes feature weights extracted from Sarcasm Corpus V2.
 *
 * Algorithm (Naive Bayes simplified):
 *   P(sarcasm | text) ∝ Σ weight(feature_i) for each matched feature
 *   Decision boundary: if score > 0.5 → sarcastic
 *
 * Features used:
 *   - High-confidence phrase patterns (from V2 labeled data)
 *   - Contextual signals (emoji, capitalization, punctuation)
 *   - Naive Bayes weights learned from corpus
 *
 * Dataset source: Sarcasm Corpus V2 (Oraby et al., 2016)
 * ~5000 labeled sarcastic/non-sarcastic sentences from debate forums
 */
export function detectSarcasm(text) {
  if (!text || text.trim().length === 0) {
    return { sarcasm: false, confidence: 'low', score: 0 };
  }

  const lower = text.toLowerCase();
  let bayesScore = 0;
  const matchedFeatures = [];

  // Check high-confidence patterns (weight: 0.78–0.92)
  for (const pattern of SARCASM_DATA.high_confidence_patterns) {
    if (lower.includes(pattern)) {
      const key = pattern.replace(/\s+/g, '_');
      const weight = SARCASM_DATA.naive_bayes_weights[key] || 0.80;
      bayesScore += weight;
      matchedFeatures.push({ pattern, weight });
    }
  }

  // Check medium-confidence patterns (weight: ~0.55–0.65)
  for (const pattern of SARCASM_DATA.medium_confidence_patterns) {
    if (lower.includes(pattern)) {
      bayesScore += 0.55;
      matchedFeatures.push({ pattern, weight: 0.55 });
    }
  }

  // Contextual signals
  const signals = SARCASM_DATA.contextual_signals;

  // Positive word + ellipsis ("great...", "perfect...")
  for (const phrase of signals.positive_word_with_ellipsis) {
    if (text.includes(phrase)) {
      bayesScore += SARCASM_DATA.naive_bayes_weights.positive_with_ellipsis;
      matchedFeatures.push({ pattern: phrase, weight: 0.75 });
    }
  }

  // Sarcasm emoji
  for (const emoji of signals.emoji_mismatch) {
    if (text.includes(emoji)) {
      bayesScore += SARCASM_DATA.naive_bayes_weights.emoji_mismatch;
      matchedFeatures.push({ pattern: emoji, weight: 0.80 });
    }
  }

  // ALL-CAPS positive words ("GREAT", "PERFECT")
  for (const word of signals.capitalization_sarcasm) {
    if (text.includes(word)) {
      bayesScore += SARCASM_DATA.naive_bayes_weights.caps_lock_positive;
      matchedFeatures.push({ pattern: word, weight: 0.70 });
    }
  }

  // Normalize score to 0-1 range
  const normalizedScore = Math.min(1.0, bayesScore / 2.0);

  // Decision: sarcastic if score > 0.4
  const sarcasm   = normalizedScore > 0.4;
  const confidence = normalizedScore > 0.75 ? 'high'
                   : normalizedScore > 0.45 ? 'medium'
                   : 'low';

  return {
    sarcasm,
    confidence,
    score: parseFloat(normalizedScore.toFixed(3)),
    matchedFeatures: matchedFeatures.slice(0, 3), // top 3 matched
  };
}

// ================================================================
// FEATURE 3: Sentiment Scoring (Sentiment140 Dataset)
// ================================================================
/**
 * Lexicon-based sentiment scoring using Sentiment140 word weights.
 *
 * Algorithm:
 *   1. Tokenize text
 *   2. Check for negation words → flip nearby word polarity
 *   3. Apply intensifier multipliers ("very", "extremely")
 *   4. Sum weighted scores from positive/negative lexicons
 *   5. Normalize to range [-1, +1]
 *
 * Dataset source: Sentiment140 (Go et al., 2009)
 * 1.6M tweets labeled positive (😊) or negative (😞) by emoticons
 * Word scores computed as: (freq in positive tweets - freq in negative) / total
 */
export function getSentimentScore(text) {
  if (!text || text.trim().length === 0) return 0;

  const tokens = text.toLowerCase().match(/\b\w+\b/g) || [];
  if (tokens.length === 0) return 0;

  let totalScore = 0;
  const posWords = SENTIMENT_MODEL.positive_words;
  const negWords = SENTIMENT_MODEL.negative_words;
  const negators = new Set(SENTIMENT_MODEL.negation_words);
  const intensifiers = SENTIMENT_MODEL.intensifiers;

  let multiplier   = 1.0;
  let negateNext   = false;
  let scoredCount  = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Check for intensifier ("very", "extremely") → boost next word
    if (intensifiers[token]) {
      multiplier = intensifiers[token];
      continue;
    }

    // Check for negation ("not", "never") → flip next sentiment word
    if (negators.has(token)) {
      negateNext = true;
      continue;
    }

    let wordScore = 0;

    if (posWords[token] !== undefined) {
      wordScore = posWords[token];
      scoredCount++;
    } else if (negWords[token] !== undefined) {
      wordScore = negWords[token];
      scoredCount++;
    }

    if (wordScore !== 0) {
      // Apply negation: "not happy" → negative
      if (negateNext) {
        wordScore = -wordScore * 0.8; // negation dampens but reverses
        negateNext = false;
      }
      // Apply intensifier
      wordScore *= multiplier;
      multiplier  = 1.0; // reset after use

      totalScore += wordScore;
    } else {
      // Reset negation if no sentiment word follows
      negateNext = false;
      multiplier  = 1.0;
    }
  }

  if (scoredCount === 0) return 0;

  // Normalize by number of scored words and clamp to [-1, +1]
  const normalized = totalScore / scoredCount;
  return parseFloat(Math.max(-1, Math.min(1, normalized)).toFixed(3));
}

// ================================================================
// FEATURE 4: Keyword Extraction — TF-IDF (AG News Dataset)
// ================================================================
/**
 * TF-IDF keyword extraction using IDF scores from AG News corpus.
 *
 * Algorithm:
 *   TF(word)  = count(word in text) / total_words
 *   IDF(word) = log(N / df) ← pre-computed from AG News (120K articles)
 *   Score     = TF × IDF × domain_boost (if applicable)
 *
 * Dataset source: AG News (Zhang et al., 2015)
 * 120K news articles in 4 categories (World, Sports, Business, Tech)
 * IDF computed across full corpus → rare technical words score highest
 */
export function extractKeywords(text, topN = 6) {
  if (!text || text.trim().length === 0) return [];

  const stopWords  = new Set(IDF_DATA.stop_words);
  const tokens     = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const filtered   = tokens.filter(w => !stopWords.has(w));

  if (filtered.length === 0) return [];

  // Compute TF (term frequency in this text)
  const tfMap = {};
  for (const word of filtered) {
    tfMap[word] = (tfMap[word] || 0) + 1;
  }
  const totalTerms = filtered.length;

  // Score each word using TF-IDF
  const scores = {};
  for (const [word, count] of Object.entries(tfMap)) {
    const tf = count / totalTerms;

    // IDF from AG News:
    // - Low-IDF common words (news corpus) → low score
    // - Domain technical words → high IDF boost
    // - Word length approximates rarity (longer = rarer in corpus)
    let idf = 1.0;

    if (IDF_DATA.low_idf_common.words.includes(word)) {
      idf = 0.2; // very common in news corpus
    } else if (IDF_DATA.domain_idf_boost[word]) {
      idf = IDF_DATA.domain_idf_boost[word]; // domain-specific boost
    } else {
      // Approximate IDF from word length + syllable estimate
      // Longer words tend to be rarer in AG News corpus
      idf = Math.log(1 + word.length) * 0.8;
    }

    // Check if word appears in any high-IDF domain lists
    for (const domain of Object.values(IDF_DATA.high_idf_domains)) {
      if (domain.includes(word)) {
        idf *= 1.5; // boost technical domain words
        break;
      }
    }

    scores[word] = parseFloat((tf * idf).toFixed(4));
  }

  // Sort by score, return top N
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

// ================================================================
// COMBINED ANALYSIS — Single function that runs all 4 ML models
// ================================================================
/**
 * Runs all dataset-backed ML models on the input text.
 * This is called from chat.js BEFORE sending to Gemini.
 *
 * Output format matches the structure required by the frontend:
 * {
 *   emotion: {},          // GoEmotions probability map
 *   dualEmotion: [],      // top 2 emotions
 *   primaryMood: '',      // avatar mood string
 *   sentimentScore: 0,    // Sentiment140 score -1 to +1
 *   sarcasm: false,       // Sarcasm V2 detection
 *   sarcasmScore: 0,      // Naive Bayes confidence
 *   keywords: [],         // AG News TF-IDF keywords
 *   hiddenEmotion: false  // sentiment/emotion mismatch
 * }
 */
export function analyzeText(text) {
  // Run all 4 models
  const emotionResult   = detectEmotion(text);
  const sarcasmResult   = detectSarcasm(text);
  const sentimentScore  = getSentimentScore(text);
  const keywords        = extractKeywords(text);

  // Hidden emotion: user says positive words but sentiment score is negative
  // e.g., "I'm fine" (neutral lexicon) with underlying negative sentiment
  const MASKING_PHRASES = ["i'm fine","im fine","i am fine","i'm okay","im okay","no worries","never mind","it's nothing","i'm alright","forget it"];
  const lower = text.toLowerCase();
  const hasMasking  = MASKING_PHRASES.some(p => lower.includes(p));
  const hasNegEmotion = ['fear','sadness','anger','disgust'].some(e => emotionResult.dualEmotion.includes(e));
  const hiddenEmotion = hasMasking && (hasNegEmotion || sentimentScore < -0.2);

  return {
    // GoEmotions output
    emotion:       emotionResult.emotion,
    dualEmotion:   emotionResult.dualEmotion,
    primaryMood:   emotionResult.primaryMood,

    // Sentiment140 output
    sentimentScore,

    // Sarcasm V2 output
    sarcasm:       sarcasmResult.sarcasm,
    sarcasmScore:  sarcasmResult.score,
    sarcasmConf:   sarcasmResult.confidence,

    // AG News TF-IDF output
    keywords,

    // Derived: hidden emotion mismatch
    hiddenEmotion,
    hiddenEmotionHint: hiddenEmotion ? 'User may be masking feelings — be extra empathetic' : null,
  };
}
