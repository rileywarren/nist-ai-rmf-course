import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import QuizEngine from '../components/QuizEngine';
import { useCourseModules } from '../hooks/useCourse';
import { useProgress } from '../hooks/useProgress';
import { getQuiz, submitQuiz } from '../utils/api';
import { allModulesCompleted } from '../utils/progress';

function getModuleId(module, index) {
  if (typeof module?.id === 'string' && module.id.trim()) return module.id;
  if (typeof module?.moduleNumber === 'number') return `module-${module.moduleNumber}`;
  return `module-${index + 1}`;
}

function getModuleNumber(module, index) {
  if (typeof module?.number === 'number') return module.number;
  if (typeof module?.moduleNumber === 'number') return module.moduleNumber;
  const match = /^module-(\d+)$/i.exec(getModuleId(module, index));
  return match ? Number(match[1]) : index + 1;
}

function getModuleTitle(module, index) {
  return module?.title || module?.name || module?.label || `Module ${getModuleNumber(module, index)}`;
}

function resolveModuleResourceValue(raw) {
  if (!raw) return null;
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
  if (typeof raw === 'object' && (typeof raw.id === 'string' || typeof raw.id === 'number')) return String(raw.id);
  return null;
}

export default function QuizPage() {
  const { moduleId } = useParams();
  const safeModuleId = typeof moduleId === 'string' && moduleId.trim() ? moduleId : '';

  const { modules: rawModules, loading: modulesLoading } = useCourseModules();
  const { updateProgress, triggerConfetti, showBadgeNotification } = useProgress();
  const [quiz, setQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [completion, setCompletion] = useState(null);

  const modules = useMemo(() => {
    const safeModules = Array.isArray(rawModules) ? rawModules : [];
    return safeModules.map((module, index) => ({ ...module, id: getModuleId(module, index), title: getModuleTitle(module, index) }));
  }, [rawModules]);

  const moduleIndex = useMemo(() => modules.findIndex((module) => module.id === safeModuleId), [modules, safeModuleId]);
  const currentModule = useMemo(() => {
    if (moduleIndex >= 0) return modules[moduleIndex];
    return { id: safeModuleId, title: getModuleTitle({ id: safeModuleId }, 0), number: 1 };
  }, [moduleIndex, modules, safeModuleId]);
  const moduleNumber = getModuleNumber(currentModule, Math.max(moduleIndex, 0));

  const quizId = useMemo(
    () => resolveModuleResourceValue(currentModule?.quizId) || resolveModuleResourceValue(currentModule?.quiz),
    [currentModule],
  );

  const nextModuleId = useMemo(() => {
    if (moduleIndex >= 0) return modules[moduleIndex + 1]?.id || null;
    const inferred = moduleNumber + 1;
    return inferred <= 8 ? `module-${inferred}` : null;
  }, [moduleIndex, moduleNumber, modules]);

  useEffect(() => {
    let active = true;

    if (!quizId) {
      setQuiz(null);
      setQuizError('This module does not have an associated quiz yet.');
      setQuizLoading(false);
      return () => {
        active = false;
      };
    }

    setQuizLoading(true);
    setQuizError('');

    getQuiz(quizId)
      .then((data) => {
        if (!active) return;
        setQuiz(data);
      })
      .catch((error) => {
        if (!active) return;
        setQuizError(error?.message || 'Failed to load quiz');
        setQuiz(null);
      })
      .finally(() => {
        if (active) setQuizLoading(false);
      });

    return () => {
      active = false;
    };
  }, [quizId]);

  const handleSubmit = async (answers) => {
    const result = await submitQuiz(quizId, answers, safeModuleId);

    if (result?.progress) {
      updateProgress(result.progress);
    }

    const courseCompleted = result?.progress && allModulesCompleted(modules, result.progress);
    if (result?.passed || courseCompleted) {
      triggerConfetti();
    }

    if (result?.badgeEarned?.isNew) {
      showBadgeNotification(result.badgeEarned);
    }

    return result;
  };

  const isLoading = modulesLoading || quizLoading;

  if (!safeModuleId) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-6">
        <p className="font-semibold text-amber-900">Module not found.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="space-y-3 animate-pulse">
            <div className="h-6 w-2/3 rounded bg-slate-200" />
            <div className="h-4 w-1/2 rounded bg-slate-200" />
            <div className="h-40 rounded bg-slate-200" />
          </div>
        </div>
      </section>
    );
  }

  if (quizError || !quiz) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-rose-700">{quizError || 'Unable to load this quiz right now.'}</p>
        <div className="mt-4">
          <Link to={`/module/${safeModuleId}`} className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
            Back to Module
          </Link>
        </div>
      </section>
    );
  }

  if (completion) {
    return (
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Quiz Complete · {currentModule.title}
        </h1>
        <p className="text-4xl font-black text-slate-900">{completion.score}%</p>
        <p className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${completion.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {completion.passed ? 'Passed' : 'Try again for a stronger score'}
        </p>
        <p className="text-sm text-slate-600">Correct answers: {completion.correctCount} / {completion.totalQuestions}</p>
        {completion.badgeEarned ? (
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
            🎉 Badge Earned: {completion.badgeEarned.name || completion.badgeEarned.id} {completion.badgeEarned.emoji || ''}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link to={`/module/${safeModuleId}`} className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            Return to Module
          </Link>
          {nextModuleId && (
            <Link to={`/module/${nextModuleId}`} className="inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white">
              Continue to Next Module
            </Link>
          )}
          {!completion.passed && (
            <button
              type="button"
              onClick={() => setCompletion(null)}
              className="inline-flex rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Reopen Quiz
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Module {moduleNumber}</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Module Quiz: {quiz.title || currentModule.title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Answer each question and receive a dynamic score summary at the end.
        </p>
      </header>

      <QuizEngine
        quiz={quiz}
        onSubmit={handleSubmit}
        onComplete={(result) => setCompletion(result)}
      />
    </div>
  );
}
