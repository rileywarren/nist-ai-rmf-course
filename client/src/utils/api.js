const BASE = '/api';

async function fetchJSON(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    let message = `API error: ${res.status} ${res.statusText}`;
    try {
      const errorPayload = await res.json();
      if (typeof errorPayload?.detail === 'string' && errorPayload.detail.trim()) {
        message = errorPayload.detail;
      }
    } catch (error) {
      // Ignore JSON parsing errors and keep status text message.
    }
    throw new Error(message);
  }
  return res.json();
}

async function fetchBinary(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, options);
  if (!res.ok) {
    let message = `API error: ${res.status} ${res.statusText}`;
    try {
      const errorPayload = await res.json();
      if (typeof errorPayload?.detail === 'string' && errorPayload.detail.trim()) {
        message = errorPayload.detail;
      }
    } catch (error) {
      // Ignore JSON parsing errors and keep status text message.
    }
    throw new Error(message);
  }
  return res.blob();
}

// Modules & Lessons
export const getModules = () => fetchJSON('/modules');
export const getLessons = (moduleId) => fetchJSON(`/modules/${moduleId}/lessons`);

// Progress
export const getProgress = () => fetchJSON('/progress');
export const markLessonComplete = (moduleId, lessonId) =>
  fetchJSON('/progress/lesson-complete', {
    method: 'POST',
    body: JSON.stringify({ moduleId, lessonId }),
  });
export const resetProgress = () => fetchJSON('/progress/reset', { method: 'POST' });

// Quizzes
export const getQuiz = (quizId) => fetchJSON(`/quizzes/${quizId}`);
export const submitQuiz = (quizId, answers, moduleId) =>
  fetchJSON(`/quizzes/${quizId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers, moduleId }),
  });

// Scenarios
export const getScenario = (scenarioId) => fetchJSON(`/scenarios/${scenarioId}`);
export const submitScenarioChoice = (scenarioId, stepId, choiceIndex) =>
  fetchJSON(`/scenarios/${scenarioId}/choice`, {
    method: 'POST',
    body: JSON.stringify({ stepId, choiceIndex }),
  });

// Glossary
export const getGlossary = () => fetchJSON('/glossary');

// Capstone
export const getCapstone = () => fetchJSON('/capstone');
export const saveCapstone = (data) =>
  fetchJSON('/capstone/save', { method: 'POST', body: JSON.stringify(data) });

// TTS
export const getTtsVoices = () => fetchJSON('/tts/voices');
export const synthesizeTts = ({ text, voice, speed }) =>
  fetchBinary('/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, speed }),
  });
