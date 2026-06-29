// Run: node find-model.mjs
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env manually
try {
  const env = readFileSync(join(__dirname, '.env'), 'utf8');
  env.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
} catch(e) {}

const key = process.env.GEMINI_API_KEY;
console.log('\n🔑 API Key:', key ? `${key.slice(0,8)}... (${key.length} chars)` : 'NOT FOUND');

if (!key) { console.log('Add GEMINI_API_KEY to server/.env\n'); process.exit(1); }

const { GoogleGenerativeAI } = await import('@google/generative-ai');
const genAI = new GoogleGenerativeAI(key);

const models = [
  'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash',
  'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro',
  'gemini-pro', 'gemini-2.0-flash-exp',
];

console.log('\nTesting models...\n');
let found = false;
for (const name of models) {
  try {
    const m = genAI.getGenerativeModel({ model: name });
    const r = await m.generateContent('Say "ok" in one word');
    console.log(`✅ WORKS: ${name} → "${r.response.text().trim()}"`);
    if (!found) {
      found = true;
      console.log(`\n👉 USE THIS in geminiService.js: '${name}'\n`);
    }
  } catch(e) {
    console.log(`❌ ${name}: ${e.message.slice(0,60)}`);
  }
}
