// ── ADD THIS TO server/routes/chat.js (or server/app.js) ─────────────────
// This dedicated quiz endpoint bypasses the avatar system prompt
// so Gemini only sees "Output JSON only" as its instruction.
// Add BEFORE the module.exports or app.listen line.

router.post('/quiz', async (req, res) => {
  const { prompt, sessionId } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  try {
    // Use the same Gemini model already configured in your geminiService
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: 'You are a quiz JSON generator. Output ONLY a valid JSON array. No markdown. No explanation. No text before or after the JSON array.',
    });

    const result = await model.generateContent(prompt);
    const reply  = result.response.text();
    res.json({ reply });
  } catch (err) {
    console.error('Quiz endpoint error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// If using Express Router export pattern, the route is: POST /api/quiz
// Make sure in app.js you have: app.use('/api', router);