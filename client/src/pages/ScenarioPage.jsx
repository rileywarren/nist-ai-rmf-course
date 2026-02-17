import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import ScenarioEngine from '../components/ScenarioEngine';
import { useCourseModules } from '../hooks/useCourse';
import { useProgress } from '../hooks/useProgress';
import { getScenario } from '../utils/api';

function getModuleId(module, index) {
  if (typeof module?.id === 'string' && module.id.trim()) return module.id;
  if (module?.moduleNumber) return `module-${module.moduleNumber}`;
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

export default function ScenarioPage() {
  const { moduleId } = useParams();
  const safeModuleId = typeof moduleId === 'string' && moduleId.trim() ? moduleId : '';

  const { modules: rawModules, loading } = useCourseModules();
  const { refresh } = useProgress();
  const [scenario, setScenario] = useState(null);
  const [scenarioError, setScenarioError] = useState('');
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioDone, setScenarioDone] = useState(null);

  const modules = useMemo(() => {
    const safe = Array.isArray(rawModules) ? rawModules : [];
    return safe.map((module, index) => ({
      ...module,
      id: getModuleId(module, index),
      number: getModuleNumber(module, index),
      title: getModuleTitle(module, index),
    }));
  }, [rawModules]);

  const currentModule = useMemo(() => modules.find((entry) => entry.id === safeModuleId), [modules, safeModuleId]);
  const moduleIndex = useMemo(() => modules.findIndex((entry) => entry.id === safeModuleId), [modules, safeModuleId]);
  const scenarioId = resolveModuleResourceValue(currentModule?.scenarioId) || resolveModuleResourceValue(currentModule?.scenario);

  const moduleTitle = currentModule?.title || `Module ${Math.max(moduleIndex + 1, 1)}`;

  useEffect(() => {
    let active = true;

    if (!scenarioId) {
      setScenario(null);
      setScenarioError('No scenario is attached to this module yet.');
      setScenarioLoading(false);
      return () => {
        active = false;
      };
    }

    setScenarioError('');
    setScenarioLoading(true);

    getScenario(scenarioId)
      .then((data) => {
        if (!active) return;
        setScenario(data);
      })
      .catch((error) => {
        if (!active) return;
        setScenarioError(error?.message || 'Failed to load scenario');
        setScenario(null);
      })
      .finally(() => {
        if (active) setScenarioLoading(false);
      });

    return () => {
      active = false;
    };
  }, [scenarioId]);

  const isLoading = loading || scenarioLoading;

  if (!safeModuleId) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-6">
        <p className="text-sm font-semibold text-amber-900">Invalid module identifier.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-32 animate-pulse rounded bg-slate-200" />
        </div>
      </section>
    );
  }

  if (scenarioError || !scenario) {
    return (
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-rose-700">{scenarioError || 'Scenario not available yet.'}</p>
        <Link
          to={`/module/${safeModuleId}`}
          className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to Module
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{moduleTitle} Scenario</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{scenario.title || 'Interactive Scenario'}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Make choices one step at a time. Each decision affects the final outcome and score.
        </p>
      </header>

      <ScenarioEngine
        scenario={scenario}
        onComplete={(result) => {
          setScenarioDone(result);
          refresh();
        }}
      />

      {scenarioDone ? (
        <section className="rounded-2xl border border-slate-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">Scenario outcome recorded.</p>
          <p className="mt-2 text-sm text-emerald-700">
            You earned {scenarioDone.totalPoints} of {scenarioDone.maxPoints} points and received a {scenarioDone.grade} rating.
          </p>
          <Link
            to={`/module/${safeModuleId}`}
            className="mt-3 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Return to Module
          </Link>
        </section>
      ) : null}
    </div>
  );
}
