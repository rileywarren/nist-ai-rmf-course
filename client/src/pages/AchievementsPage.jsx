import Badge from '../components/Badge';
import { useCourseModules } from '../hooks/useCourse';
import { useProgress } from '../hooks/useProgress';
import {
  BADGE_CATALOG,
  deriveEarnedBadgeIds,
  getCompletedLessonCount,
  getModuleId,
  getModuleLessons,
  getModuleProgress,
  getModuleStatus,
  getModuleTitle,
} from '../utils/progress';

export default function AchievementsPage() {
  const { modules, loading: modulesLoading } = useCourseModules();
  const { progress, loading: progressLoading } = useProgress();

  const safeModules = Array.isArray(modules) ? modules : [];
  const isLoading = modulesLoading || progressLoading;

  if (isLoading) {
    return (
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-3 animate-pulse">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-200" />
          <div className="h-36 rounded bg-slate-200" />
        </div>
      </section>
    );
  }

  const earnedBadges = deriveEarnedBadgeIds(progress, safeModules);

  const moduleRows = safeModules.map((module, index) => {
    const moduleId = getModuleId(module, index);
    const moduleProgress = getModuleProgress(progress, moduleId);
    const lessonCount = getModuleLessons(module).length;
    const completedLessonCount = getCompletedLessonCount(module, moduleProgress);
    const status = getModuleStatus(module, moduleProgress);

    return {
      moduleId,
      number: index + 1,
      title: getModuleTitle(module, index),
      lessonCount,
      completedLessonCount,
      status,
      quizScore: moduleProgress.quizScore,
      badgeId: module?.badge?.id,
      badgeName: module?.badge?.name || 'Module badge',
    };
  });

  const modulesCompleted = moduleRows.filter((module) => module.status === 'completed').length;
  const lessonsCompleted = moduleRows.reduce((sum, module) => sum + module.completedLessonCount, 0);
  const quizzesPassed = moduleRows.filter((module) => typeof module.quizScore === 'number' && module.quizScore >= 70).length;
  const bestQuiz = moduleRows.reduce((max, module) => {
    if (typeof module.quizScore !== 'number') return max;
    return module.quizScore > max ? module.quizScore : max;
  }, -1);
  const scenariosCompleted = progress?.scenarios ? Object.keys(progress.scenarios).length : 0;
  const startedAt = progress?.user?.startedAt;

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Achievements</h1>
        <p className="mt-2 text-sm text-slate-600">Track badges, module completion, and assessment outcomes.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Badges</h2>
          <span className="text-sm font-semibold text-slate-700">
            {earnedBadges.size} of {BADGE_CATALOG.length} earned
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {BADGE_CATALOG.map((badge) => (
            <Badge key={badge.id} badge={badge} earned={earnedBadges.has(badge.id)} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Statistics</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Modules completed</p>
            <p className="text-2xl font-bold text-slate-900">{modulesCompleted} / {moduleRows.length}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Lessons completed</p>
            <p className="text-2xl font-bold text-slate-900">{lessonsCompleted}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Quizzes passed</p>
            <p className="text-2xl font-bold text-slate-900">{quizzesPassed} / {moduleRows.length}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Best quiz score</p>
            <p className="text-2xl font-bold text-slate-900">{bestQuiz < 0 ? 'N/A' : `${bestQuiz}%`}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Scenarios completed</p>
            <p className="text-2xl font-bold text-slate-900">{scenariosCompleted}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Course started</p>
            <p className="text-xl font-bold text-slate-900">
              {startedAt ? new Date(startedAt).toLocaleDateString() : 'Not started yet'}
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Module Progress</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="text-left text-sm">
                <th className="px-3 py-2 text-slate-500">Module</th>
                <th className="px-3 py-2 text-slate-500">Status</th>
                <th className="px-3 py-2 text-slate-500">Lessons</th>
                <th className="px-3 py-2 text-slate-500">Quiz score</th>
                <th className="px-3 py-2 text-slate-500">Badge</th>
              </tr>
            </thead>
            <tbody>
              {moduleRows.map((module) => {
                const rowClass =
                  module.status === 'completed' ? 'bg-emerald-50' : module.status === 'in_progress' ? 'bg-sky-50' : 'bg-white';

                return (
                  <tr key={module.moduleId} className={rowClass}>
                    <td className="px-3 py-2 text-sm font-semibold text-slate-900">
                      {module.number}. {module.title}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-700">{module.status.replace('_', ' ')}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">
                      {module.completedLessonCount}/{module.lessonCount}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-700">{module.quizScore ?? '—'}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">
                      {module.badgeId && earnedBadges.has(module.badgeId) ? module.badgeName : `${module.badgeName} 🔒`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
