/**
 * useGestureAvatar — connects FaceMoodMirror → AvatarScene
 * Place in: client/src/hooks/useGestureAvatar.js
 */
import { useCallback, useRef } from 'react';
import { useAvatar } from '../context/AvatarContext';

export function useGestureAvatar() {
  const { setAvatarMood } = useAvatar();
  const timers = useRef({});
  const t = (key, fn, ms) => { clearTimeout(timers.current[key]); timers.current[key] = setTimeout(fn, ms); };

  const handleGesture = useCallback((gesture) => {
    switch (gesture.type) {
      case 'smile':
        setAvatarMood('happy');
        t('smile', () => setAvatarMood('happy'), 1500);
        break;
      case 'surprised':
        setAvatarMood('surprised');
        t('surprised', () => setAvatarMood('happy'), 1200);
        break;
      case 'blink':
        setAvatarMood('nodding');
        t('blink', () => setAvatarMood('happy'), 300);
        break;
      case 'wave':
        setAvatarMood('excited');
        t('wave', () => setAvatarMood('happy'), 2200);
        break;
      case 'look_away':
        setAvatarMood('sad');
        break;
      case 'look_return':
        setAvatarMood('excited');
        t('return', () => setAvatarMood('happy'), 2000);
        break;
      case 'neutral':
        if (!Object.values(timers.current).some(Boolean)) setAvatarMood('happy');
        break;
      default:
        break;
    }
  }, [setAvatarMood]);

  return { handleGesture };
}
