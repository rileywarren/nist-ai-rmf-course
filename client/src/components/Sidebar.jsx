import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useProgress } from '../hooks/useProgress';
import {
  getCompletedLessonCount,
  getLessonId as resolveLessonId,
  getModuleId,
  getModuleLessons as resolveLessonArray,
  getModuleNumber,
  getModuleProgress,
  getModuleStatus,
  getModuleTitle,
  isModuleCompleted,
} from '../utils/progress';

const NIST_BLUE = '#0071bc';

function getModuleBadgeIcon(module) {
  const badge = module?.badge;

  if (typeof badge === 'string') return badge;
  if (badge && typeof badge === 'object') {
    if (typeof badge.emoji === 'string') return badge.emoji;
    if (typeof badge.icon === 'string') return badge.icon;
  }

  return '📘';
}
function resolveLessonTitle(lesson, index) {
  return lesson?.title || lesson?.name || lesson?.label || `Lesson ${index + 1}`;
}

function resolveModuleResourceValue(raw) {
  if (!raw) return null;
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
  if (typeof raw === 'object' && (typeof raw.id === 'string' || typeof raw.id === 'number')) {
    return String(raw.id);
  }
  return null;
}

export default function Sidebar({ modules, progress }) {
  const safeModules = Array.isArray(modules) ? modules : [];
  const { reset } = useProgress();
  const location = useLocation();

  const moduleIdFromPath = useMemo(() => {
    const match = location.pathname.match(/^\/module\/([^/?#]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const activeLessonId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const lessonFromQuery = searchParams.get('lesson');
    if (lessonFromQuery) return lessonFromQuery;
    if (!location.hash) return null;
    const hash = location.hash.replace('#', '');
    return hash.startsWith('lesson=') ? hash.slice(7) : hash;
  }, [location.search, location.hash]);

  const [expandedModules, setExpandedModules] = useState(() => {
    const initial = new Set();
    if (moduleIdFromPath) initial.add(moduleIdFromPath);
    return initial;
  });

  useEffect(() => {
    if (!moduleIdFromPath) return;
    setExpandedModules((prev) => {
      if (prev.has(moduleIdFromPath)) return prev;
      return new Set([...prev, moduleIdFromPath]);
    });
  }, [moduleIdFromPath]);

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const getLessonStateClass = (isCompleted, isActive, isInProgress) => {
    if (isCompleted) return 'bg-green-400';
    if (isInProgress) return 'bg-sky-200';
    if (isActive) return 'bg-sky-300';
    return 'bg-slate-400/80';
  };

  const handleResetProgress = async () => {
    if (!window.confirm('Reset all learning progress? This will clear lesson, quiz, and scenario completion.')) return;
    try {
      await reset();
    } catch (error) {
      console.error('Failed to reset progress:', error);
    }
  };

  return (
    <aside
      className="flex h-screen w-[280px] shrink-0 flex-col overflow-hidden border-r border-white/20 text-white"
      style={{ backgroundColor: NIST_BLUE }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {safeModules.length === 0 ? (
          <p className="px-2 text-sm text-white/75">No modules available.</p>
        ) : (
          <div className="space-y-3">
            {safeModules.map((module, index) => {
              const moduleId = getModuleId(module, index);
              const moduleTitle = getModuleTitle(module, index);
              const moduleNumber = getModuleNumber(module, index);
              const badgeIcon = getModuleBadgeIcon(module);
              const lessonList = resolveLessonArray(module);
              const moduleProgress = getModuleProgress(progress, moduleId);
              const completedLessons = Array.isArray(moduleProgress.lessonsCompleted) ? moduleProgress.lessonsCompleted : [];
              const completedLessonSet = new Set(
                completedLessons
                  .map((lessonId) => (lessonId == null ? null : String(lessonId)))
                  .filter(Boolean),
              );
              const completedCount = getCompletedLessonCount(module, moduleProgress);
              const firstIncompleteLessonIndex = lessonList.findIndex((lesson, lessonIndex) => {
                const lessonId = resolveLessonId(lesson, lessonIndex);
                return !completedLessonSet.has(lessonId);
              });
              const moduleActive = moduleId === moduleIdFromPath;
              const moduleComplete = isModuleCompleted(module, moduleProgress);
              const moduleStatus = getModuleStatus(module, moduleProgress);
              const isExpanded = expandedModules.has(moduleId);
              const hasQuiz = Boolean(resolveModuleResourceValue(module.quiz) || resolveModuleResourceValue(module.quizId) || module?.hasQuiz);
              const hasScenario = Boolean(resolveModuleResourceValue(module.scenario) || resolveModuleResourceValue(module.scenarioId) || module?.hasScenario);
              const quizHref = hasQuiz ? `/module/${moduleId}/quiz` : null;
              const scenarioHref = hasScenario ? `/module/${moduleId}/scenario` : null;
              const isQuizActive = quizHref && location.pathname === quizHref;
              const isScenarioActive = scenarioHref && location.pathname === scenarioHref;

              return (
                <section key={moduleId} className="rounded-lg border border-white/20 bg-white/5">
                  <button
                    type="button"
                    onClick={() => toggleModule(moduleId)}
                    className={`w-full rounded-lg px-3 py-3 text-left transition ${
                      moduleComplete ? 'bg-emerald-700/30' : moduleActive ? 'bg-white/15' : 'bg-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-lg leading-none" aria-hidden="true">
                          {badgeIcon}
                        </span>
                        <span className="truncate text-sm font-semibold">
                          Module {moduleNumber}: {moduleTitle}
                        </span>
                      </div>
                      <span className="text-xs text-white/90">{completedCount}/{lessonList.length} lessons</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-white/85">
                      <span className="truncate">
                        {moduleStatus === 'completed' ? 'Completed' : moduleStatus === 'in_progress' ? 'In Progress' : 'Not Started'}
                      </span>
                      <span className="ml-2">{isExpanded ? '▾' : '▸'}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3">
                      {lessonList.length === 0 ? (
                        <p className="px-1 text-xs text-white/70">No lessons available.</p>
                      ) : (
                        <ul className="mt-1 space-y-1">
                          {lessonList.map((lesson, lessonIndex) => {
                            const lessonId = resolveLessonId(lesson, lessonIndex);
                            const lessonTitle = resolveLessonTitle(lesson, lessonIndex);
                            const lessonPath = `/module/${moduleId}?lesson=${encodeURIComponent(lessonId)}`;
                            const completed = completedLessonSet.has(lessonId);
                            const activeLesson = moduleActive && activeLessonId === lessonId;
                            const inProgress =
                              !completed &&
                              (activeLesson ||
                                (moduleActive && moduleProgress?.status === 'in_progress' && lessonIndex === firstIncompleteLessonIndex));
                            const dotClass = getLessonStateClass(completed, activeLesson, inProgress);

                            return (
                              <li key={`${moduleId}-${lessonId}-${lessonIndex}`}>
                                <Link
                                  to={lessonPath}
                                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                                    activeLesson
                                      ? 'border-l-2 border-white bg-white/15'
                                      : 'hover:bg-white/10'
                                  }`}
                                >
                                  <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                                  <span className="truncate">{lessonTitle}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {(hasQuiz || hasScenario) && (
                        <div className="mt-3 space-y-1 border-t border-white/20 pt-2">
                          {quizHref && (
                            <Link
                              to={quizHref}
                              className={`flex rounded-md px-2 py-1.5 text-sm transition ${
                                isQuizActive
                                  ? 'border-l-2 border-white bg-white/15'
                                  : 'hover:bg-white/10'
                              }`}
                            >
                              Quiz
                            </Link>
                          )}
                          {scenarioHref && (
                            <Link
                              to={scenarioHref}
                              className={`flex rounded-md px-2 py-1.5 text-sm transition ${
                                isScenarioActive
                                  ? 'border-l-2 border-white bg-white/15'
                                  : 'hover:bg-white/10'
                              }`}
                            >
                              Scenario
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
      <div className="border-t border-white/20 px-3 py-4">
        <div className="space-y-2">
          <Link
            to="/glossary"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10"
          >
            Glossary
          </Link>
          <Link
            to="/achievements"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10"
          >
            Achievements
          </Link>
          <button
            type="button"
            onClick={handleResetProgress}
            className="w-full rounded-md bg-white/10 px-3 py-2 text-left text-sm font-medium hover:bg-white/20"
          >
            Reset Progress
          </button>
        </div>
      </div>
    </aside>
  );
}
