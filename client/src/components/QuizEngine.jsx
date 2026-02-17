import { useEffect, useMemo, useState } from 'react';

function normalizeQuestionId(question, index) {
  if (question && typeof question.id === 'string' && question.id.trim()) return question.id;
  return `question-${index + 1}`;
}

function hasSelection(question, answer) {
  if (!question || !Number.isFinite(answer)) {
    if (Array.isArray(answer)) return answer.length > 0;
    if (typeof answer === 'boolean') return true;
  }

  if (typeof answer === 'number') return answer >= 0;

  return false;
}

function formatChoice(value) {
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (Array.isArray(value)) return value.sort((a, b) => a - b).join(', ');
  return typeof value === 'number' ? `${value}` : String(value ?? '—');
}

function getLocalCorrectness(question, answer) {
  if (!question || !('type' in question)) return null;
  if (question.type === 'multiple_choice') {
    return typeof answer === 'number' && question.correctIndex === answer;
  }

  if (question.type === 'true_false') {
    return typeof answer === 'boolean' && answer === question.correctAnswer;
  }

  if (question.type === 'multi_select') {
    if (!Array.isArray(answer) || !Array.isArray(question.correctIndices)) return null;
    const a = [...answer].sort((x, y) => x - y);
    const b = [...question.correctIndices].sort((x, y) => x - y);
    return a.length === b.length && a.every((value, index) => value === b[index]);
  }

  return null;
}

export default function QuizEngine({ quiz, onSubmit, onComplete }) {
  const title = quiz?.title || 'Quiz';
  const passingScore = typeof quiz?.passingScore === 'number' ? quiz.passingScore : 70;
  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(new Set());
  const [results, setResults] = useState(null);
  const [gradingError, setGradingError] = useState('');
  const [submittingAll, setSubmittingAll] = useState(false);

  const normalizedQuestions = useMemo(
    () =>
      questions.map((question, index) => ({
        ...question,
        id: normalizeQuestionId(question, index),
      })),
    [questions],
  );

  const totalQuestions = normalizedQuestions.length;
  const hasQuestions = totalQuestions > 0;
  const currentQuestion = hasQuestions ? normalizedQuestions[currentIndex] : null;
  const currentQuestionId = currentQuestion?.id;

  const questionResultsById = useMemo(() => {
    const map = new Map();
    if (Array.isArray(results?.results)) {
      for (const item of results.results) {
        if (item && item.questionId != null) {
          map.set(item.questionId, item);
        }
      }
    }
    return map;
  }, [results]);

  const safeSubmitted = submitted;
  const isSubmitted = safeSubmitted.has(currentQuestionId);
  const selectedAnswer = currentQuestionId ? answers[currentQuestionId] : undefined;
  const canSubmit = hasSelection(currentQuestion, selectedAnswer);
  const allSubmitted = safeSubmitted.size >= totalQuestions;
  const hasPassed = results ? results.passed : false;
  const quizScore = results?.score ?? 0;

  const questionResult = currentQuestionId ? questionResultsById.get(currentQuestionId) : null;
  const resolvedCorrectness = currentQuestion
    ? questionResult
      ? typeof questionResult.correct === 'boolean'
        ? questionResult.correct
        : getLocalCorrectness(currentQuestion, answers[currentQuestionId])
      : getLocalCorrectness(currentQuestion, answers[currentQuestionId])
    : null;

  const questionResultExplanation =
    questionResult?.explanation || currentQuestion?.explanation || 'This question has no explanation available yet.';

  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setSubmitted(new Set());
    setResults(null);
    setGradingError('');
    setSubmittingAll(false);
  }, [quiz?.id, totalQuestions, title]);

  const setAnswer = (value) => {
    if (!currentQuestionId || isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [currentQuestionId]: value }));
  };

  const handleMultiSelectToggle = (index) => {
    if (isSubmitted || !currentQuestionId) return;
    setAnswers((prev) => {
      const current = new Set(Array.isArray(prev[currentQuestionId]) ? prev[currentQuestionId] : []);
      if (current.has(index)) current.delete(index);
      else current.add(index);
      return {
        ...prev,
        [currentQuestionId]: Array.from(current).sort((a, b) => a - b),
      };
    });
  };

  const submitCurrentQuestion = () => {
    if (!currentQuestionId || !canSubmit || isSubmitted) return;
    setSubmitted((prev) => {
      const next = new Set(prev);
      next.add(currentQuestionId);
      return next;
    });
  };

  const nextQuestion = () => {
    if (!hasQuestions) return;
    if (currentIndex < totalQuestions - 1) setCurrentIndex((prev) => prev + 1);
  };

  const submitAll = async () => {
    if (!onSubmit || submittingAll) return;
    setSubmittingAll(true);
    setGradingError('');
    try {
      const grading = await onSubmit(answers);
      setResults(grading);
    } catch (error) {
      setGradingError(error?.message || 'Unable to grade quiz right now. Please try again.');
    } finally {
      setSubmittingAll(false);
    }
  };

  const resetQuiz = () => {
    setCurrentIndex(0);
    setAnswers({});
    setSubmitted(new Set());
    setResults(null);
    setGradingError('');
  };

  const onFinish = () => {
    if (onComplete && results) {
      onComplete(results);
    }
  };

  if (!hasQuestions) {
    return (
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-lg font-semibold text-slate-900">No quiz questions available.</p>
        <p className="text-sm text-slate-600">
          This quiz is still being prepared. Please check back after the course content is fully loaded.
        </p>
      </section>
    );
  }

  if (results) {
    return (
      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <style>
          {`
            @keyframes d2-fade-in {
              from { opacity: 0; transform: translateY(6px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>
        <div className="rounded-2xl bg-slate-900 p-6 text-center text-white">
          <p className="text-sm uppercase tracking-wider text-slate-300">Final Score</p>
          <p className="mt-2 text-5xl font-extrabold text-white">{quizScore}%</p>
          <p className="mt-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            {hasPassed ? 'Passed' : 'Not Passed'}
          </p>
          <p className="mt-2 text-sm text-slate-200">
            Passing target: {passingScore}%
          </p>
        </div>

        {!hasPassed && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            You can review your answers above and retry whenever you’re ready.
          </p>
        )}

        {results.badgeEarned && (
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
            🎉 Badge earned: <span className="font-semibold">{results.badgeEarned.name || results.badgeEarned.id}</span>. Great job building trustworthy AI judgment!
          </p>
        )}

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">Question Review</h3>
          {normalizedQuestions.map((question, index) => {
            const result = questionResultsById.get(question.id);
            const isCorrect = result ? result.correct : getLocalCorrectness(question, answers[question.id]);
            const userAnswer = answers[question.id];

            return (
              <article
                key={question.id}
                className="rounded-lg border border-slate-200 p-4 animate-[d2-fade-in_0.3s_ease]"
              >
                <div className="flex items-start justify-between gap-4">
                  <h4 className="text-sm font-semibold text-slate-900">
                    {index + 1}. {question.question}
                  </h4>
                  <span
                    className={`ml-4 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                  Your answer: {formatChoice(userAnswer)}
                </p>
                {result && (
                  <p className="mt-2 text-xs text-slate-700">
                    Correct answer: {formatChoice(result.correctAnswer)}
                  </p>
                )}
                {result?.explanation && <p className="mt-2 text-sm text-slate-700">{result.explanation}</p>}
              </article>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3">
          {!hasPassed && (
            <button
              type="button"
              onClick={resetQuiz}
              className="inline-flex rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              Retry Quiz
            </button>
          )}
          {hasPassed && (
            <button
              type="button"
              onClick={onFinish}
              className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Continue to Next Module
            </button>
          )}
          {!hasPassed && (
            <button
              type="button"
              onClick={resetQuiz}
              className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Try again later
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-sky-600 transition-all duration-300"
            style={{ width: `${((safeSubmitted.size / totalQuestions) * 100).toFixed(0)}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-700">
          Question {safeSubmitted.has(currentQuestionId) ? currentIndex + 1 : currentIndex + 1} of {totalQuestions}
        </p>
      </header>

      <article className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-slate-900">
          {currentIndex + 1}. {currentQuestion?.question}
        </h2>

        {currentQuestion?.type === 'multiple_choice' && (
          <div className="space-y-2">
            {currentQuestion.options?.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = currentQuestion.correctIndex === index;
              const isLocked = isSubmitted;
              const showCorrect = isSubmitted && resolvedCorrectness !== null;

              const optionClass =
                !isSubmitted || !showCorrect
                  ? 'border-slate-200 bg-white text-slate-900 hover:bg-slate-100'
                  : isCorrect
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : isSelected
                      ? 'border-rose-500 bg-rose-50 text-rose-900'
                      : 'border-slate-200 bg-white text-slate-700';

              return (
                <label
                  key={`${currentQuestion.id}-option-${index}`}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${optionClass}`}
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    checked={isSelected}
                    onChange={() => setAnswer(index)}
                    disabled={isLocked}
                    className="mt-1"
                  />
                  <span className="text-sm leading-6">{option}</span>
                </label>
              );
            })}
          </div>
        )}

        {currentQuestion?.type === 'true_false' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAnswer(true)}
              disabled={isSubmitted}
              className={`rounded-xl border-2 px-4 py-5 text-base font-semibold ${
                isSubmitted && resolvedCorrectness !== null
                  ? currentQuestion.correctAnswer === true
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : selectedAnswer === true
                      ? 'border-rose-400 bg-rose-50 text-rose-900'
                      : 'border-slate-200 bg-white text-slate-700'
                  : selectedAnswer === true
                    ? 'border-sky-300 bg-sky-50 text-sky-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              True
            </button>
            <button
              type="button"
              onClick={() => setAnswer(false)}
              disabled={isSubmitted}
              className={`rounded-xl border-2 px-4 py-5 text-base font-semibold ${
                isSubmitted && resolvedCorrectness !== null
                  ? currentQuestion.correctAnswer === false
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : selectedAnswer === false
                      ? 'border-rose-400 bg-rose-50 text-rose-900'
                      : 'border-slate-200 bg-white text-slate-700'
                  : selectedAnswer === false
                    ? 'border-sky-300 bg-sky-50 text-sky-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              False
            </button>
          </div>
        )}

        {currentQuestion?.type === 'multi_select' && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Select all that apply.</p>
            {currentQuestion.options?.map((option, index) => {
              const selectedValues = Array.isArray(selectedAnswer) ? selectedAnswer : [];
              const isChecked = selectedValues.includes(index);
              const correctValues = Array.isArray(currentQuestion.correctIndices) ? currentQuestion.correctIndices : [];
              const isCorrect = correctValues.includes(index);
              const showCorrect = isSubmitted && resolvedCorrectness !== null;

              const optionClass =
                !isSubmitted || !showCorrect
                  ? isChecked
                    ? 'border-sky-300 bg-sky-50 text-sky-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  : isCorrect
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : isChecked
                      ? 'border-rose-400 bg-rose-50 text-rose-900'
                      : 'border-slate-200 bg-white text-slate-700';

              return (
                <label
                  key={`${currentQuestion.id}-ms-${index}`}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${optionClass}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleMultiSelectToggle(index)}
                    disabled={isSubmitted}
                    className="mt-1"
                  />
                  <span className="text-sm leading-6">{option}</span>
                </label>
              );
            })}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm text-slate-700">
            {isSubmitted ? questionResultExplanation : "Submit to check your answer for this question."}
          </p>
        </div>
      </article>

      <div className="flex flex-wrap gap-3">
        {!isSubmitted && (
          <button
            type="button"
            onClick={submitCurrentQuestion}
            disabled={!canSubmit}
            className={`inline-flex rounded-lg px-5 py-2 text-sm font-semibold text-white transition ${
              canSubmit ? 'bg-sky-600 hover:bg-sky-700' : 'cursor-not-allowed bg-slate-300'
            }`}
          >
            Submit Answer
          </button>
        )}

        {isSubmitted && currentIndex < totalQuestions - 1 && (
          <button
            type="button"
            onClick={nextQuestion}
            className="inline-flex rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Next Question
          </button>
        )}

        {isSubmitted && currentIndex === totalQuestions - 1 && (
          <button
            type="button"
            onClick={submitAll}
            disabled={submittingAll}
            className={`inline-flex rounded-lg px-5 py-2 text-sm font-semibold text-white transition ${
              submittingAll ? 'cursor-wait bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {submittingAll ? 'Grading…' : 'See Results'}
          </button>
        )}
      </div>

      {allSubmitted && !isSubmitted && currentIndex < totalQuestions - 1 && (
        <p className="text-xs text-slate-500">A few questions are still unlocked? Make sure to submit each answer.</p>
      )}

      {gradingError && <p className="text-sm text-rose-700">{gradingError}</p>}
    </section>
  );
}
