const DEFAULT_PASSING_SCORE = 70;

export const BADGE_CATALOG = [
  {
    id: 'risk-framer',
    name: 'Risk Framer',
    emoji: '⚖️',
    description: 'Completed Module 1 and passed its quiz.',
  },
  {
    id: 'lifecycle-navigator',
    name: 'Lifecycle Navigator',
    emoji: '🚀',
    description: 'Completed Module 2 and passed its quiz.',
  },
  {
    id: 'trustworthiness-expert',
    name: 'Trustworthiness Expert',
    emoji: '🧠',
    description: 'Completed Module 3 and passed its quiz.',
  },
  {
    id: 'governance-architect',
    name: 'Governance Architect',
    emoji: '🏛️',
    description: 'Completed Module 4 and passed its quiz.',
  },
  {
    id: 'context-cartographer',
    name: 'Context Cartographer',
    emoji: '🗺️',
    description: 'Completed Module 5 and passed its quiz.',
  },
  {
    id: 'measurement-master',
    name: 'Measurement Master',
    emoji: '📏',
    description: 'Completed Module 6 and passed its quiz.',
  },
  {
    id: 'risk-commander',
    name: 'Risk Commander',
    emoji: '🧭',
    description: 'Completed Module 7 and passed its quiz.',
  },
  {
    id: 'ai-rmf-master',
    name: 'AI RMF Master',
    emoji: '🏅',
    description: 'Completed Module 8 and passed its quiz.',
  },
  {
    id: 'perfect-score',
    name: 'Perfect Score',
    emoji: '🌟',
    description: 'Earned a 100% score on any module quiz.',
  },
  {
    id: 'scenario-star',
    name: 'Scenario Star',
    emoji: '⭐',
    description: 'Earned an excellent scenario outcome.',
  },
  {
    id: 'completionist',
    name: 'Completionist',
    emoji: '🎯',
    description: 'Completed all modules and passed all module quizzes.',
  },
];

export function getModuleId(module, index = 0) {
  if (typeof module?.id === 'string' && module.id.trim()) return module.id;
  if (typeof module?.moduleNumber === 'number') return `module-${module.moduleNumber}`;
  return `module-${index + 1}`;
}

export function getModuleNumber(module, index = 0) {
  if (typeof module?.number === 'number') return module.number;
  if (typeof module?.moduleNumber === 'number') return module.moduleNumber;
  const match = /^module-(\d+)$/i.exec(getModuleId(module, index));
  return match ? Number(match[1]) : index + 1;
}

export function getModuleTitle(module, index = 0) {
  return module?.title || module?.name || module?.label || `Module ${getModuleNumber(module, index)}`;
}

export function getModuleLessons(module) {
  const candidates = [module?.lessons, module?.lessonList, module?.lessonsList, module?.items, module?.content];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

export function getLessonId(lesson, index = 0) {
  if (typeof lesson === 'string' || typeof lesson === 'number') return String(lesson);
  if (!lesson || typeof lesson !== 'object') return `lesson-${index + 1}`;
  return String(lesson.lessonId || lesson.id || lesson.slug || lesson.uid || `lesson-${index + 1}`);
}

export function getModuleProgress(progress, moduleId) {
  if (!progress || typeof progress !== 'object') return {};
  if (!progress.modules || typeof progress.modules !== 'object') return {};
  return progress.modules[moduleId] || {};
}

export function getCompletedLessonCount(module, moduleProgress) {
  const lessons = getModuleLessons(module);
  const completedLessons = Array.isArray(moduleProgress?.lessonsCompleted) ? moduleProgress.lessonsCompleted : [];
  const completedSet = new Set(completedLessons.map((lessonId) => String(lessonId)));

  return lessons.reduce((count, lesson, lessonIndex) => {
    const lessonId = getLessonId(lesson, lessonIndex);
    return completedSet.has(lessonId) ? count + 1 : count;
  }, 0);
}

export function moduleQuizPassed(moduleProgress, module) {
  if (moduleProgress?.quizPassed === true) return true;

  const passingScore =
    typeof module?.passingScore === 'number' && Number.isFinite(module.passingScore)
      ? module.passingScore
      : DEFAULT_PASSING_SCORE;

  const score = moduleProgress?.quizScore;
  return typeof score === 'number' && Number.isFinite(score) && score >= passingScore;
}

export function isModuleCompleted(module, moduleProgress) {
  const lessonCount = getModuleLessons(module).length;
  const lessonsComplete = lessonCount === 0 || getCompletedLessonCount(module, moduleProgress) >= lessonCount;
  return lessonsComplete && moduleQuizPassed(moduleProgress, module);
}

export function getModuleStatus(module, moduleProgress) {
  if (isModuleCompleted(module, moduleProgress)) return 'completed';

  const completedLessons = getCompletedLessonCount(module, moduleProgress);
  const attempts = typeof moduleProgress?.quizAttempts === 'number' ? moduleProgress.quizAttempts : 0;
  const hasActivity = completedLessons > 0 || attempts > 0 || moduleProgress?.quizScore != null;

  return hasActivity ? 'in_progress' : 'not_started';
}

export function countCompletedModules(modules, progress) {
  const safeModules = Array.isArray(modules) ? modules : [];
  return safeModules.reduce((count, module, index) => {
    const moduleId = getModuleId(module, index);
    const moduleProgress = getModuleProgress(progress, moduleId);
    return count + (isModuleCompleted(module, moduleProgress) ? 1 : 0);
  }, 0);
}

export function allModulesCompleted(modules, progress) {
  const safeModules = Array.isArray(modules) ? modules : [];
  if (safeModules.length === 0) return false;

  return safeModules.every((module, index) => {
    const moduleId = getModuleId(module, index);
    const moduleProgress = getModuleProgress(progress, moduleId);
    return isModuleCompleted(module, moduleProgress);
  });
}

export function overallProgressPercent(modules, progress) {
  const safeModules = Array.isArray(modules) ? modules : [];
  if (safeModules.length === 0) return 0;
  const completedModules = countCompletedModules(safeModules, progress);
  return Math.round((completedModules / safeModules.length) * 100);
}

function hasPerfectScore(progress) {
  const moduleProgressMap = progress?.modules;
  if (!moduleProgressMap || typeof moduleProgressMap !== 'object') return false;
  return Object.values(moduleProgressMap).some(
    (moduleProgress) => typeof moduleProgress?.quizScore === 'number' && moduleProgress.quizScore >= 100,
  );
}

function hasExcellentScenario(progress) {
  const scenarios = progress?.scenarios;
  if (!scenarios || typeof scenarios !== 'object') return false;

  return Object.values(scenarios).some((result) => {
    const score = Number(result?.score);
    const maxScore = Number(result?.maxScore);
    if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return false;
    return score / maxScore >= 0.9;
  });
}

export function deriveEarnedBadgeIds(progress, modules) {
  const earned = new Set(
    Array.isArray(progress?.badges)
      ? progress.badges.map((badgeId) => String(badgeId))
      : [],
  );

  const safeModules = Array.isArray(modules) ? modules : [];
  safeModules.forEach((module, index) => {
    const moduleId = getModuleId(module, index);
    const moduleProgress = getModuleProgress(progress, moduleId);
    const badgeId = module?.badge?.id;

    if (badgeId && (moduleProgress?.badgeEarned || isModuleCompleted(module, moduleProgress))) {
      earned.add(String(badgeId));
    }
  });

  if (hasPerfectScore(progress)) {
    earned.add('perfect-score');
  }

  if (hasExcellentScenario(progress)) {
    earned.add('scenario-star');
  }

  if (allModulesCompleted(safeModules, progress)) {
    earned.add('completionist');
  }

  return earned;
}
