import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeSwitcher from './ThemeSwitcher';

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/avatars', label: 'Avatars' },
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/chat', label: 'Start Chat' },
];

export default function Navbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: '0 24px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-color)',
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none' }}>
        <motion.div
          whileHover={{ scale: 1.05 }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--gradient-1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}>
            🤖
          </div>
          <span style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '0.9rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            letterSpacing: '0.05em',
          }}>
            AVATAR<span style={{ color: 'var(--accent-1)' }}>AI</span>
          </span>
        </motion.div>
      </Link>

      {/* Desktop Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {navLinks.map(link => {
          const isActive = location.pathname === link.path;
          const isChat = link.path === '/chat';
          return (
            <Link key={link.path} to={link.path} style={{ textDecoration: 'none' }}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: isChat ? '8px 20px' : '8px 16px',
                  borderRadius: '8px',
                  fontFamily: 'Orbitron, sans-serif',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  background: isChat
                    ? 'var(--gradient-1)'
                    : isActive
                    ? 'var(--accent-glow)'
                    : 'transparent',
                  color: isChat
                    ? 'white'
                    : isActive
                    ? 'var(--accent-1)'
                    : 'var(--text-secondary)',
                  border: isChat
                    ? 'none'
                    : isActive
                    ? '1px solid var(--border-glow)'
                    : '1px solid transparent',
                  boxShadow: isChat ? '0 4px 15px var(--accent-glow)' : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {link.label}
              </motion.div>
            </Link>
          );
        })}
        <ThemeSwitcher />
      </div>
    </nav>
  );
}
