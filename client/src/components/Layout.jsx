import { useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';

import { useCourseModules } from '../hooks/useCourse';
import { useProgress } from '../hooks/useProgress';
import { overallProgressPercent } from '../utils/progress';
import Confetti from './Confetti';
import Sidebar from './Sidebar';

const NIST_BLUE = '#0071bc';
const MAIN_BACKGROUND = '#f1f1f1';

export default function Layout() {
  const { modules } = useCourseModules();
  const {
    progress,
    loading: progressLoading,
    confettiActive,
    clearConfetti,
    badgeNotification,
    dismissBadgeNotification,
  } = useProgress();

  const overallPercent = overallProgressPercent(modules, progress);

  useEffect(() => {
    if (!badgeNotification) return undefined;

    const timeout = window.setTimeout(() => {
      dismissBadgeNotification();
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [badgeNotification, dismissBadgeNotification]);

  return (
    <div className="h-screen bg-[#f1f1f1] text-slate-900">
      <div className="flex h-full">
        <Sidebar modules={modules} progress={progress} />
        <div className="flex min-w-0 flex-1 flex-col bg-[#f1f1f1]">
          <header
            className="relative flex h-16 items-center justify-between border-b border-white/30 px-6"
            style={{ backgroundColor: NIST_BLUE }}
          >
            <Link
              to="/"
              className="text-base font-semibold text-white hover:text-white/90"
            >
              NIST AI RMF 1.0
            </Link>
            <div className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-white">
              {progressLoading ? 'Progress...' : `Overall Progress: ${overallPercent}%`}
            </div>
            <Link
              to="/achievements"
              className="text-sm font-semibold text-white hover:text-white/90"
            >
              Achievements
            </Link>
          </header>

          <main className="min-h-0 flex-1 overflow-hidden" style={{ backgroundColor: MAIN_BACKGROUND }}>
            <div className="mx-auto h-full w-full max-w-[900px] overflow-y-auto px-6 py-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <Confetti active={confettiActive} onComplete={clearConfetti} />

      {badgeNotification ? (
        <div className="pointer-events-none fixed right-4 top-20 z-[120] max-w-sm">
          <div className="pointer-events-auto rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-xl" aria-hidden="true">{badgeNotification.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  🎉 Badge Earned: {badgeNotification.name}!
                </p>
                <p className="text-xs text-emerald-700">Great work. Your progress was saved.</p>
              </div>
              <button
                type="button"
                onClick={dismissBadgeNotification}
                className="rounded-md px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
