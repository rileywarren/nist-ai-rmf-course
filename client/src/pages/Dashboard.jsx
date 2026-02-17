import { Link } from 'react-router-dom';

import { useCourseModules } from '../hooks/useCourse';
import { useProgress } from '../hooks/useProgress';
import {
  BADGE_CATALOG,
  deriveEarnedBadgeIds,
  getCompletedLessonCount,
  getLessonId,
  getModuleId,
  getModuleLessons,
  getModuleProgress,
  getModuleStatus,
  getModuleTitle,
  isModuleCompleted,
  overallProgressPercent,
} from '../utils/progress';

const NIST_BLUE = '#0071bc';
const NIST_NAVY = '#003366';

function ProgressRing({ value }) {
  const size = 120;
  const strokeWidth = 10;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, Math.round(value)));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="block" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#d6deef"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={progress >= 100 ? '#2e8540' : NIST_BLUE}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 60 60)"
          className="transition-[stroke-dashoffset] duration-700 ease-in-out"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold" style={{ color: NIST_NAVY }}>
          {progress}%
        </div>
        <div className="text-xs font-medium text-slate-600">Complete</div>
      </div>
    </div>
  );
}

function statusBadge(status) {
  if (status === 'completed') {
    return {
      label: 'Completed',
      icon: '✅',
      classes: 'text-emerald-700 bg-emerald-100 ring-1 ring-emerald-300',
    };
  }

  if (status === 'in_progress') {
    return {
      label: 'In Progress',
      icon: '🟦',
      classes: 'text-sky-700 bg-sky-100 ring-1 ring-sky-300',
    };
  }

  return {
    label: 'Not Started',
    icon: '⚪',
    classes: 'text-slate-600 bg-slate-100 ring-1 ring-slate-300',
  };
}

function firstIncompleteLink(modules, progress) {
  const safeModules = Array.isArray(modules) ? modules : [];
  for (let index = 0; index < safeModules.length; index += 1) {
    const module = safeModules[index];
    const moduleId = getModuleId(module, index);
    const moduleProgress = getModuleProgress(progress, moduleId);
    const lessons = getModuleLessons(module);

    if (!isModuleCompleted(module, moduleProgress)) {
      const completedSet = new Set(
        Array.isArray(moduleProgress.lessonsCompleted)
          ? moduleProgress.lessonsCompleted.map((lessonId) => String(lessonId))
          : [],
      );

      for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex += 1) {
        const lessonId = getLessonId(lessons[lessonIndex], lessonIndex);
        if (!completedSet.has(lessonId)) {
          return `/module/${moduleId}?lesson=${encodeURIComponent(lessonId)}`;
        }
      }

      return `/module/${moduleId}`;
    }
  }

  return `/module/${getModuleId(safeModules[0], 0)}`;
}

export default function Dashboard() {
  const { modules, loading: modulesLoading } = useCourseModules();
  const { progress, loading: progressLoading } = useProgress();

  const safeModules = Array.isArray(modules) ? modules : [];
  const isLoading = modulesLoading || progressLoading;

  if (isLoading) {
    return (
      <div className="space-y-8 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-3/4 rounded bg-slate-200" />
            <div className="h-4 w-1/2 rounded bg-slate-200" />
            <div className="h-40 w-40 rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  const moduleCards = safeModules.map((module, index) => {
    const moduleId = getModuleId(module, index);
    const moduleProgress = getModuleProgress(progress, moduleId);
    const lessons = getModuleLessons(module);
    const completedLessonCount = getCompletedLessonCount(module, moduleProgress);
    const status = getModuleStatus(module, moduleProgress);

    return {
      module,
      moduleId,
      title: getModuleTitle(module, index),
      number: index + 1,
      status,
      completedLessonCount,
      lessonCount: lessons.length,
      quizScore: moduleProgress.quizScore,
      progressPercent: lessons.length > 0 ? Math.round((completedLessonCount / lessons.length) * 100) : 0,
      emoji: module?.badge?.emoji || '📘',
    };
  });

  const overallPercent = overallProgressPercent(safeModules, progress);
  const completedModuleCount = moduleCards.filter((card) => card.status === 'completed').length;
  const earnedBadges = deriveEarnedBadgeIds(progress, safeModules);
  const nextLink = moduleCards.length > 0 ? firstIncompleteLink(safeModules, progress) : '/module/module-1';

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-white bg-gradient-to-br to-[#dcefff] from-[#eaf5ff] p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex rounded-full bg-[#d2e9ff] px-3 py-1 text-sm font-semibold text-[#004780]">
              Course Dashboard
            </p>
            <h1 className="text-3xl font-black tracking-tight text-[#001f3d] sm:text-4xl" style={{ color: NIST_NAVY }}>
              NIST AI RMF 1.0 Training Course
            </h1>
            <p className="max-w-2xl text-base text-slate-700">
              Master the Artificial Intelligence Risk Management Framework.
            </p>
            <p className="text-sm font-semibold" style={{ color: NIST_BLUE }}>
              Overall Progress: {overallPercent}%
            </p>
            <Link
              to={nextLink}
              className="inline-flex rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: NIST_BLUE }}
            >
              {overallPercent > 0 ? 'Continue Learning' : 'Start Course'}
            </Link>
          </div>
          <ProgressRing value={overallPercent} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Modules Completed</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{completedModuleCount} / {safeModules.length || 8}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Badges Earned</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{earnedBadges.size} / {BADGE_CATALOG.length}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Current Path</p>
          <p className="mt-2 text-xl font-black text-slate-900">{moduleCards[0] ? `Module ${moduleCards[0].number} to ${safeModules.length}` : 'Module 1'}</p>
        </article>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Module Path</h2>
            <p className="text-sm text-slate-500">Track module completion and jump back into lessons.</p>
          </div>
          <span className="rounded-full border border-white/80 bg-white px-3 py-1 text-xs font-semibold" style={{ color: NIST_BLUE }}>
            {completedModuleCount} of {safeModules.length || 8} complete
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {moduleCards.map((card) => {
            const state = statusBadge(card.status);

            return (
              <Link
                key={card.moduleId}
                to={`/module/${card.moduleId}`}
                className="rounded-2xl border-2 border-slate-300 bg-white p-5 transition hover:-translate-y-0.5"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-3xl" aria-hidden="true">{card.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Module {card.number}</p>
                      <h3 className="truncate text-lg font-semibold text-slate-900">{card.title}</h3>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${state.classes}`}>
                    <span aria-hidden="true">{state.icon}</span>
                    {state.label}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        card.status === 'completed' ? 'bg-emerald-500' : card.status === 'in_progress' ? 'bg-sky-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, card.progressPercent))}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-600">Lessons: {card.completedLessonCount}/{card.lessonCount}</p>
                  <p className="text-sm text-slate-600">Quiz: {card.quizScore == null ? 'Not passed yet' : `${card.quizScore}%`}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-slate-900">Badges</h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-700">{earnedBadges.size} of {BADGE_CATALOG.length} badges earned</p>
          <div className="-mx-1 flex gap-3 overflow-x-auto pb-1">
            {BADGE_CATALOG.map((badge) => {
              const earned = earnedBadges.has(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`min-w-[104px] flex-1 rounded-2xl border p-3 text-center transition ${
                    earned
                      ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100'
                      : 'border-slate-200 bg-slate-100 text-slate-500'
                  }`}
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 bg-white/80 text-2xl">
                    <span aria-hidden="true">{earned ? badge.emoji : '🔒'}</span>
                  </div>
                  <p className={`mt-2 text-sm font-semibold ${earned ? 'text-emerald-900' : 'text-slate-500'}`}>
                    {badge.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
