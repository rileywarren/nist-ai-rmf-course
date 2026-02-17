import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import LessonViewer from '../components/LessonViewer';
import { useCourseModules, useModuleLessons } from '../hooks/useCourse';
import { useProgress } from '../hooks/useProgress';
import { allModulesCompleted } from '../utils/progress';

const NIST_BLUE = '#0071bc';

function getModuleId(module, index) {
  if (typeof module?.id === 'string' && module.id.trim()) return module.id;
  if (typeof module?.moduleNumber === 'number') return `module-${module.moduleNumber}`;
  return `module-${index + 1}`;
}

function getModuleNumber(module, index) {
  if (typeof module?.number === 'number') return module.number;
  if (typeof module?.moduleNumber === 'number') return module.moduleNumber;
  const match = /^module-(\d+)$/i.exec(getModuleId(module, index));
  if (match) return Number(match[1]);
  return index + 1;
}

function getModuleTitle(module, index) {
  return module?.title || module?.name || module?.label || `Module ${getModuleNumber(module, index)}`;
}

function getModuleDescription(module) {
  return (
    module?.description ||
    module?.summary ||
    module?.overview ||
    module?.goal ||
    module?.objectives ||
    'No description available for this module.'
  );
}

function getLessonTitle(lesson, index) {
  return lesson?.title || lesson?.name || lesson?.label || `Lesson ${index + 1}`;
}

function getLessonId(lesson, index) {
  if (typeof lesson === 'string' || typeof lesson === 'number') return String(lesson);
  if (!lesson || typeof lesson !== 'object') return `lesson-${index + 1}`;
  return String(lesson.lessonId || lesson.id || lesson.slug || lesson.uid || `lesson-${index + 1}`);
}

function resolveModuleResourceValue(raw) {
  if (!raw) return null;
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
  if (typeof raw === 'object' && (typeof raw.id === 'string' || typeof raw.id === 'number')) {
    return String(raw.id);
  }
  return null;
}

function normalizeModules(modules) {
  const safeModules = Array.isArray(modules) ? modules : [];
  return safeModules.map((module, index) => ({
    ...module,
    id: getModuleId(module, index),
    number: getModuleNumber(module, index),
    title: getModuleTitle(module, index),
    lessonCount: Array.isArray(module?.lessons)
      ? module.lessons.length
      : Array.isArray(module?.lessonList)
        ? module.lessonList.length
        : Array.isArray(module?.lessonsList)
          ? module.lessonsList.length
          : Array.isArray(module?.items)
            ? module.items.length
            : 0,
  }));
}

function ModuleProgressBadge({ completed, total }) {
  return (
    <p className="text-sm font-semibold text-slate-700">
      Progress: <span className="text-slate-900">{completed}</span>/<span>{total}</span> lessons
    </p>
  );
}

function LessonDivider({ lessonNumber }) {
  return (
    <div className="my-8 flex items-center" aria-label={`Divider before lesson ${lessonNumber}`}>
      <span className="h-px w-full bg-slate-300" />
      <span className="mx-3 inline-flex shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Lesson {lessonNumber}
      </span>
      <span className="h-px w-full bg-slate-300" />
    </div>
  );
}

export default function ModulePage() {
  const { moduleId } = useParams();
  const safeModuleId = typeof moduleId === 'string' && moduleId.trim() ? moduleId : '';

  const { modules: rawModules, loading: modulesLoading } = useCourseModules();
  const { lessons, loading: lessonsLoading } = useModuleLessons(safeModuleId);
  const { progress, loading: progressLoading, completeLesson, triggerConfetti } = useProgress();

  const [completingLessonId, setCompletingLessonId] = useState('');

  const modules = useMemo(() => normalizeModules(rawModules), [rawModules]);
  const inferredModuleNumber = useMemo(() => {
    const match = /^module-(\d+)$/i.exec(safeModuleId);
    return match ? Number(match[1]) : null;
  }, [safeModuleId]);

  const navigationModuleCount = modules.length || 8;

  const moduleIndex = useMemo(() => {
    if (!safeModuleId) return -1;
    return modules.findIndex((module) => module.id === safeModuleId);
  }, [modules, safeModuleId]);

  const currentModule = useMemo(() => {
    if (moduleIndex >= 0) return modules[moduleIndex];
    return {
      id: safeModuleId,
      title: getModuleTitle({ id: safeModuleId }, 0),
      number: inferredModuleNumber || 1,
      description: getModuleDescription({}),
    };
  }, [moduleIndex, modules, safeModuleId, inferredModuleNumber]);

  const completedLessonSet = useMemo(() => {
    const moduleProgress =
      progress && typeof progress === 'object' && progress.modules && typeof progress.modules === 'object'
        ? progress.modules[safeModuleId]
        : null;
    const completedLessons = Array.isArray(moduleProgress?.lessonsCompleted)
      ? moduleProgress.lessonsCompleted
      : [];
    return new Set(
      completedLessons
        .map((lessonId) => {
          if (lessonId === null || lessonId === undefined) return null;
          return `${lessonId}`;
        })
        .filter(Boolean),
    );
  }, [progress, safeModuleId]);

  const completedLessonCount = useMemo(
    () =>
      lessons.reduce((count, lesson, index) => {
        const lessonId = getLessonId(lesson, index);
        return completedLessonSet.has(lessonId) ? count + 1 : count;
      }, 0),
    [lessons, completedLessonSet],
  );

  const hasQuiz =
    Boolean(resolveModuleResourceValue(currentModule?.quiz) || resolveModuleResourceValue(currentModule?.quizId) || currentModule?.hasQuiz) &&
    Boolean(safeModuleId);

  const hasScenario =
    Boolean(resolveModuleResourceValue(currentModule?.scenario) || resolveModuleResourceValue(currentModule?.scenarioId) || currentModule?.hasScenario) &&
    Boolean(safeModuleId);

  const prevModuleId =
    moduleIndex > 0
      ? modules[moduleIndex - 1]?.id
      : inferredModuleNumber && inferredModuleNumber > 1
        ? `module-${inferredModuleNumber - 1}`
        : null;
  const nextModuleId =
    moduleIndex >= 0
      ? modules[moduleIndex + 1]?.id
      : inferredModuleNumber && inferredModuleNumber < navigationModuleCount
        ? `module-${inferredModuleNumber + 1}`
        : null;
  const isLoading = modulesLoading || lessonsLoading || progressLoading;

  const onCompleteLesson = async (lessonId) => {
    if (!safeModuleId || !lessonId || completingLessonId === lessonId) return;

    setCompletingLessonId(lessonId);
    try {
      const updatedProgress = await completeLesson(safeModuleId, lessonId);
      if (allModulesCompleted(modules, updatedProgress)) {
        triggerConfetti();
      }
    } catch (error) {
      console.error('Failed to mark lesson as complete:', error);
    } finally {
      setCompletingLessonId('');
    }
  };

  if (!safeModuleId) {
    return <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">Invalid module identifier.</p>;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-36 rounded bg-slate-200" />
            <div className="h-8 w-1/2 rounded bg-slate-200" />
            <div className="h-16 w-full rounded bg-slate-200" />
          </div>
        </div>
        <div className="animate-pulse space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-6">
          <div className="h-10 w-2/3 rounded bg-slate-200" />
          <div className="h-40 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 leading-relaxed">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Module {currentModule.number}</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">{currentModule.title}</h1>
        <p className="mt-3 max-w-3xl text-slate-700">{currentModule.description}</p>
        <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
          <span
            className="inline-flex h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: NIST_BLUE }}
            aria-hidden="true"
          />
          <ModuleProgressBadge completed={completedLessonCount} total={lessons.length} />
        </div>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {lessons.length === 0 ? (
          <p className="text-slate-700">No lessons are available for this module yet.</p>
        ) : (
          lessons.map((lesson, index) => {
            const lessonId = getLessonId(lesson, index);
            const lessonCompleted = completedLessonSet.has(lessonId);
            const buttonState = lessonCompleted
              ? 'cursor-default bg-emerald-100 text-emerald-700'
              : 'bg-sky-600 text-white hover:bg-sky-700';

            return (
              <div key={`${lessonId}-${index}`}>
                <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-2xl font-semibold text-slate-900">{`Lesson ${index + 1}: ${getLessonTitle(lesson, index)}`}</h2>
                  <div className="mt-4">
                    <LessonViewer lesson={lesson} />
                  </div>
                  <div className="mt-5">
                    {lessonCompleted ? (
                      <button
                        type="button"
                        className="inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700"
                        disabled
                      >
                        Completed ✓
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onCompleteLesson(lessonId)}
                        disabled={completingLessonId === lessonId}
                        className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold ${buttonState} ${
                          completingLessonId === lessonId ? 'cursor-wait opacity-70' : ''
                        }`}
                      >
                        {completingLessonId === lessonId ? 'Marking as complete…' : 'Mark as Complete'}
                      </button>
                    )}
                  </div>
                </article>

                {index < lessons.length - 1 && <LessonDivider lessonNumber={index + 2} />}
              </div>
            );
          })
        )}
      </section>

      <footer className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {hasQuiz && (
            <Link
              to={`/module/${safeModuleId}/quiz`}
              className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Take Module Quiz
            </Link>
          )}
          {hasScenario && (
            <Link
              to={`/module/${safeModuleId}/scenario`}
              className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
            >
              Try Scenario
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          {prevModuleId ? (
            <Link
              to={`/module/${prevModuleId}`}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              ← Previous Module
            </Link>
          ) : (
            <span className="inline-flex rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">← Previous Module</span>
          )}

          {nextModuleId ? (
            <Link
              to={`/module/${nextModuleId}`}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-950"
            >
              Next Module →
            </Link>
          ) : (
            <span className="inline-flex rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">Next Module →</span>
          )}
        </div>
      </footer>
    </div>
  );
}
