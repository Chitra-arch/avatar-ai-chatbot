import { createContext, useContext, useState, useCallback } from 'react';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ totalMessages:0, voiceMessages:0, textMessages:0, avatarUsage:{} });

  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, { ...message, id: Date.now() + Math.random() }]);
    if (message.role === 'user') {
      setStats(prev => ({
        ...prev,
        totalMessages: prev.totalMessages + 1,
        voiceMessages: prev.voiceMessages + (message.isVoice ? 1 : 0),
        textMessages:  prev.textMessages  + (message.isVoice ? 0 : 1),
      }));
    }
  }, []);

  // Clear all messages - called when avatar switches
  const clearMessages = useCallback(() => setMessages([]), []);

  const trackAvatarUsage = useCallback((avatarId) => {
    if (!avatarId) return;
    setStats(prev => ({
      ...prev,
      avatarUsage: { ...prev.avatarUsage, [avatarId]: (prev.avatarUsage[avatarId] || 0) + 1 },
    }));
  }, []);

  return (
    <ChatContext.Provider value={{ messages, addMessage, clearMessages, stats, trackAvatarUsage }}>
      {children}
    </ChatContext.Provider>
  );
}
export function useChat() { return useContext(ChatContext); }
