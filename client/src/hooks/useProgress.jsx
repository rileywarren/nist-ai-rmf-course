import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { getProgress, markLessonComplete as apiMarkComplete, resetProgress as apiReset } from '../utils/api';

const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confettiActive, setConfettiActive] = useState(false);
  const [badgeNotification, setBadgeNotification] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProgress();
      setProgress(data);
    } catch (err) {
      console.error('Failed to load progress:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const completeLesson = useCallback(async (moduleId, lessonId) => {
    const data = await apiMarkComplete(moduleId, lessonId);
    setProgress(data);
    return data;
  }, []);

  const reset = useCallback(async () => {
    const data = await apiReset();
    setProgress(data);
    return data;
  }, []);

  const updateProgress = useCallback((newProgress) => {
    setProgress(newProgress);
  }, []);

  const triggerConfetti = useCallback(() => {
    setConfettiActive(true);
  }, []);

  const clearConfetti = useCallback(() => {
    setConfettiActive(false);
  }, []);

  const showBadgeNotification = useCallback((badge) => {
    if (!badge || typeof badge !== 'object' || !badge.id) return;
    setBadgeNotification({
      id: badge.id,
      name: badge.name || badge.id,
      emoji: badge.emoji || '🏅',
    });
  }, []);

  const dismissBadgeNotification = useCallback(() => {
    setBadgeNotification(null);
  }, []);

  return (
    <ProgressContext.Provider
      value={{
        progress,
        loading,
        completeLesson,
        reset,
        refresh,
        updateProgress,
        confettiActive,
        triggerConfetti,
        clearConfetti,
        badgeNotification,
        showBadgeNotification,
        dismissBadgeNotification,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
