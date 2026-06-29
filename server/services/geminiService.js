import { GoogleGenerativeAI } from '@google/generative-ai';
import { rankResponses } from './mlEngine.js';

export async function getChatResponse(
  message, systemPrompt, history=[], imageBase64=null, imageMimeType='image/jpeg',
  emotionResult=null, generateMultiple=false
) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const systemInstruction = `${systemPrompt || 'You are a helpful AI assistant.'}

FORMATTING RULES — always add these tags at the very end of your response on new lines:
[mood:VALUE] — one of: happy, excited, thinking, surprised, sad, explaining, nodding
[confidence:VALUE] — one of: high, medium, low
[keywords: word1, word2, word3] — only if you explained something, max 6 words`;

  const modelWithSystem = genAI.getGenerativeModel({ model:'gemini-2.5-flash', systemInstruction });

  // Build valid alternating history
  const contents = [];
  if (history?.length>0) {
    history.filter(m=>m.content?.trim()&&(m.role==='user'||m.role==='assistant'))
      .slice(-6)
      .forEach(m=>contents.push({ role:m.role==='assistant'?'model':'user', parts:[{text:m.content.trim()}] }));
  }
  const currentParts = [];
  if (imageBase64) currentParts.push({ inlineData:{ data:imageBase64, mimeType:imageMimeType||'image/jpeg' } });
  currentParts.push({ text: message||'Hello' });
  contents.push({ role:'user', parts:currentParts });

  const valid = [];
  for (const c of contents) {
    const last = valid[valid.length-1];
    if (!last&&c.role==='user') valid.push(c);
    else if (last&&last.role!==c.role) valid.push(c);
  }
  while (valid.length>0&&valid[0].role!=='user') valid.shift();
  const lastMsg = valid[valid.length-1];

  const callGemini = async () => {
    try {
      if (valid.length<=1) {
        return (await modelWithSystem.generateContent(currentParts)).response.text();
      }
      const chat = modelWithSystem.startChat({ history:valid.slice(0,-1) });
      return (await chat.sendMessage(currentParts)).response.text();
    } catch {
      return (await modelWithSystem.generateContent(currentParts)).response.text();
    }
  };

  let responseText;
  // Feature 5: Generate 2 responses and pick best one
  if (generateMultiple && emotionResult) {
    const [r1, r2] = await Promise.all([callGemini(), callGemini()]);
    responseText = rankResponses([r1, r2], message, emotionResult);
  } else {
    responseText = await callGemini();
  }

  // Server-side cleanup
  return responseText.replace(/^[\s{}\]\[]+\n?/,'').trim();
}
