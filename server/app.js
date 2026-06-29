import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

// Allow requests from Vite dev server
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_, res) => {
  const hasKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  res.json({ status: 'ok', apiKeySet: hasKey });
});

app.use('/api/chat', chatRouter);

app.use((_, res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, () => {
  const hasKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  console.log(`\n🚀  Server: http://localhost:${PORT}`);
  console.log(`   API Key: ${hasKey ? '✅ found' : '❌ MISSING — add GEMINI_API_KEY to server/.env'}`);
  if (!hasKey) console.log('   Get key: https://aistudio.google.com/app/apikey\n');
});
