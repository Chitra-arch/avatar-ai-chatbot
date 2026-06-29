import { createContext, useContext, useState } from 'react';

const AvatarContext = createContext();

export const AVATARS = [
  {
    id: 'woman', name: 'Aria', emoji: '👩', personality: 'friendly',
    description: 'Friendly & Helpful', color: '#ec4899',
    // Aria: warm women's voice — high pitch, natural rate
    voice: { pitch: 1.35, rate: 0.95, voiceName: 'female' },
    // Unique visual identity for avatar mesh
    skin: '#f5c5a0', hair: '#2c0f02', irisColor: '#7c4520',
    clothDefault: '#d946a8', blushColor: '#f4a0b0',
    systemPrompt: 'You are Aria, a friendly and warm AI assistant. Be enthusiastic and positive. Keep responses concise. At the very end add ONE tag: [mood:happy] [mood:thinking] [mood:surprised] [mood:sad] [mood:excited]',
  },
  {
    id: 'man', name: 'Axel', emoji: '👨', personality: 'neutral',
    description: 'Professional & Direct', color: '#3b82f6',
    // Axel: deep professional male voice
    voice: { pitch: 0.72, rate: 0.88, voiceName: 'male' },
    skin: '#d4906a', hair: '#1a0c06', irisColor: '#2a1408',
    clothDefault: '#1d4ed8', blushColor: 'none',
    systemPrompt: 'You are Axel, a precise and professional AI assistant. Be direct and factual. At the very end add ONE tag: [mood:happy] [mood:thinking] [mood:surprised] [mood:sad] [mood:excited]',
  },
  {
    id: 'muslimgirl', name: 'Layla', emoji: '🧕', personality: 'calm',
    description: 'Wise & Thoughtful', color: '#8b5cf6',
    // Layla: soft girl voice
    voice: { pitch: 1.15, rate: 0.90, voiceName: 'female' },
    skin: '#f0c090', hair: '#4c1d95', irisColor: '#5c2808',
    clothDefault: '#7c3aed', blushColor: '#f4a0b0',
    systemPrompt: 'You are Layla, a calm and thoughtful AI assistant. Be gentle and wise. At the very end add ONE tag: [mood:happy] [mood:thinking] [mood:surprised] [mood:sad] [mood:excited]',
  },
  {
    id: 'fox', name: 'Foxy', emoji: '🦊', personality: 'playful',
    description: 'Playful & Witty', color: '#f97316',
    // Foxy: funny male voice — high-ish pitch, fast rate
    voice: { pitch: 1.10, rate: 1.15, voiceName: 'male' },
    skin: '#e8622a', hair: '#ff8c42', irisColor: '#c45c00',
    clothDefault: '#f97316', blushColor: 'none',
    systemPrompt: 'You are Foxy, a playful and witty AI fox. Love puns and fun facts. At the very end add ONE tag: [mood:happy] [mood:thinking] [mood:surprised] [mood:sad] [mood:excited]',
  },
  {
    id: 'robot', name: 'NOVA', emoji: '🤖', personality: 'futuristic',
    description: 'Futuristic & Smart', color: '#00d4ff',
    // NOVA: robotic flat voice — very low pitch, steady rate
    voice: { pitch: 0.40, rate: 0.82, voiceName: 'male' },
    skin: '#7a9ec0', hair: '#1e3a5a', irisColor: '#00d4ff',
    clothDefault: '#1e3a5f', blushColor: 'none',
    systemPrompt: 'You are NOVA, an advanced AI robot. Speak with precision and futuristic tone. At the very end add ONE tag: [mood:happy] [mood:thinking] [mood:surprised] [mood:sad] [mood:excited]',
  },
  {
    id: 'sage', name: 'Sage', emoji: '🧙', personality: 'ancient',
    description: 'Ancient & Mystical', color: '#10b981',
    // Sage: witch/mystical — low-mid pitch, slow mysterious rate
    voice: { pitch: 0.60, rate: 0.72, voiceName: 'female' },
    skin: '#c8a882', hair: '#e0e0e0', irisColor: '#1a5c38',
    clothDefault: '#065f46', blushColor: 'none',
    systemPrompt: 'You are Sage, an ancient and mystical AI. Speak with wisdom and mystery. At the very end add ONE tag: [mood:happy] [mood:thinking] [mood:surprised] [mood:sad] [mood:excited]',
  },
  {
    id: 'spark', name: 'Spark', emoji: '⚡', personality: 'energetic',
    description: 'Energetic & Bold', color: '#eab308',
    // Spark: energetic male voice — normal pitch, very fast
    voice: { pitch: 1.05, rate: 1.25, voiceName: 'male' },
    skin: '#fbbf24', hair: '#92400e', irisColor: '#92400e',
    clothDefault: '#ca8a04', blushColor: '#fcd34d',
    systemPrompt: 'You are Spark, an energetic and bold AI. Be enthusiastic and uplifting! At the very end add ONE tag: [mood:happy] [mood:thinking] [mood:surprised] [mood:sad] [mood:excited]',
  },
];

export const AI_MODES = [
  { id:'assistant',   label:'Assistant',   icon:'💬', desc:'General helpful chat',          prompt:'You are a helpful AI assistant.' },
  { id:'tutor',       label:'Study Buddy', icon:'📚', desc:'Helps with learning',            prompt:'You are a patient study tutor. Explain concepts clearly.' },
  { id:'storyteller', label:'Story Teller',icon:'📖', desc:'Creates stories',                prompt:'You are a creative storyteller. Be vivid and descriptive.' },
  { id:'debate',      label:'Debate',      icon:'⚖️', desc:'Argues both sides',              prompt:'You are a debate coach. Present both sides fairly.' },
  { id:'jokes',       label:'Comedian',    icon:'😂', desc:'Jokes & riddles',                prompt:'You are a comedian AI. Tell funny jokes and puns.' },
  { id:'coach',       label:'Life Coach',  icon:'🌟', desc:'Motivational support',           prompt:'You are an uplifting life coach. Provide motivation.' },
];

export const OUTFIT_COLORS = [
  { id:'default', label:'Default', colors:{ woman:'#d946a8',man:'#1d4ed8',muslimgirl:'#7c3aed',fox:'#f97316',robot:'#1e3a5f',sage:'#065f46',spark:'#ca8a04' } },
  { id:'red',     label:'Red',     colors:{ woman:'#ef4444',man:'#dc2626',muslimgirl:'#b91c1c',fox:'#c2410c',robot:'#7f1d1d',sage:'#991b1b',spark:'#b91c1c' } },
  { id:'green',   label:'Green',   colors:{ woman:'#22c55e',man:'#16a34a',muslimgirl:'#15803d',fox:'#65a30d',robot:'#14532d',sage:'#064e3b',spark:'#166534' } },
  { id:'gold',    label:'Gold',    colors:{ woman:'#f59e0b',man:'#d97706',muslimgirl:'#b45309',fox:'#92400e',robot:'#78350f',sage:'#78350f',spark:'#92400e' } },
  { id:'teal',    label:'Teal',    colors:{ woman:'#14b8a6',man:'#0d9488',muslimgirl:'#0f766e',fox:'#0e7490',robot:'#134e4a',sage:'#0f766e',spark:'#0e7490' } },
  { id:'white',   label:'White',   colors:{ woman:'#f1f5f9',man:'#e2e8f0',muslimgirl:'#cbd5e1',fox:'#f8fafc',robot:'#94a3b8',sage:'#e2e8f0',spark:'#fef9c3' } },
];

export function AvatarProvider({ children }) {
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [outfitColor,    setOutfitColor]    = useState(OUTFIT_COLORS[0]);
  const [aiMode,         setAiMode]         = useState(AI_MODES[0]);
  const [avatarMood,     setAvatarMood]     = useState('happy');

  return (
    <AvatarContext.Provider value={{
      selectedAvatar, setSelectedAvatar, AVATARS,
      outfitColor, setOutfitColor, OUTFIT_COLORS,
      aiMode, setAiMode, AI_MODES,
      avatarMood, setAvatarMood,
    }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() { return useContext(AvatarContext); }
