import { useState, useEffect } from 'react';
import { getModules, getLessons } from '../utils/api';

export function useCourseModules() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getModules()
      .then(data => setModules(data.modules || []))
      .catch(err => console.error('Failed to load modules:', err))
      .finally(() => setLoading(false));
  }, []);

  return { modules, loading };
}

export function useModuleLessons(moduleId) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!moduleId) {
      setLessons([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getLessons(moduleId)
      .then(data => setLessons(data.lessons || []))
      .catch(err => console.error('Failed to load lessons:', err))
      .finally(() => setLoading(false));
  }, [moduleId]);

  return { lessons, loading };
}
