import { motion } from 'framer-motion';

export default function TypingIndicator({ avatarName = 'AI' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '4px 0',
      }}
    >
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: 'var(--accent-glow)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        flexShrink: 0,
      }}>
        🤖
      </div>
      <div
        className="ai-bubble"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 16px',
        }}
      >
        <span style={{
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontFamily: 'Syne, sans-serif',
          marginRight: '4px',
        }}>
          {avatarName} is thinking
        </span>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--accent-1)',
              boxShadow: '0 0 6px var(--accent-glow)',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
