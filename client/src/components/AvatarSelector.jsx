import { motion } from 'framer-motion';
import { useAvatar, AVATARS } from '../context/AvatarContext';

export default function AvatarSelector({ onSelect }) {
  const { selectedAvatar, setSelectedAvatar } = useAvatar();

  const handleSelect = (avatar) => {
    setSelectedAvatar(avatar);
    if (onSelect) onSelect(avatar);
  };

  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      overflowX: 'auto',
      paddingBottom: '4px',
      scrollbarWidth: 'thin',
      scrollbarColor: 'var(--accent-1) transparent',
      flex: 1,
    }}>
      {AVATARS.map((avatar, i) => {
        const isSelected = selectedAvatar?.id === avatar.id;
        return (
          <motion.button
            key={avatar.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ scale: 1.06, y: -3 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => handleSelect(avatar)}
            style={{
              background: isSelected ? `${avatar.color}18` : 'var(--bg-secondary)',
              border: isSelected ? `2px solid ${avatar.color}` : '2px solid var(--border-color)',
              borderRadius: '14px',
              padding: '10px 14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
              minWidth: '82px',
              flexShrink: 0,
              boxShadow: isSelected ? `0 0 16px ${avatar.color}40` : 'none',
              transition: 'all 0.25s ease',
            }}
          >
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: `${avatar.color}20`,
              border: `2px solid ${avatar.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px',
            }}>
              {avatar.emoji}
            </div>
            <div style={{
              fontFamily: 'Orbitron, sans-serif',
              fontSize: '0.6rem', fontWeight: '700',
              color: isSelected ? avatar.color : 'var(--text-primary)',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}>
              {avatar.name}
            </div>
            {isSelected && (
              <div style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: avatar.color,
                boxShadow: `0 0 6px ${avatar.color}`,
              }} />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
