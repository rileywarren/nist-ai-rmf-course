import { useEffect, useMemo, useState } from 'react';

import { submitScenarioChoice } from '../utils/api';

const GRADE_TITLES = {
  excellent: 'Excellent',
  good: 'Good',
  satisfactory: 'Satisfactory',
  needsWork: 'Needs Work',
  needs_improvement: 'Needs Work',
  unknown: 'Needs Work',
};

const GRADE_MESSAGES = {
  excellent: 'Outstanding judgment and recovery planning. You kept control and improved resilience.',
  good: 'Great choices. You applied solid evidence-first reasoning with a few missed opportunities.',
  satisfactory: 'You completed the process but should strengthen your consistency across the remaining steps.',
  needsWork: 'You should revisit scenario planning and strengthen containment, communication, and documentation.',
  needs_improvement: 'You should revisit scenario planning and strengthen containment, communication, and documentation.',
};

function gradeClass(grade) {
  const normalized = `${grade || 'needsWork'}`;
  if (normalized === 'excellent') return 'from-emerald-200 to-emerald-50 text-emerald-800 border-emerald-300';
  if (normalized === 'good') return 'from-sky-200 to-sky-50 text-sky-800 border-sky-300';
  if (normalized === 'satisfactory') return 'from-amber-200 to-amber-50 text-amber-800 border-amber-300';
  return 'from-rose-200 to-rose-50 text-rose-800 border-rose-300';
}

function normalizeSteps(scenario) {
  if (!scenario || !Array.isArray(scenario.steps)) return [];
  return scenario.steps;
}

function normalizeMaxPoints(scenario, fallback) {
  if (typeof scenario?.maxPoints === 'number') return scenario.maxPoints;
  return Math.max(0, fallback);
}

export default function ScenarioEngine({ scenario, onComplete }) {
  const title = scenario?.title || 'Scenario';
  const context = scenario?.context || '';
  const grading = scenario?.grading || {};
  const steps = useMemo(() => normalizeSteps(scenario), [scenario]);
  const [currentStepId, setCurrentStepId] = useState(steps[0]?.id || null);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [runningPoints, setRunningPoints] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [contextExpanded, setContextExpanded] = useState(true);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (steps.length === 0) {
      setCurrentStepId(null);
      return;
    }
    if (!steps.some((step) => step.id === currentStepId)) {
      setCurrentStepId(steps[0].id);
    }
  }, [steps, currentStepId]);

  const currentStep = useMemo(
    () => steps.find((step) => step.id === currentStepId) || null,
    [steps, currentStepId],
  );

  const stepIndex = useMemo(
    () => (currentStep ? steps.findIndex((step) => step.id === currentStep.id) : -1),
    [currentStep, steps],
  );

  useEffect(() => {
    setContextExpanded(stepIndex <= 0);
  }, [stepIndex]);

  const choices = Array.isArray(currentStep?.choices) ? currentStep.choices : [];
  const maxPoints = normalizeMaxPoints(scenario, runningPoints);

  const selectedChoiceText = selectedChoice == null || selectedChoice < 0 ? '' : choices[selectedChoice]?.text || '';
  const gradeLabel = result?.grade || 'needsWork';
  const gradeMessage =
    result?.message ||
    (typeof result?.grade === 'string' && GRADE_MESSAGES[result.grade]) ||
    (typeof gradeLabel === 'string' && grading?.[gradeLabel]?.message) ||
    GRADE_MESSAGES.needsWork;
  const scorePercent = maxPoints > 0 ? Math.round((runningPoints / maxPoints) * 100) : 0;

  const submitChoice = async () => {
    if (!scenario?.id || !currentStep || selectedChoice == null || submitting) return;

    setSubmitting(true);
    setFeedback('');

    try {
      const response = await submitScenarioChoice(scenario.id, currentStep.id, selectedChoice, runningPoints);
      const gainedPoints = Number(response?.points) || 0;
      const totalPoints = runningPoints + gainedPoints;
      setRunningPoints(totalPoints);
      setFeedback(response?.feedback || '');

      if (response?.isComplete && response?.finalResult) {
        const finalResult = {
          totalPoints: response.finalResult.totalPoints ?? totalPoints,
          maxPoints: response.finalResult.maxPoints ?? maxPoints,
          grade: response.finalResult.grade || 'needsWork',
          message: response.finalResult.message || gradeMessage,
        };
        setResult(finalResult);
        onComplete?.(finalResult);
        return;
      }

      if (response?.nextStepId) {
        setCurrentStepId(response.nextStepId);
        setSelectedChoice(null);
        setAnimKey((value) => value + 1);
      }
    } catch (error) {
      setFeedback(error?.message || 'Unable to submit this choice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!steps.length) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-700">No scenario steps available.</p>
      </section>
    );
  }

  if (result) {
    const displayGrade = typeof result.grade === 'string' ? result.grade : 'needsWork';
    const normalizedGrade = `${displayGrade}`;
    const titleText = GRADE_TITLES[normalizedGrade] || GRADE_TITLES.needsWork;
    const visualTone = gradeClass(normalizedGrade);
    const starsCount =
      normalizedGrade === 'excellent' ? 5 : normalizedGrade === 'good' ? 4 : normalizedGrade === 'satisfactory' ? 3 : 2;

    return (
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Scenario Complete</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-700">
            Final score: {result.totalPoints} / {result.maxPoints}
          </p>
          <p className={`mt-2 inline-flex rounded-full border ${visualTone.split(' ').slice(2).join(' ')} px-3 py-1 text-sm font-semibold`}>{titleText}</p>
          <div className="mt-3 flex items-center gap-1" aria-label="Scenario grade stars">
            {Array.from({ length: 5 }).map((_, starIndex) => (
              <span
                key={`${normalizedGrade}-star-${starIndex}`}
                className={starIndex < starsCount ? 'text-amber-400' : 'text-slate-300'}
                aria-hidden
              >
                ★
              </span>
            ))}
          </div>
        </header>

        <div className={`rounded-lg border bg-gradient-to-r ${visualTone} p-4`}>
          <p className="text-sm font-semibold">{titleText}: {gradeMessage}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-700">Points Earned</p>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-slate-700 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, scorePercent))}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Return to Module
          </button>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setRunningPoints(0);
              setSelectedChoice(null);
              setFeedback('');
              setCurrentStepId(steps[0]?.id || null);
            }}
            className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <style>{`
        @keyframes scenario-step {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <header className="sticky top-0 z-10 rounded-xl border border-slate-200 bg-white/90 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">Points: {runningPoints}/{maxPoints || 'TBD'} · Step {Math.max(1, stepIndex + 1)} of {steps.length}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${scorePercent >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {Math.round((runningPoints / Math.max(1, maxPoints)) * 100)}%
          </span>
        </div>

        <button
          type="button"
          onClick={() => setContextExpanded((prev) => !prev)}
          className="mt-3 inline-flex rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
        >
          {contextExpanded ? 'Hide context' : 'Show context'}
        </button>

        {contextExpanded && <p className="mt-2 text-sm text-slate-700">{context}</p>}
      </header>

      <article
        key={`${currentStepId}-${animKey}`}
        className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
        style={{ animation: 'scenario-step 0.25s ease' }}
      >
        <p className="text-lg font-semibold text-slate-900">{currentStep?.narrative || 'Continue the scenario.'}</p>

        <div className="mt-4 space-y-3">
          {choices.map((choice, index) => {
            const isSelected = selectedChoice === index;
            return (
              <button
                type="button"
                key={`${currentStepId}-choice-${index}`}
                onClick={() => setSelectedChoice(index)}
                className={`w-full rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                  isSelected
                    ? 'border-sky-400 bg-sky-50 shadow-md'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="text-sm font-semibold text-slate-900">{choice.text}</div>
              </button>
            );
          })}
        </div>
      </article>

      <div
        className={`rounded-lg border border-slate-200 bg-white p-3 transition-all duration-300 ${feedback ? 'opacity-100' : 'opacity-0'}`}
        style={{ maxHeight: feedback ? 300 : 0, overflow: feedback ? 'visible' : 'hidden' }}
      >
        <p className="text-sm text-slate-700">{feedback}</p>
        {selectedChoice != null && selectedChoiceText ? <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">Selected: {selectedChoiceText}</p> : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={submitChoice}
          disabled={selectedChoice == null || submitting}
          className={`inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
            selectedChoice == null || submitting ? 'cursor-not-allowed bg-slate-300' : 'bg-slate-900 hover:bg-black'
          }`}
        >
          {submitting ? 'Submitting…' : 'Continue'}
        </button>

        <button
          type="button"
          onClick={() => setSelectedChoice(null)}
          className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
        >
          Clear Choice
        </button>
      </div>
    </section>
  );
}
