import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ParticleBackground from '../components/ParticleBackground';
import { AVATARS, useAvatar } from '../context/AvatarContext';

export default function AvatarPage() {
  const { selectedAvatar, setSelectedAvatar } = useAvatar();
  const [hoveredId, setHoveredId] = useState(null);
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: '64px', position: 'relative' }}>
      <ParticleBackground />
      <div className="grid-overlay" />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px', position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--accent-glow)', border: '1px solid var(--border-color)', borderRadius: '100px', padding: '6px 16px', marginBottom: '20px', fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.1em', color: 'var(--accent-1)' }}>
            🧍 CHOOSE YOUR AVATAR
          </div>
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '-0.02em' }}>
            Meet Your <span className="gradient-text">AI Companions</span>
          </h1>
          <p style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto', lineHeight: '1.7' }}>
            Each avatar has a unique personality and communication style.
          </p>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {AVATARS.map((avatar, i) => {
            const isSelected = selectedAvatar?.id === avatar.id;
            return (
              <motion.div key={avatar.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.15 }} whileHover={{ y: -8 }} onMouseEnter={() => setHoveredId(avatar.id)} onMouseLeave={() => setHoveredId(null)} onClick={() => setSelectedAvatar(avatar)} style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: `2px solid ${isSelected ? avatar.color : 'var(--border-color)'}`, borderRadius: '20px', overflow: 'hidden', cursor: 'pointer', boxShadow: isSelected ? `0 0 40px ${avatar.color}40` : 'var(--shadow-card)', transition: 'all 0.3s ease' }}>
                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 50% 60%, ${avatar.color}20 0%, transparent 70%)`, position: 'relative' }}>
                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }} style={{ fontSize: '6rem', filter: `drop-shadow(0 0 20px ${avatar.color}80)` }}>
                    {avatar.emoji}
                  </motion.div>
                  {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ position: 'absolute', top: '12px', right: '12px', background: avatar.color, borderRadius: '100px', padding: '4px 10px', fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', fontWeight: '700', color: 'white' }}>
                      ✓ SELECTED
                    </motion.div>
                  )}
                </div>
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: avatar.color, boxShadow: `0 0 8px ${avatar.color}` }} />
                    <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{avatar.name}</h3>
                    <span style={{ marginLeft: 'auto', fontFamily: 'Syne, sans-serif', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{avatar.personality}</span>
                  </div>
                  <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>{avatar.description}</p>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={(e) => { e.stopPropagation(); setSelectedAvatar(avatar); navigate('/chat'); }} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: isSelected ? `linear-gradient(135deg, ${avatar.color}, ${avatar.color}aa)` : 'var(--bg-secondary)', color: isSelected ? 'white' : 'var(--text-secondary)', fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.08em', transition: 'all 0.3s ease', boxShadow: isSelected ? `0 4px 20px ${avatar.color}40` : 'none' }}>
                    {isSelected ? '💬 CHAT NOW' : 'SELECT & CHAT'}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
