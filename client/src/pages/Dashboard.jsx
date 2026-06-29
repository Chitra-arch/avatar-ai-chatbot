import { motion } from 'framer-motion';
import ParticleBackground from '../components/ParticleBackground';
import { useChat } from '../context/ChatContext';
import { AVATARS } from '../context/AvatarContext';

function BarChart({ data, maxValue }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '120px', padding: '0 8px' }}>
      {data.map((item, i) => {
        const pct = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.value}</span>
            <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(pct, 4)}%` }} transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }} style={{ width: '100%', background: `linear-gradient(to top, ${item.color}, ${item.color}88)`, borderRadius: '6px 6px 0 0', minHeight: '4px', boxShadow: `0 0 12px ${item.color}50` }} />
            <span style={{ fontSize: '0.7rem' }}>{item.icon}</span>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center' }}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { stats } = useChat();
  const avatarChartData = AVATARS.map(a => ({ label: a.name, value: stats.avatarUsage[a.id] || 0, color: a.color, icon: a.emoji }));
  const messageChartData = [
    { label: 'Total', value: stats.totalMessages, color: '#7c3aed', icon: '💬' },
    { label: 'Voice', value: stats.voiceMessages, color: '#06b6d4', icon: '🎤' },
    { label: 'Text', value: stats.textMessages, color: '#22c55e', icon: '⌨️' },
  ];
  const maxAvatarVal = Math.max(...avatarChartData.map(d => d.value), 1);
  const maxMsgVal = Math.max(...messageChartData.map(d => d.value), 1);
  const voicePct = stats.totalMessages > 0 ? Math.round((stats.voiceMessages / stats.totalMessages) * 100) : 0;

  const statCards = [
    { icon: '💬', label: 'Total Messages Sent', value: stats.totalMessages, color: '#7c3aed' },
    { icon: '🎤', label: 'Voice Messages', value: stats.voiceMessages, color: '#06b6d4' },
    { icon: '⌨️', label: 'Text Messages', value: stats.textMessages, color: '#22c55e' },
    { icon: '🔥', label: 'Voice Usage %', value: `${voicePct}%`, color: '#f59e0b' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: '64px', position: 'relative' }}>
      <ParticleBackground />
      <div className="grid-overlay" />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px', position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--accent-glow)', border: '1px solid var(--border-color)', borderRadius: '100px', padding: '6px 16px', marginBottom: '16px', fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.1em', color: 'var(--accent-1)' }}>
            📊 ANALYTICS DASHBOARD
          </div>
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Session <span className="gradient-text">Statistics</span>
          </h1>
          <p style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Track your conversation activity and avatar usage in real time.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {statCards.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', backdropFilter: 'blur(16px)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: s.color }} />
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{s.icon}</div>
              <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '2rem', fontWeight: '900', color: s.color, marginBottom: '4px' }}>{s.value}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </motion.div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
          {[{ title: 'MESSAGE BREAKDOWN', data: messageChartData, max: maxMsgVal }, { title: 'AVATAR USAGE', data: avatarChartData, max: maxAvatarVal }].map((chart, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', backdropFilter: 'blur(16px)' }}>
              <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: '20px' }}>{chart.title}</h3>
              <BarChart data={chart.data} maxValue={chart.max} />
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', backdropFilter: 'blur(16px)' }}>
          <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: '20px' }}>AVATAR PERFORMANCE</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {AVATARS.map(avatar => {
              const usage = stats.avatarUsage[avatar.id] || 0;
              const pct = stats.totalMessages > 0 ? (usage / stats.totalMessages) * 100 : 0;
              return (
                <div key={avatar.id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{avatar.emoji}</span>
                  <div style={{ flexShrink: 0, width: '80px' }}>
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.72rem', fontWeight: '700', color: avatar.color }}>{avatar.name}</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{avatar.personality}</div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: '100px', height: '8px', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.8, ease: 'easeOut' }} style={{ height: '100%', background: `linear-gradient(90deg, ${avatar.color}, ${avatar.color}88)`, borderRadius: '100px', boxShadow: `0 0 8px ${avatar.color}60` }} />
                  </div>
                  <div style={{ flexShrink: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '80px', textAlign: 'right' }}>{usage} · {Math.round(pct)}%</div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {stats.totalMessages === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} style={{ textAlign: 'center', marginTop: '32px', padding: '32px', background: 'var(--accent-glow)', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>💬</div>
            <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>NO CHAT DATA YET — START A CONVERSATION TO SEE ANALYTICS</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
