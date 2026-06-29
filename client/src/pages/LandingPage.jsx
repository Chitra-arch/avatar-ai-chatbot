import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ParticleBackground from '../components/ParticleBackground';
import { AVATARS } from '../context/AvatarContext';

const features = [
  {
    icon: '🧠',
    title: 'AI Chat',
    desc: 'Advanced AI for intelligent, contextual conversations.',
  },
  {
    icon: '🎤',
    title: 'Voice Interaction',
    desc: 'Speak naturally and hear responses with text-to-speech synthesis.',
  },
  {
    icon: '🧍',
    title: 'Animated Avatars',
    desc: 'Real-time 3D avatars with blinking, lip-sync, and mouse tracking.',
  },
  {
    icon: '🎭',
    title: 'Multiple Characters',
    desc: 'Choose from distinct personalities — friendly, neutral, or calm.',
  },
];

export default function LandingPage() {
  const [currentAvatarIndex, setCurrentAvatarIndex] = useState(0);

  // Cycle through avatars
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAvatarIndex(prev => (prev + 1) % AVATARS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative', overflowX: 'hidden' }}>
      <ParticleBackground />
      <div className="grid-overlay" />

      {/* Hero Section */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px 40px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Spotlight */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'var(--gradient-hero)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }} />


        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: '900',
            lineHeight: '1.1',
            letterSpacing: '-0.02em',
            marginBottom: '20px',
            maxWidth: '800px',
          }}
        >
          <span style={{ color: 'var(--text-primary)' }}>Animated</span>{' '}
          <span className="gradient-text">Avatar AI</span>
          <br />
          <span style={{ color: 'var(--text-primary)' }}>Chatbot</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            color: 'var(--text-secondary)',
            maxWidth: '520px',
            lineHeight: '1.7',
            marginBottom: '40px',
          }}
        >
          Experience AI conversations with expressive 3D avatars, voice interaction, 
          and intelligent responses — all in one elegant interface.
        </motion.p>

        {/* Avatar Showcase */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          style={{
            display: 'flex',
            gap: '20px',
            marginBottom: '48px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {AVATARS.map((avatar, i) => {
            const isActive = i === currentAvatarIndex;
            return (
              <motion.div
                key={avatar.id}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -8 : 0,
                }}
                transition={{ duration: 0.4 }}
                style={{
                  position: 'relative',
                  background: 'var(--bg-card)',
                  border: `2px solid ${isActive ? avatar.color : 'var(--border-color)'}`,
                  borderRadius: '20px',
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: isActive ? `0 0 30px ${avatar.color}40` : 'var(--shadow-card)',
                  cursor: 'default',
                  minWidth: '140px',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Thought bubble */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.9 }}
                      style={{
                        position: 'absolute',
                        top: '-54px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '6px 10px',
                        fontSize: '0.65rem',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        fontFamily: 'Syne, sans-serif',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      Hello! I'm your AI assistant. ✨
                      <div style={{
                        position: 'absolute',
                        bottom: '-6px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '10px',
                        height: '10px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderTop: 'none',
                        borderLeft: 'none',
                        transform: 'translateX(-50%) rotate(45deg)',
                      }} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  animate={{ rotate: isActive ? [0, -5, 5, 0] : 0 }}
                  transition={{ duration: 0.5 }}
                  style={{ fontSize: '3rem' }}
                >
                  {avatar.emoji}
                </motion.div>
                <div style={{
                  fontFamily: 'Orbitron, sans-serif',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  color: isActive ? avatar.color : 'var(--text-primary)',
                  letterSpacing: '0.05em',
                }}>
                  {avatar.name}
                </div>
                <div style={{
                  fontSize: '0.62rem',
                  color: 'var(--text-muted)',
                  fontFamily: 'Syne, sans-serif',
                }}>
                  {avatar.description}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <Link to="/chat" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 12px 40px var(--accent-glow)' }}
              whileTap={{ scale: 0.95 }}
              className="glow-btn"
              style={{ padding: '14px 36px', fontSize: '0.85rem' }}
            >
              🚀 START CHAT
            </motion.button>
          </Link>
          <Link to="/avatars" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="outline-btn"
              style={{ padding: '14px 36px', fontSize: '0.85rem' }}
            >
              🧍 CHOOSE AVATAR
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: '80px 24px',
        maxWidth: '1100px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '60px' }}
        >
          <h2 style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
            fontWeight: '700',
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            marginBottom: '12px',
          }}>
            Powerful <span className="gradient-text">Features</span>
          </h2>
          <p style={{
            fontFamily: 'Syne, sans-serif',
            color: 'var(--text-secondary)',
            fontSize: '1rem',
          }}>
            Everything you need for an immersive AI conversation experience
          </p>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
        }}>
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -6, boxShadow: '0 16px 40px var(--accent-glow)' }}
              className="glass-card"
              style={{
                padding: '28px',
                cursor: 'default',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{
                fontSize: '2.5rem',
                marginBottom: '16px',
                filter: 'drop-shadow(0 0 10px var(--accent-glow))',
              }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '0.85rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                letterSpacing: '0.05em',
                marginBottom: '10px',
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
              }}>
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '32px 24px',
        borderTop: '1px solid var(--border-color)',
        position: 'relative',
        zIndex: 1,
      }}>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
        }}>
          Avatar AI Chatbot — Built with React & Three.js
        </p>
      </footer>
    </div>
  );
}
