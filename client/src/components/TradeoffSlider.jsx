import { useMemo, useState } from 'react';

function parseRule(rule, values) {
  const when = `${rule?.when || ''}`.trim();

  const match = when.match(/^(\w+)\s*(>=|<=|>|<|==)\s*(\d+)$/);
  if (!match) return false;

  const field = match[1];
  const operator = match[2];
  const threshold = Number(match[3]);

  const current = Number(values[field]);
  if (!Number.isFinite(current) || !Number.isFinite(threshold)) return false;

  if (operator === '>=') return current >= threshold;
  if (operator === '<=') return current <= threshold;
  if (operator === '>') return current > threshold;
  if (operator === '<') return current < threshold;
  return current === threshold;
}

function clamp(value) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  return clamped;
}

function clampAccuracy(value) {
  return Math.max(20, clamp(value));
}

function trackColor(value) {
  if (value >= 70) return 'from-emerald-300 to-emerald-200';
  if (value >= 40) return 'from-amber-300 to-amber-200';
  return 'from-rose-300 to-rose-200';
}

export default function TradeoffSlider({ sliders = [], tradeoffRules = [], instruction = '' }) {
  const safeSliders = Array.isArray(sliders)
    ? sliders
        .filter((slider) => slider && slider.id)
        .map((slider) => ({
          id: slider.id,
          label: slider.label || slider.id,
          value: Number(slider.default) || 50,
        }))
    : [];

  const defaults = useMemo(
    () => Object.fromEntries(safeSliders.map((slider) => [slider.id, clamp(slider.value)])),
    [safeSliders],
  );

  const [values, setValues] = useState(defaults);
  const [activeRules, setActiveRules] = useState([]);

  const allRulesTriggered = useMemo(() => {
    const matches = tradeoffRules
      .filter((rule) => parseRule(rule, values))
      .map((rule) => rule?.explanation || 'Tradeoff rule active.');
    return matches;
  }, [tradeoffRules, values]);

  const contextMessage = useMemo(() => {
    const p = values.privacy ?? 50;
    const a = values.accuracy ?? 50;
    const i = values.interpretability ?? 50;

    if (p > 75 && a < 55) {
      return 'High privacy settings reduce available model signal; review data strategies and feature depth. Consider risk-aligned sampling.';
    }
    if (a > 80 && i > 80) {
      return 'Strong accuracy and interpretability imply more transparent, auditable models. Watch complexity drift in deployment.';
    }
    if (i < 40 && p > 60) {
      return 'Lower interpretability can reduce explainability confidence. Add clear rationale fields and validation artifacts.';
    }

    return 'A balanced profile supports practical AI governance outcomes with manageable tradeoffs.';
  }, [values]);

  const handleInput = (id, value) => {
    setValues((prev) => {
      const next = { ...prev };
      const numeric = clamp(value);
      next[id] = numeric;

      if (id === 'privacy' && numeric > 75) {
        const reduction = Math.round((numeric - 75) * 0.4);
        next.accuracy = clampAccuracy((prev.accuracy ?? 50) - reduction);
      }
      if (id === 'accuracy' && numeric > 80) {
        const reduction = Math.round((numeric - 80) * 0.2);
        next.privacy = clamp((prev.privacy ?? 50) - reduction);
      }
      if (id === 'interpretability' && numeric > 80) {
        next.accuracy = clamp((prev.accuracy ?? 50) + 5);
      }
      return next;
    });

    const rules = tradeoffRules.filter((rule) => parseRule(rule, { ...values, [id]: Number(value) }));
    setActiveRules(rules.map((rule) => `${rule?.explanation || 'Tradeoff relationship in effect.'}`));
  };

  const reset = () => {
    setValues(defaults);
    setActiveRules([]);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Tradeoff Explorer</h2>
      <p className="text-sm text-slate-600">{instruction || 'Adjust sliders and observe how design choices influence the framework trade space.'}</p>

      {safeSliders.map((slider) => {
        const value = values[slider.id] || 50;
        return (
          <label key={slider.id} className="block space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-800">{slider.label}</span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{value}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={value}
              onChange={(event) => handleInput(slider.id, event.target.value)}
              className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r ${trackColor(value)}`}
            />
          </label>
        );
      })}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Explanation</p>
        <p className="mt-2 text-sm text-slate-700">{contextMessage}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Active Tradeoff Notes</p>
        {activeRules.length === 0 && allRulesTriggered.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No special tradeoff rule triggered yet.</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {[...new Set([...activeRules, ...allRulesTriggered])].map((ruleText) => (
              <li key={ruleText}>{ruleText}</li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={reset}
        className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        Reset to Default
      </button>
    </section>
  );
}
